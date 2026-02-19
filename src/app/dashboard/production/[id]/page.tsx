"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/contexts/toast-context";
import Link from "next/link";
import {
  ArrowLeft, BarChart3, Calendar, Clock, Droplets,
  MapPin, FileText, AlertCircle, Trash2, User,
  Pencil, Save,
} from "lucide-react";

const UNITS = ["sq ft", "cu ft", "cu yd", "linear ft", "sq yd", "each"];
const DOWNTIME_REASONS = [
  "Weather", "Equipment Breakdown", "Material Delay", "Safety Stand-Down",
  "Waiting on Inspector", "Water Supply", "Electrical Issue", "Other",
];

interface ProductionDetail {
  id: string;
  form_date: string;
  area_location: string | null;
  quantity_completed: number | null;
  unit: string | null;
  pump_hours: number | null;
  downtime_hours: number | null;
  downtime_reason: string | null;
  water_usage_gallons: number | null;
  concrete_removed_cuft: number | null;
  notes: string | null;
  submitted: boolean;
  submitted_at: string | null;
  created_at: string;
  job_card: { id: string; job_number: string; project_name: string; client_name: string } | null;
  operator: { first_name: string; last_name: string } | null;
  cost_code: { code: string; description: string } | null;
}

export default function ProductionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [record, setRecord] = useState<ProductionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [form, setForm] = useState<Partial<ProductionDetail>>({});
  const supabase = createClient();

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("production_forms")
      .select(`
        id, form_date, area_location, quantity_completed, unit,
        pump_hours, downtime_hours, downtime_reason,
        water_usage_gallons, concrete_removed_cuft,
        notes, submitted, submitted_at, created_at,
        job_card:job_cards!job_card_id (id, job_number, project_name, client_name),
        operator:employees!operator_id (first_name, last_name),
        cost_code:cost_codes!cost_code_id (code, description)
      `)
      .eq("id", id)
      .single();

    if (data) {
      const r = data as unknown as ProductionDetail;
      setRecord(r);
      setForm(r);
    }
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);

  const update = <K extends keyof ProductionDetail>(key: K, value: ProductionDetail[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    const updates = {
      area_location: form.area_location || null,
      quantity_completed: form.quantity_completed || null,
      unit: form.unit || "sq ft",
      pump_hours: form.pump_hours || null,
      downtime_hours: form.downtime_hours || null,
      downtime_reason: form.downtime_reason || null,
      water_usage_gallons: form.water_usage_gallons || null,
      concrete_removed_cuft: form.concrete_removed_cuft || null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("production_forms").update(updates).eq("id", record.id);
    if (error) { showError(error.message); setSaving(false); return; }
    setRecord({ ...record, ...updates } as ProductionDetail);
    setEditing(false);
    setSaving(false);
    success("Production record updated");
  };

  const handleSubmit = async () => {
    if (!record) return;
    setSaving(true);
    const { error } = await supabase.from("production_forms").update({ submitted: true, submitted_at: new Date().toISOString() }).eq("id", record.id);
    if (error) { showError(error.message); setSaving(false); return; }
    setRecord({ ...record, submitted: true, submitted_at: new Date().toISOString() });
    setSaving(false);
    success("Record submitted");
  };

  const handleDelete = async () => {
    if (!record) return;
    await supabase.from("production_forms").delete().eq("id", record.id);
    success("Production record deleted");
    router.push("/dashboard/production");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto mb-3 text-ivs-danger" size={32} />
        <p className="text-ivs-text">Production record not found</p>
        <Link href="/dashboard/production" className="text-sm text-ivs-accent hover:underline mt-2 inline-block">
          Back to Production
        </Link>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/production" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ivs-text">Production Record</h1>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${record.submitted ? "bg-emerald-500/15 text-emerald-500" : "bg-gray-500/15 text-gray-400"}`}>
                {record.submitted ? "Submitted" : "Draft"}
              </span>
            </div>
            <p className="text-ivs-text-muted mt-1">
              {record.job_card?.job_number} &mdash; {new Date(record.form_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors">
              <Pencil size={14} /> Edit
            </button>
          )}
          {!record.submitted && !editing && (
            <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              Submit
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard icon={<BarChart3 size={16} />} label="Quantity" value={record.quantity_completed ? `${record.quantity_completed.toLocaleString()} ${record.unit || ""}` : "—"} />
        <InfoCard icon={<Clock size={16} />} label="Pump Hours" value={record.pump_hours ? `${record.pump_hours}h` : "—"} />
        <InfoCard icon={<Clock size={16} />} label="Downtime" value={record.downtime_hours ? `${record.downtime_hours}h` : "None"} warning={!!record.downtime_hours} />
        <InfoCard icon={<Droplets size={16} />} label="Water Usage" value={record.water_usage_gallons ? `${record.water_usage_gallons.toLocaleString()} gal` : "—"} />
      </div>

      {editing ? (
        /* ── Edit Form ── */
        <>
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Production Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Area / Location</label>
                <input type="text" value={form.area_location || ""} onChange={(e) => update("area_location", e.target.value)} placeholder="e.g., Span 3 North" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Quantity Completed</label>
                <input type="number" step="0.1" value={form.quantity_completed ?? ""} onChange={(e) => update("quantity_completed", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Unit</label>
                <select value={form.unit || "sq ft"} onChange={(e) => update("unit", e.target.value)} className={inputCls}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Hours & Downtime</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Pump Hours</label>
                <input type="number" step="0.1" value={form.pump_hours ?? ""} onChange={(e) => update("pump_hours", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Downtime Hours</label>
                <input type="number" step="0.1" value={form.downtime_hours ?? ""} onChange={(e) => update("downtime_hours", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
              </div>
              {(form.downtime_hours ?? 0) > 0 && (
                <div className="md:col-span-2">
                  <label className={labelCls}>Downtime Reason</label>
                  <select value={form.downtime_reason || ""} onChange={(e) => update("downtime_reason", e.target.value)} className={inputCls}>
                    <option value="">Select reason...</option>
                    {DOWNTIME_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Material Tracking</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Water Usage (gallons)</label>
                <input type="number" step="0.1" value={form.water_usage_gallons ?? ""} onChange={(e) => update("water_usage_gallons", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Concrete Removed (cu ft)</label>
                <input type="number" step="0.1" value={form.concrete_removed_cuft ?? ""} onChange={(e) => update("concrete_removed_cuft", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Notes</h3>
            <textarea value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} rows={3} placeholder="Work performed, conditions, issues..." className={inputCls} />
          </div>

          {/* Edit Actions */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors">
              <Trash2 size={16} /> Delete Record
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => { setEditing(false); setForm(record); }} className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ── Read-Only View ── */
        <>
          {/* Job & Operator */}
          <Section icon={<FileText size={18} />} title="Job & Operator">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {record.job_card && (
                <div>
                  <p className="text-ivs-text-muted text-xs">Job</p>
                  <Link href={`/dashboard/jobs/${record.job_card.id}`} className="text-ivs-accent hover:underline font-mono">
                    {record.job_card.job_number}
                  </Link>
                  <p className="text-xs text-ivs-text-muted mt-0.5">{record.job_card.project_name}</p>
                </div>
              )}
              {record.operator && (
                <div>
                  <p className="text-ivs-text-muted text-xs">Operator</p>
                  <p className="text-ivs-text">{record.operator.first_name} {record.operator.last_name}</p>
                </div>
              )}
              {record.cost_code && (
                <div>
                  <p className="text-ivs-text-muted text-xs">Cost Code</p>
                  <p className="text-ivs-text font-mono">{record.cost_code.code}</p>
                  <p className="text-xs text-ivs-text-muted">{record.cost_code.description}</p>
                </div>
              )}
            </div>
          </Section>

          {record.area_location && (
            <Section icon={<MapPin size={18} />} title="Area / Location">
              <p className="text-sm text-ivs-text">{record.area_location}</p>
            </Section>
          )}

          <Section icon={<BarChart3 size={18} />} title="Production Details">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-ivs-text-muted text-xs">Quantity Completed</p>
                <p className="text-ivs-text font-medium">{record.quantity_completed ?? "—"} {record.unit || ""}</p>
              </div>
              <div>
                <p className="text-ivs-text-muted text-xs">Pump Hours</p>
                <p className="text-ivs-text font-medium">{record.pump_hours ?? "—"}</p>
              </div>
              <div>
                <p className="text-ivs-text-muted text-xs">Downtime</p>
                <p className={`font-medium ${record.downtime_hours ? "text-ivs-warning" : "text-ivs-text"}`}>
                  {record.downtime_hours ? `${record.downtime_hours}h` : "None"}
                </p>
                {record.downtime_reason && <p className="text-xs text-ivs-text-muted">{record.downtime_reason}</p>}
              </div>
              <div>
                <p className="text-ivs-text-muted text-xs">Water Usage</p>
                <p className="text-ivs-text">{record.water_usage_gallons ? `${record.water_usage_gallons.toLocaleString()} gallons` : "—"}</p>
              </div>
              <div>
                <p className="text-ivs-text-muted text-xs">Concrete Removed</p>
                <p className="text-ivs-text">{record.concrete_removed_cuft ? `${record.concrete_removed_cuft} cu ft` : "—"}</p>
              </div>
            </div>
          </Section>

          {record.notes && (
            <Section icon={<FileText size={18} />} title="Notes">
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{record.notes}</p>
            </Section>
          )}

          <Section icon={<Calendar size={18} />} title="Record Info">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-xs text-ivs-text-muted">Created</p>
                <p className="text-ivs-text">{new Date(record.created_at).toLocaleDateString()}</p>
              </div>
              {record.submitted_at && (
                <div>
                  <p className="text-xs text-ivs-text-muted">Submitted</p>
                  <p className="text-ivs-text">{new Date(record.submitted_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Delete */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors">
              <Trash2 size={16} /> Delete Record
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-ivs-text mb-2">Delete Production Record?</h2>
            <p className="text-sm text-ivs-text-muted mb-6">
              This will permanently delete the production record for <strong className="text-ivs-text">{record.job_card?.job_number}</strong> on {new Date(record.form_date).toLocaleDateString()}. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-ivs-accent">{icon}</span>
        <h3 className="text-sm font-semibold text-ivs-text">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoCard({ icon, label, value, warning }: { icon: React.ReactNode; label: string; value: string; warning?: boolean }) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-ivs-text-muted mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-lg font-bold ${warning ? "text-ivs-warning" : "text-ivs-text"}`}>{value}</p>
    </div>
  );
}
