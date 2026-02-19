"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import type { JobCard } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Save, Send } from "lucide-react";

interface WeeklyReportFormData {
  job_card_id: string;
  week_ending: string;
  summary: string;
  work_completed: string;
  planned_next_week: string;
  safety_incidents: number;
  safety_notes: string;
  weather_delays_hours: number | null;
  total_production_qty: number | null;
  production_unit: string;
  crew_count: number | null;
  issues: string;
}

const INITIAL: WeeklyReportFormData = {
  job_card_id: "",
  week_ending: getNextFriday(),
  summary: "",
  work_completed: "",
  planned_next_week: "",
  safety_incidents: 0,
  safety_notes: "",
  weather_delays_hours: null,
  total_production_qty: null,
  production_unit: "sq ft",
  crew_count: null,
  issues: "",
};

function getNextFriday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day <= 5 ? 5 - day : 6; // days until Friday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default function NewWeeklyReportPage() {
  const router = useRouter();
  const { employee } = useAuth();
  const [form, setForm] = useState<WeeklyReportFormData>(INITIAL);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from("job_cards")
      .select("id, job_number, project_name")
      .in("status", ["active", "mobilizing"])
      .order("job_number");
    if (data) setJobs(data as JobCard[]);
  }, [supabase]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const update = <K extends keyof WeeklyReportFormData>(key: K, value: WeeklyReportFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (submit: boolean) => {
    if (!form.job_card_id) {
      setError("Job is required.");
      return;
    }
    if (!employee) {
      setError("Not logged in.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      prepared_by: employee.id,
      weather_delays_hours: form.weather_delays_hours || 0,
      total_production_qty: form.total_production_qty || null,
      crew_count: form.crew_count || null,
      submitted: submit,
      submitted_at: submit ? new Date().toISOString() : null,
    };

    const { error: dbErr } = await supabase.from("weekly_reports").insert(payload);
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    router.push("/dashboard/reports");
  };

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ivs-text flex items-center gap-2">
            <ClipboardList size={24} className="text-ivs-accent" /> New Weekly Report
          </h1>
          <p className="text-sm text-ivs-text-muted mt-1">Summarize the week&apos;s work, safety, and production</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Job & Period */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Report Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Job *</label>
            <select value={form.job_card_id} onChange={(e) => update("job_card_id", e.target.value)} className={inputCls} required>
              <option value="">Select job...</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.job_number} - {j.project_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Week Ending (Friday) *</label>
            <input type="date" value={form.week_ending} onChange={(e) => update("week_ending", e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Crew Count</label>
            <input type="number" value={form.crew_count ?? ""} onChange={(e) => update("crew_count", e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g., 6" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Total Production</label>
              <input type="number" step="0.1" value={form.total_production_qty ?? ""} onChange={(e) => update("total_production_qty", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <select value={form.production_unit} onChange={(e) => update("production_unit", e.target.value)} className={inputCls}>
                {["sq ft", "cu ft", "cu yd", "linear ft", "sq yd"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Work Summary */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Work Summary</h3>
        <div>
          <label className={labelCls}>Executive Summary</label>
          <textarea value={form.summary} onChange={(e) => update("summary", e.target.value)} rows={3} placeholder="Brief overview of the week's progress..." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Work Completed This Week</label>
          <textarea value={form.work_completed} onChange={(e) => update("work_completed", e.target.value)} rows={4} placeholder="Detailed description of work performed..." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Planned Work Next Week</label>
          <textarea value={form.planned_next_week} onChange={(e) => update("planned_next_week", e.target.value)} rows={3} placeholder="Upcoming work activities..." className={inputCls} />
        </div>
      </div>

      {/* Safety */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Safety</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Safety Incidents</label>
            <input type="number" value={form.safety_incidents} onChange={(e) => update("safety_incidents", parseInt(e.target.value) || 0)} min={0} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Weather Delay Hours</label>
            <input type="number" step="0.5" value={form.weather_delays_hours ?? ""} onChange={(e) => update("weather_delays_hours", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
          </div>
        </div>
        {form.safety_incidents > 0 && (
          <div>
            <label className={labelCls}>Safety Notes</label>
            <textarea value={form.safety_notes} onChange={(e) => update("safety_notes", e.target.value)} rows={2} placeholder="Describe incidents and corrective actions..." className={inputCls} />
          </div>
        )}
      </div>

      {/* Issues */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Issues & Concerns</h3>
        <textarea
          value={form.issues}
          onChange={(e) => update("issues", e.target.value)}
          rows={3}
          placeholder="Any issues, concerns, or items requiring management attention..."
          className={inputCls}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-8">
        <Link href="/dashboard/reports" className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
          Cancel
        </Link>
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors disabled:opacity-50"
        >
          <Save size={16} /> Save Draft
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Send size={16} /> Submit Report
        </button>
      </div>
    </div>
  );
}
