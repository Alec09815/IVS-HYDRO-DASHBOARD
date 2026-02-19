"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/contexts/toast-context";
import Link from "next/link";
import {
  ArrowLeft, ClipboardList, Calendar, Users, AlertTriangle,
  CloudRain, FileText, AlertCircle, Trash2, BarChart3,
  Pencil, Save,
} from "lucide-react";

interface WeeklyReportDetail {
  id: string;
  week_ending: string;
  summary: string | null;
  work_completed: string | null;
  planned_next_week: string | null;
  safety_incidents: number;
  safety_notes: string | null;
  weather_delays_hours: number | null;
  total_production_qty: number | null;
  production_unit: string | null;
  crew_count: number | null;
  issues: string | null;
  submitted: boolean;
  submitted_at: string | null;
  created_at: string;
  job_card: { id: string; job_number: string; project_name: string; client_name: string } | null;
  prepared_by_employee: { first_name: string; last_name: string } | null;
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [report, setReport] = useState<WeeklyReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [form, setForm] = useState<Partial<WeeklyReportDetail>>({});
  const supabase = createClient();

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("weekly_reports")
      .select(`
        id, week_ending, summary, work_completed, planned_next_week,
        safety_incidents, safety_notes, weather_delays_hours,
        total_production_qty, production_unit, crew_count, issues,
        submitted, submitted_at, created_at,
        job_card:job_cards!job_card_id (id, job_number, project_name, client_name),
        prepared_by_employee:employees!prepared_by (first_name, last_name)
      `)
      .eq("id", id)
      .single();

