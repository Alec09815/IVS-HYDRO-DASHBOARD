"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/contexts/toast-context";
import Link from "next/link";
import {
  ArrowLeft, Users, Cloud, Thermometer, Clock, Shield,
  AlertCircle, Save, Trash2, Plus, X, Wrench,
} from "lucide-react";

interface CrewMember { name: string; role: string }
interface EquipmentItem { name: string; asset_number: string }
interface Visitor { name: string; company: string; time: string }

interface ManUpDetail {
  id: string;
  report_date: string;
  weather_conditions: string | null;
  temperature_f: number | null;
  start_time: string | null;
  end_time: string | null;
  safety_topic: string | null;
  crew_members: CrewMember[];
  equipment_on_site: EquipmentItem[];
  visitor_log: Visitor[];
  notes: string | null;
  created_at: string;
  job_card: { id: string; job_number: string; project_name: string; client_name: string } | null;
  prepared_by_employee: { first_name: string; last_name: string } | null;
}

export default function ManUpDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [report, setReport] = useState<ManUpDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [form, setForm] = useState<Partial<ManUpDetail>>({});
  const supabase = createClient();

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("man_up_reports")
      .select(`
        id, report_date, weather_conditions, temperature_f, start_time, end_time,
        safety_topic, crew_members, equipment_on_site, visitor_log, notes, created_at,
        job_card:job_cards!job_card_id (id, job_number, project_name, client_name),
        prepared_by_employee:employees!prepared_by (first_name, last_name)
      `)
      .eq("id", id)
      .single();

    if (data) {
      const r = data as unknown as ManUpDetail;
      r.crew_members = r.crew_members ?? [];
      r.equipment_on_site = r.equipment_on_site ?? [];
      r.visitor_log = r.visitor_log ?? [];
      setReport(r);
      setForm(r);
    }
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    const { error } = await supabase.from("man_up_reports").update({
      weather_conditions: form.weather_conditions || null,
      temperature_f: form.temperature_f || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      safety_topic: form.safety_topic || null,
      crew_members: form.crew_members || [],
      equipment_on_site: form.equipment_on_site || [],
      visitor_log: form.visitor_log || [],
      notes: form.notes || null,
    }).eq("id", report.id);
    setSaving(false);
    if (error) { showError(error.message); return; }
    setReport({ ...report, ...form } as ManUpDetail);
    setEditing(false);
    success("Man-up report updated");
  };

  const handleDelete = async () => {
    if (!report) return;
    await supabase.from("man_up_reports").delete().eq("id", report.id);
    success("Report deleted");
    router.push("/dashboard/jobs/man-up");
  };

  const addCrew = () => setForm({ ...form, crew_members: [...(form.crew_members || []), { name: "", role: "" }] });
  const removeCrew = (i: number) => setForm({ ...form, crew_members: (form.crew_members || []).filter((_, idx) => idx !== i) });
  const updateCrew = (i: number, field: keyof CrewMember, value: string) => {
    const updated = [...(form.crew_members || [])];
    updated[i] = { ...updated[i], [field]: value };
    setForm({ ...form, crew_members: updated });
  };

  const addEquipment = () => setForm({ ...form, equipment_on_site: [...(form.equipment_on_site || []), { name: "", asset_number: "" }] });
  const removeEquipment = (i: number) => setForm({ ...form, equipment_on_site: (form.equipment_on_site || []).filter((_, idx) => idx !== i) });
  const updateEquipment = (i: number, field: keyof EquipmentItem, value: string) => {
    const updated = [...(form.equipment_on_site || [])];
    updated[i] = { ...updated[i], [field]: value };
    setForm({ ...form, equipment_on_site: updated });
  };

  const addVisitor = () => setForm({ ...form, visitor_log: [...(form.visitor_log || []), { name: "", company: "", time: "" }] });
  const removeVisitor = (i: number) => setForm({ ...form, visitor_log: (form.visitor_log || []).filter((_, idx) => idx !== i) });
  const updateVisitor = (i: number, field: keyof Visitor, value: string) => {
    const updated = [...(form.visitor_log || [])];
    updated[i] = { ...updated[i], [field]: value };
    setForm({ ...form, visitor_log: updated });
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" /></div>;

  if (!report) return (
    <div className="text-center py-20">
      <AlertCircle className="mx-auto mb-3 text-ivs-danger" size={32} />
      <p className="text-ivs-text">Report not found</p>
      <Link href="/dashboard/jobs/man-up" className="text-sm text-ivs-accent hover:underline mt-2 inline-block">Back to Man-Up Reports</Link>
    </div>
  );

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const smallInput = "px-2 py-1.5 bg-ivs-bg border border-ivs-border rounded text-ivs-text text-xs focus:outline-none focus:ring-1 focus:ring-ivs-accent";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/jobs/man-up" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ivs-text">Man-Up Report</h1>
            <p className="text-ivs-text-muted mt-1">
              {report.job_card?.job_number} &mdash; {new Date(report.report_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="px-4 py-2 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors">
            Edit
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard icon={<Users size={16} />} label="Crew" value={`${(report.crew_members || []).length} members`} />
        <InfoCard icon={<Wrench size={16} />} label="Equipment" value={`${(report.equipment_on_site || []).length} pieces`} />
        <InfoCard icon={<Cloud size={16} />} label="Weather" value={report.weather_conditions || "—"} />
        <InfoCard icon={<Thermometer size={16} />} label="Temp" value={report.temperature_f ? `${report.temperature_f}°F` : "—"} />
      </div>

      {editing ? (
        <>
          {/* Weather & Time */}
          <Section title="Conditions">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className="block text-xs text-ivs-text-muted mb-1">Weather</label><input type="text" value={form.weather_conditions || ""} onChange={(e) => setForm({ ...form, weather_conditions: e.target.value })} placeholder="Clear, Rain..." className={inputCls} /></div>
              <div><label className="block text-xs text-ivs-text-muted mb-1">Temperature (°F)</label><input type="number" value={form.temperature_f ?? ""} onChange={(e) => setForm({ ...form, temperature_f: e.target.value ? parseInt(e.target.value) : null })} className={inputCls} /></div>
              <div><label className="block text-xs text-ivs-text-muted mb-1">Start Time</label><input type="time" value={form.start_time || ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className={inputCls} /></div>
              <div><label className="block text-xs text-ivs-text-muted mb-1">End Time</label><input type="time" value={form.end_time || ""} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className={inputCls} /></div>
            </div>
          </Section>

          {/* Safety Topic */}
          <Section title="Safety Topic">
            <input type="text" value={form.safety_topic || ""} onChange={(e) => setForm({ ...form, safety_topic: e.target.value })} placeholder="Today's safety discussion topic..." className={inputCls} />
          </Section>

          {/* Crew */}
          <Section title="Crew Members">
            <div className="space-y-2">
              {(form.crew_members || []).map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={c.name} onChange={(e) => updateCrew(i, "name", e.target.value)} placeholder="Name" className={`flex-1 ${smallInput}`} />
                  <input type="text" value={c.role} onChange={(e) => updateCrew(i, "role", e.target.value)} placeholder="Role" className={`w-40 ${smallInput}`} />
                  <button onClick={() => removeCrew(i)} className="p-1 text-ivs-text-muted hover:text-ivs-danger"><X size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={addCrew} className="mt-2 flex items-center gap-1 text-xs text-ivs-accent hover:text-ivs-accent-hover"><Plus size={14} /> Add Crew</button>
          </Section>

          {/* Equipment */}
          <Section title="Equipment On Site">
            <div className="space-y-2">
              {(form.equipment_on_site || []).map((eq, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={eq.name} onChange={(e) => updateEquipment(i, "name", e.target.value)} placeholder="Equipment name" className={`flex-1 ${smallInput}`} />
                  <input type="text" value={eq.asset_number} onChange={(e) => updateEquipment(i, "asset_number", e.target.value)} placeholder="Asset #" className={`w-32 ${smallInput}`} />
                  <button onClick={() => removeEquipment(i)} className="p-1 text-ivs-text-muted hover:text-ivs-danger"><X size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={addEquipment} className="mt-2 flex items-center gap-1 text-xs text-ivs-accent hover:text-ivs-accent-hover"><Plus size={14} /> Add Equipment</button>
          </Section>

          {/* Visitors */}
          <Section title="Visitor Log">
            <div className="space-y-2">
              {(form.visitor_log || []).map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={v.name} onChange={(e) => updateVisitor(i, "name", e.target.value)} placeholder="Name" className={`flex-1 ${smallInput}`} />
                  <input type="text" value={v.company} onChange={(e) => updateVisitor(i, "company", e.target.value)} placeholder="Company" className={`w-32 ${smallInput}`} />
                  <input type="time" value={v.time} onChange={(e) => updateVisitor(i, "time", e.target.value)} className={`w-28 ${smallInput}`} />
                  <button onClick={() => removeVisitor(i)} className="p-1 text-ivs-text-muted hover:text-ivs-danger"><X size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={addVisitor} className="mt-2 flex items-center gap-1 text-xs text-ivs-accent hover:text-ivs-accent-hover"><Plus size={14} /> Add Visitor</button>
          </Section>

          {/* Notes */}
          <Section title="Notes">
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputCls} />
          </Section>

          <div className="flex items-center justify-between pt-2 pb-8">
            <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"><Trash2 size={16} /> Delete</button>
            <div className="flex items-center gap-3">
              <button onClick={() => { setEditing(false); setForm(report); }} className="px-4 py-2 text-sm text-ivs-text-muted hover:text-ivs-text">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Read-only sections */}
          {(report.start_time || report.weather_conditions) && (
            <Section title="Conditions">
              <div className="flex flex-wrap gap-6 text-sm">
                {report.start_time && <div><p className="text-xs text-ivs-text-muted">Hours</p><p className="text-ivs-text flex items-center gap-1"><Clock size={14} /> {report.start_time} — {report.end_time || "?"}</p></div>}
                {report.weather_conditions && <div><p className="text-xs text-ivs-text-muted">Weather</p><p className="text-ivs-text flex items-center gap-1"><Cloud size={14} /> {report.weather_conditions}</p></div>}
                {report.temperature_f && <div><p className="text-xs text-ivs-text-muted">Temperature</p><p className="text-ivs-text">{report.temperature_f}°F</p></div>}
              </div>
            </Section>
          )}

          {report.safety_topic && (
            <Section title="Safety Topic">
              <p className="text-sm text-ivs-text flex items-center gap-2"><Shield size={16} className="text-ivs-accent" /> {report.safety_topic}</p>
            </Section>
          )}

          {report.crew_members.length > 0 && (
            <Section title="Crew Members">
              <div className="flex flex-wrap gap-2">
                {report.crew_members.map((c, i) => (
                  <div key={i} className="px-3 py-2 bg-ivs-bg rounded-lg border border-ivs-border">
                    <p className="text-sm text-ivs-text">{c.name}</p>
                    <p className="text-xs text-ivs-text-muted">{c.role}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {report.equipment_on_site.length > 0 && (
            <Section title="Equipment On Site">
              <div className="flex flex-wrap gap-2">
                {report.equipment_on_site.map((eq, i) => (
                  <div key={i} className="px-3 py-2 bg-ivs-bg rounded-lg border border-ivs-border">
                    <p className="text-sm text-ivs-text">{eq.name}</p>
                    <p className="text-xs text-ivs-text-muted font-mono">{eq.asset_number}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {report.visitor_log.length > 0 && (
            <Section title="Visitor Log">
              <div className="space-y-2">
                {report.visitor_log.map((v, i) => (
                  <div key={i} className="flex items-center justify-between bg-ivs-bg rounded-lg border border-ivs-border p-3">
                    <div><p className="text-sm text-ivs-text">{v.name}</p><p className="text-xs text-ivs-text-muted">{v.company}</p></div>
                    {v.time && <span className="text-xs text-ivs-text-muted">{v.time}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {report.notes && (
            <Section title="Notes">
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{report.notes}</p>
            </Section>
          )}

          <Section title="Report Info">
            <div className="flex flex-wrap gap-6 text-sm">
              <div><p className="text-xs text-ivs-text-muted">Prepared By</p><p className="text-ivs-text">{report.prepared_by_employee?.first_name} {report.prepared_by_employee?.last_name}</p></div>
              <div><p className="text-xs text-ivs-text-muted">Job</p><Link href={`/dashboard/jobs/${report.job_card?.id}`} className="text-ivs-accent hover:underline font-mono">{report.job_card?.job_number}</Link></div>
              <div><p className="text-xs text-ivs-text-muted">Created</p><p className="text-ivs-text">{new Date(report.created_at).toLocaleDateString()}</p></div>
            </div>
          </Section>

          <div className="flex items-center pt-2 pb-8">
            <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"><Trash2 size={16} /> Delete Report</button>
          </div>
        </>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-ivs-text mb-2">Delete Report?</h2>
            <p className="text-sm text-ivs-text-muted mb-6">This will permanently delete this man-up report. This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm text-ivs-text-muted hover:text-ivs-text">Cancel</button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-ivs-text mb-4">{title}</h3>
      {children}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-ivs-text-muted mb-1">{icon}<span className="text-xs font-medium uppercase tracking-wide">{label}</span></div>
      <p className="text-sm font-semibold text-ivs-text">{value}</p>
    </div>
  );
}
