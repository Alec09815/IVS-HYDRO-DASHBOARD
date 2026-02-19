"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import type { Employee, JobCard } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Clock, Save, Send, Plus, Trash2 } from "lucide-react";

interface LineItem {
  key: string;
  work_date: string;
  job_card_id: string;
  hours: number;
  overtime_hours: number;
  description: string;
}

function getWeekDates(weekEnding: string): string[] {
  const end = new Date(weekEnding + "T12:00:00");
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function getNextFriday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day <= 5 ? 5 - day : 6;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default function NewTimesheetPage() {
  const router = useRouter();
  const { employee } = useAuth();
  const [weekEnding, setWeekEnding] = useState(getNextFriday());
  const [employeeId, setEmployeeId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const fetchLookups = useCallback(async () => {
    const [empRes, jobRes] = await Promise.all([
      supabase.from("employees").select("id, first_name, last_name, role").eq("is_active", true).order("last_name"),
      supabase.from("job_cards").select("id, job_number, project_name").in("status", ["active", "mobilizing"]).order("job_number"),
    ]);
    if (empRes.data) setEmployees(empRes.data as Employee[]);
    if (jobRes.data) setJobs(jobRes.data as JobCard[]);
  }, [supabase]);

  useEffect(() => {
    fetchLookups();
    if (employee) setEmployeeId(employee.id);
  }, [fetchLookups, employee]);

  // Auto-populate week days when week ending changes
  useEffect(() => {
    if (!weekEnding) return;
    const dates = getWeekDates(weekEnding);
    // Only generate if no lines exist or they're all empty
    if (lines.length === 0 || lines.every((l) => !l.hours && !l.overtime_hours)) {
      setLines(
        dates.map((d) => ({
          key: d,
          work_date: d,
          job_card_id: "",
          hours: 0,
          overtime_hours: 0,
          description: "",
        }))
      );
    }
  }, [weekEnding]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateLine = (key: string, field: keyof LineItem, value: string | number) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        key: `extra-${Date.now()}`,
        work_date: weekEnding,
        job_card_id: "",
        hours: 0,
        overtime_hours: 0,
        description: "",
      },
    ]);
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const totalRegular = lines.reduce((s, l) => s + (l.hours || 0), 0);
  const totalOT = lines.reduce((s, l) => s + (l.overtime_hours || 0), 0);

  const handleSave = async (submit: boolean) => {
    if (!employeeId) {
      setError("Employee is required.");
      return;
    }
    if (!weekEnding) {
      setError("Week ending date is required.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      employee_id: employeeId,
      week_ending: weekEnding,
      total_regular_hours: totalRegular,
      total_overtime_hours: totalOT,
      status: submit ? "submitted" : "draft",
      submitted_at: submit ? new Date().toISOString() : null,
      notes: notes || null,
    };

    const { data, error: dbErr } = await supabase
      .from("timesheets")
      .insert(payload)
      .select()
      .single();

    if (dbErr) {
      setError(dbErr.message);
      setSaving(false);
      return;
    }

    // Insert line items if table exists
    if (data && lines.length > 0) {
      const linePayloads = lines
        .filter((l) => l.hours > 0 || l.overtime_hours > 0)
        .map((l) => ({
          timesheet_id: data.id,
          work_date: l.work_date,
          job_card_id: l.job_card_id || null,
          regular_hours: l.hours || 0,
          overtime_hours: l.overtime_hours || 0,
          description: l.description || null,
        }));
      if (linePayloads.length > 0) {
        await supabase.from("time_entries").insert(linePayloads);
      }
    }

    setSaving(false);
    router.push("/dashboard/timesheets");
  };

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/timesheets" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ivs-text flex items-center gap-2">
            <Clock size={24} className="text-ivs-accent" /> New Timesheet
          </h1>
          <p className="text-sm text-ivs-text-muted mt-1">Enter time for the work week</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Employee & Period */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Employee & Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Employee *</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls} required>
              <option value="">Select employee...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Week Ending (Friday) *</label>
            <input type="date" value={weekEnding} onChange={(e) => setWeekEnding(e.target.value)} className={inputCls} required />
          </div>
        </div>
      </div>

      {/* Time Entries */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ivs-text">Time Entries</h3>
          <div className="text-xs text-ivs-text-muted">
            Regular: <span className="font-medium text-ivs-text">{totalRegular}h</span> &middot;
            OT: <span className="font-medium text-ivs-warning">{totalOT}h</span> &middot;
            Total: <span className="font-medium text-ivs-accent">{totalRegular + totalOT}h</span>
          </div>
        </div>

        <div className="space-y-2">
          {lines.map((line) => {
            const dayName = new Date(line.work_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
            return (
              <div key={line.key} className="bg-ivs-bg rounded-lg border border-ivs-border p-3">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-ivs-text">{dayName}</p>
                  </div>
                  <div className="col-span-3">
                    <select
                      value={line.job_card_id}
                      onChange={(e) => updateLine(line.key, "job_card_id", e.target.value)}
                      className="w-full px-2 py-1.5 bg-ivs-bg-card border border-ivs-border rounded text-ivs-text text-xs focus:outline-none focus:ring-1 focus:ring-ivs-accent"
                    >
                      <option value="">No job</option>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>{j.job_number}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={line.hours || ""}
                      onChange={(e) => updateLine(line.key, "hours", parseFloat(e.target.value) || 0)}
                      placeholder="Reg"
                      className="w-full px-2 py-1.5 bg-ivs-bg-card border border-ivs-border rounded text-ivs-text text-xs text-center focus:outline-none focus:ring-1 focus:ring-ivs-accent"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={line.overtime_hours || ""}
                      onChange={(e) => updateLine(line.key, "overtime_hours", parseFloat(e.target.value) || 0)}
                      placeholder="OT"
                      className="w-full px-2 py-1.5 bg-ivs-bg-card border border-ivs-border rounded text-ivs-warning text-xs text-center focus:outline-none focus:ring-1 focus:ring-ivs-accent"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(line.key, "description", e.target.value)}
                      placeholder="Notes..."
                      className="w-full px-2 py-1.5 bg-ivs-bg-card border border-ivs-border rounded text-ivs-text text-xs focus:outline-none focus:ring-1 focus:ring-ivs-accent"
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeLine(line.key)} className="p-1 text-ivs-text-muted hover:text-ivs-danger transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={addLine} className="flex items-center gap-2 text-sm text-ivs-accent hover:text-ivs-accent-hover transition-colors">
          <Plus size={14} /> Add Row
        </button>
      </div>

      {/* Notes */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any notes about this timesheet..."
          className={inputCls}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-8">
        <Link href="/dashboard/timesheets" className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
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
          <Send size={16} /> Submit
        </button>
      </div>
    </div>
  );
}
