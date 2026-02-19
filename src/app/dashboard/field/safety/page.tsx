"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/contexts/toast-context";
import type { JobCard } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Shield, Send, CheckSquare } from "lucide-react";

const CHECKLIST_ITEMS = [
  { id: "ppe", label: "All crew wearing required PPE (hard hat, safety glasses, hearing protection, steel toes)" },
  { id: "barricades", label: "Work area barricaded and signage posted" },
  { id: "water_containment", label: "Water containment and drainage in place" },
  { id: "electrical", label: "Electrical hazards identified and mitigated" },
  { id: "hoses_connections", label: "High-pressure hoses and connections inspected" },
  { id: "emergency_stops", label: "Emergency stops tested and accessible" },
  { id: "communication", label: "Communication plan established with crew" },
  { id: "weather", label: "Weather conditions assessed — safe to proceed" },
  { id: "housekeeping", label: "Work area clean and free of trip hazards" },
  { id: "first_aid", label: "First aid kit and emergency contacts available on site" },
  { id: "permits", label: "Required permits obtained and posted" },
  { id: "equipment_inspected", label: "All equipment pre-use inspections complete" },
];

export default function SafetyChecklistPage() {
  const router = useRouter();
  const { employee } = useAuth();
  const { success, error: showError } = useToast();
  const [jobId, setJobId] = useState("");
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [hazards, setHazards] = useState("");
  const [notes, setNotes] = useState("");
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

  const toggleCheck = (id: string) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allChecked = CHECKLIST_ITEMS.every((item) => checks[item.id]);
  const checkedCount = CHECKLIST_ITEMS.filter((item) => checks[item.id]).length;

  const handleSubmit = async () => {
    if (!jobId) { setError("Please select a job."); return; }
    if (!employee) { setError("Not logged in."); return; }
    if (!allChecked) { setError("All checklist items must be checked before submitting."); return; }

    setSaving(true);
    setError("");

    // Store as a man-up report note or as a separate record
    // Using the weekly_reports table's notes field or a custom approach
    // For now, we'll store this as a note on the man-up report for the day
    const today = new Date().toISOString().split("T")[0];
    const checklistData = {
      items: CHECKLIST_ITEMS.map((item) => ({ ...item, checked: !!checks[item.id] })),
      hazards: hazards || null,
      notes: notes || null,
      completed_by: `${employee.first_name} ${employee.last_name}`,
      completed_at: new Date().toISOString(),
    };

    // Check if there's already a man-up report for this job today
    const { data: existing } = await supabase
      .from("man_up_reports")
      .select("id, notes")
      .eq("job_card_id", jobId)
      .eq("report_date", today)
      .single();

    if (existing) {
      // Update existing report with safety checklist in notes
      const updatedNotes = `${existing.notes || ""}\n\n--- SAFETY CHECKLIST (${new Date().toLocaleTimeString()}) ---\n${JSON.stringify(checklistData, null, 2)}`.trim();
      const { error: dbErr } = await supabase
        .from("man_up_reports")
        .update({ safety_topic: `Pre-shift checklist completed (${checkedCount}/${CHECKLIST_ITEMS.length})`, notes: updatedNotes })
        .eq("id", existing.id);
      if (dbErr) { showError(dbErr.message); setSaving(false); return; }
    } else {
      // Create a new man-up report with safety checklist
      const { error: dbErr } = await supabase.from("man_up_reports").insert({
        job_card_id: jobId,
        report_date: today,
        prepared_by: employee.id,
        crew_members: [],
        equipment_on_site: [],
        safety_topic: `Pre-shift checklist completed (${checkedCount}/${CHECKLIST_ITEMS.length})`,
        notes: `--- SAFETY CHECKLIST ---\nHazards: ${hazards || "None identified"}\nNotes: ${notes || "None"}\nCompleted by: ${employee.first_name} ${employee.last_name}`,
      });
      if (dbErr) { showError(dbErr.message); setSaving(false); return; }
    }

    setSaving(false);
    success("Safety checklist submitted");
    router.push("/dashboard/field");
  };

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/field" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ivs-text flex items-center gap-2">
            <Shield size={24} className="text-orange-400" /> Pre-Shift Safety Checklist
          </h1>
          <p className="text-sm text-ivs-text-muted mt-1">Complete all items before starting work</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Job Selection */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
        <label className={labelCls}>Job *</label>
        <select value={jobId} onChange={(e) => setJobId(e.target.value)} className={inputCls} required>
          <option value="">Select job...</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.job_number} - {j.project_name}</option>
          ))}
        </select>
      </div>

      {/* Checklist */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ivs-text">Safety Checklist</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${allChecked ? "bg-emerald-500/15 text-emerald-500" : "bg-yellow-500/15 text-yellow-500"}`}>
            {checkedCount}/{CHECKLIST_ITEMS.length}
          </span>
        </div>
        <div className="space-y-3">
          {CHECKLIST_ITEMS.map((item) => (
            <label
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                checks[item.id]
                  ? "bg-emerald-500/5 border-emerald-500/30"
                  : "bg-ivs-bg border-ivs-border hover:border-ivs-accent/30"
              }`}
            >
              <input
                type="checkbox"
                checked={!!checks[item.id]}
                onChange={() => toggleCheck(item.id)}
                className="mt-0.5 w-4 h-4 rounded border-ivs-border text-ivs-accent focus:ring-ivs-accent bg-ivs-bg"
              />
              <span className={`text-sm ${checks[item.id] ? "text-emerald-400" : "text-ivs-text"}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Hazard Assessment */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Hazard Assessment</h3>
        <textarea
          value={hazards}
          onChange={(e) => setHazards(e.target.value)}
          rows={3}
          placeholder="Identify any hazards specific to today's work area..."
          className={inputCls}
        />
      </div>

      {/* Notes */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Additional Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Any additional safety notes or comments..."
          className={inputCls}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-8">
        <Link href="/dashboard/field" className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
          Cancel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={saving || !allChecked}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Send size={16} /> {saving ? "Submitting..." : "Submit Checklist"}
        </button>
      </div>
    </div>
  );
}