    if (data) {
      const r = data as unknown as WeeklyReportDetail;
      setReport(r);
      setForm(r);
    }
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const update = <K extends keyof WeeklyReportDetail>(key: K, value: WeeklyReportDetail[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    const updates = {
      summary: form.summary || null,
      work_completed: form.work_completed || null,
      planned_next_week: form.planned_next_week || null,
      safety_incidents: form.safety_incidents ?? 0,
      safety_notes: form.safety_notes || null,
      weather_delays_hours: form.weather_delays_hours || null,
      total_production_qty: form.total_production_qty || null,
      production_unit: form.production_unit || null,
      crew_count: form.crew_count || null,
      issues: form.issues || null,
    };
    const { error } = await supabase.from("weekly_reports").update(updates).eq("id", report.id);
    if (error) { showError(error.message); setSaving(false); return; }
    setReport({ ...report, ...updates } as WeeklyReportDetail);
    setEditing(false);
    setSaving(false);
    success("Report updated");
  };

  const handleSubmit = async () => {
    if (!report) return;
    setSaving(true);
    const { error } = await supabase.from("weekly_reports").update({ submitted: true, submitted_at: new Date().toISOString() }).eq("id", report.id);
    if (error) { showError(error.message); setSaving(false); return; }
    setReport({ ...report, submitted: true, submitted_at: new Date().toISOString() });
    setForm((prev) => ({ ...prev, submitted: true, submitted_at: new Date().toISOString() }));
    setSaving(false);
    success("Report submitted");
  };

  const handleDelete = async () => {
    if (!report) return;
    await supabase.from("weekly_reports").delete().eq("id", report.id);
    success("Report deleted");
    router.push("/dashboard/reports");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto mb-3 text-ivs-danger" size={32} />
        <p className="text-ivs-text">Report not found</p>
        <Link href="/dashboard/reports" className="text-sm text-ivs-accent hover:underline mt-2 inline-block">
          Back to Reports
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
          <Link href="/dashboard/reports" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ivs-text">Weekly Report</h1>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${report.submitted ? "bg-emerald-500/15 text-emerald-500" : "bg-gray-500/15 text-gray-400"}`}>
                {report.submitted ? "Submitted" : "Draft"}
              </span>
            </div>
            <p className="text-ivs-text-muted mt-1">
              {report.job_card?.job_number} &mdash; Week ending {new Date(report.week_ending).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors">
              <Pencil size={14} /> Edit
            </button>
          )}
          {!report.submitted && !editing && (
            <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              Submit
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard icon={<Users size={16} />} label="Crew Count" value={report.crew_count?.toString() || "—"} />
        <InfoCard icon={<BarChart3 size={16} />} label="Production" value={report.total_production_qty ? `${report.total_production_qty.toLocaleString()} ${report.production_unit || ""}` : "—"} />
        <InfoCard icon={<AlertTriangle size={16} />} label="Safety Incidents" value={report.safety_incidents.toString()} danger={report.safety_incidents > 0} />
        <InfoCard icon={<CloudRain size={16} />} label="Weather Delays" value={report.weather_delays_hours ? `${report.weather_delays_hours}h` : "None"} />
      </div>

      {editing ? (
        /* ── Edit Form ── */
        <>
          {/* Metrics */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Crew Count</label>
                <input type="number" value={form.crew_count ?? ""} onChange={(e) => update("crew_count", e.target.value ? parseInt(e.target.value) : null)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Production Qty</label>
                <input type="number" step="0.1" value={form.total_production_qty ?? ""} onChange={(e) => update("total_production_qty", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Production Unit</label>
                <input type="text" value={form.production_unit || ""} onChange={(e) => update("production_unit", e.target.value)} placeholder="sq ft" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Weather Delays (hrs)</label>
                <input type="number" step="0.5" value={form.weather_delays_hours ?? ""} onChange={(e) => update("weather_delays_hours", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Report Content</h3>
            <div>
              <label className={labelCls}>Executive Summary</label>
              <textarea value={form.summary || ""} onChange={(e) => update("summary", e.target.value)} rows={3} placeholder="High-level overview of the week..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Work Completed This Week</label>
              <textarea value={form.work_completed || ""} onChange={(e) => update("work_completed", e.target.value)} rows={4} placeholder="Detail work accomplished..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Planned Work Next Week</label>
              <textarea value={form.planned_next_week || ""} onChange={(e) => update("planned_next_week", e.target.value)} rows={3} placeholder="Upcoming plans..." className={inputCls} />
            </div>
          </div>

          {/* Safety */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Safety</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Safety Incidents</label>
                <input type="number" min="0" value={form.safety_incidents ?? 0} onChange={(e) => update("safety_incidents", parseInt(e.target.value) || 0)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Safety Notes</label>
              <textarea value={form.safety_notes || ""} onChange={(e) => update("safety_notes", e.target.value)} rows={2} placeholder="Safety observations, near-misses, toolbox talks..." className={inputCls} />
            </div>
          </div>

          {/* Issues */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Issues & Concerns</h3>
            <textarea value={form.issues || ""} onChange={(e) => update("issues", e.target.value)} rows={3} placeholder="Problems, delays, concerns to escalate..." className={inputCls} />
          </div>

          {/* Edit Actions */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors">
              <Trash2 size={16} /> Delete Report
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => { setEditing(false); setForm(report); }} className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
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
          {/* Job Reference */}
          {report.job_card && (
            <Section icon={<ClipboardList size={18} />} title="Job">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <p className="text-ivs-text-muted text-xs">Job Number</p>
                  <Link href={`/dashboard/jobs/${report.job_card.id}`} className="text-ivs-accent hover:underline font-mono">
                    {report.job_card.job_number}
                  </Link>
                </div>
                <div>
                  <p className="text-ivs-text-muted text-xs">Project</p>
                  <p className="text-ivs-text">{report.job_card.project_name}</p>
                </div>
                <div>
                  <p className="text-ivs-text-muted text-xs">Client</p>
                  <p className="text-ivs-text">{report.job_card.client_name}</p>
                </div>
              </div>
            </Section>
          )}

          {report.summary && (
            <Section icon={<FileText size={18} />} title="Executive Summary">
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{report.summary}</p>
            </Section>
          )}

          {report.work_completed && (
            <Section icon={<FileText size={18} />} title="Work Completed This Week">
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{report.work_completed}</p>
            </Section>
          )}

          {report.planned_next_week && (
            <Section icon={<Calendar size={18} />} title="Planned Work Next Week">
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{report.planned_next_week}</p>
            </Section>
          )}

          {(report.safety_incidents > 0 || report.safety_notes) && (
            <Section icon={<AlertTriangle size={18} />} title="Safety">
              <div className="space-y-2">
                <p className="text-sm text-ivs-text">
                  <span className={`font-medium ${report.safety_incidents > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {report.safety_incidents} incident{report.safety_incidents !== 1 ? "s" : ""}
                  </span>
                  {" "}reported this week
                </p>
                {report.safety_notes && (
                  <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{report.safety_notes}</p>
                )}
              </div>
            </Section>
          )}

          {report.issues && (
            <Section icon={<AlertCircle size={18} />} title="Issues & Concerns">
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{report.issues}</p>
            </Section>
          )}

          {/* Meta */}
          <Section icon={<Calendar size={18} />} title="Report Info">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-xs text-ivs-text-muted">Prepared By</p>
                <p className="text-ivs-text">{report.prepared_by_employee?.first_name} {report.prepared_by_employee?.last_name}</p>
              </div>
              <div>
                <p className="text-xs text-ivs-text-muted">Created</p>
                <p className="text-ivs-text">{new Date(report.created_at).toLocaleDateString()}</p>
              </div>
              {report.submitted_at && (
                <div>
                  <p className="text-xs text-ivs-text-muted">Submitted</p>
                  <p className="text-ivs-text">{new Date(report.submitted_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Delete */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors">
              <Trash2 size={16} /> Delete Report
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-ivs-text mb-2">Delete Report?</h2>
            <p className="text-sm text-ivs-text-muted mb-6">
              This will permanently delete the weekly report for <strong className="text-ivs-text">{report.job_card?.job_number}</strong> (week ending {new Date(report.week_ending).toLocaleDateString()}). This action cannot be undone.
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

function InfoCard({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-ivs-text-muted mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-lg font-bold ${danger ? "text-red-400" : "text-ivs-text"}`}>{value}</p>
    </div>
  );
}
