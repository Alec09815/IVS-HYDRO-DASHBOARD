"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/contexts/toast-context";
import Link from "next/link";
import {
  ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle,
  Calendar, User, Trash2,
} from "lucide-react";

interface TimesheetDetail {
  id: string;
  week_ending: string;
  status: string;
  total_regular_hours: number;
  total_overtime_hours: number;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  notes: string | null;
  employee: { id: string; first_name: string; last_name: string; email: string; title: string | null; hourly_rate: number | null };
  line_items: { id: string; work_date: string; job_card_id: string | null; regular_hours: number; overtime_hours: number; description: string | null; job_card?: { job_number: string; project_name: string } | null }[];
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Draft" },
  submitted: { bg: "bg-yellow-500/15", text: "text-yellow-500", label: "Submitted" },
  approved: { bg: "bg-emerald-500/15", text: "text-emerald-500", label: "Approved" },
  rejected: { bg: "bg-red-500/15", text: "text-red-500", label: "Rejected" },
};

export default function TimesheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ts, setTs] = useState<TimesheetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { success, error: showError } = useToast();
  const supabase = createClient();

  const fetchTimesheet = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("timesheets")
      .select(`
        id, week_ending, status, total_regular_hours, total_overtime_hours,
        submitted_at, approved_at, approved_by, notes,
        employee:employees!employee_id (id, first_name, last_name, email, title, hourly_rate)
      `)
      .eq("id", id)
      .single();

    if (data) {
      // Fetch time entries
      const { data: lines } = await supabase
        .from("time_entries")
        .select(`
          id, work_date, job_card_id, regular_hours, overtime_hours, description,
          job_card:job_cards!job_card_id (job_number, project_name)
        `)
        .eq("timesheet_id", id)
        .order("work_date");

      setTs({
        ...(data as unknown as TimesheetDetail),
        line_items: (lines as unknown as TimesheetDetail["line_items"]) || [],
      });
    }
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchTimesheet(); }, [fetchTimesheet]);

  const handleStatusUpdate = async (newStatus: "approved" | "rejected") => {
    if (!ts) return;
    setSaving(true);
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "approved") updates.approved_at = new Date().toISOString();
    const { error } = await supabase.from("timesheets").update(updates).eq("id", ts.id);
    if (error) { showError(error.message); setSaving(false); return; }
    setTs({ ...ts, status: newStatus, ...(newStatus === "approved" ? { approved_at: new Date().toISOString() } : {}) });
    setSaving(false);
    success(`Timesheet ${newStatus}`);
  };

  const handleDelete = async () => {
    if (!ts) return;
    await supabase.from("timesheets").delete().eq("id", ts.id);
    success("Timesheet deleted");
    router.push("/dashboard/timesheets");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!ts) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto mb-3 text-ivs-danger" size={32} />
        <p className="text-ivs-text">Timesheet not found</p>
        <Link href="/dashboard/timesheets" className="text-sm text-ivs-accent hover:underline mt-2 inline-block">
          Back to Timesheets
        </Link>
      </div>
    );
  }

  const status = STATUS_BADGE[ts.status] ?? STATUS_BADGE.draft;
  const totalHours = (ts.total_regular_hours || 0) + (ts.total_overtime_hours || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/timesheets" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ivs-text">Timesheet</h1>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
            <p className="text-ivs-text-muted mt-1">
              {ts.employee?.first_name} {ts.employee?.last_name} &mdash; Week ending {new Date(ts.week_ending).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {ts.status === "submitted" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusUpdate("rejected")}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/15 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/25 transition-colors disabled:opacity-50"
            >
              <XCircle size={16} /> Reject
            </button>
            <button
              onClick={() => handleStatusUpdate("approved")}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/15 text-emerald-400 text-sm font-medium rounded-lg hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              <CheckCircle size={16} /> Approve
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard icon={<Clock size={16} />} label="Regular Hours" value={`${ts.total_regular_hours || 0}h`} />
        <InfoCard icon={<Clock size={16} />} label="Overtime" value={ts.total_overtime_hours ? `${ts.total_overtime_hours}h` : "—"} highlight />
        <InfoCard icon={<Clock size={16} />} label="Total Hours" value={`${totalHours}h`} />
        <InfoCard icon={<Calendar size={16} />} label="Week Ending" value={new Date(ts.week_ending).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
      </div>

      {/* Employee Info */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={18} className="text-ivs-accent" />
          <h3 className="text-sm font-semibold text-ivs-text">Employee</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-ivs-accent/20 flex items-center justify-center text-ivs-accent text-lg font-bold">
            {ts.employee?.first_name?.[0]}{ts.employee?.last_name?.[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-ivs-text">{ts.employee?.first_name} {ts.employee?.last_name}</p>
            <p className="text-xs text-ivs-text-muted">{ts.employee?.title || "Employee"} &middot; {ts.employee?.email}</p>
            {ts.employee?.hourly_rate && (
              <p className="text-xs text-ivs-accent mt-0.5">${ts.employee.hourly_rate}/hr</p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      {ts.line_items.length > 0 && (
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-ivs-accent" />
            <h3 className="text-sm font-semibold text-ivs-text">Time Entries</h3>
          </div>
          <div className="bg-ivs-bg rounded-lg border border-ivs-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ivs-border text-xs text-ivs-text-muted">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Job</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-right">Regular</th>
                  <th className="px-4 py-2 text-right">OT</th>
                </tr>
              </thead>
              <tbody>
                {ts.line_items.map((line) => (
                  <tr key={line.id} className="border-b border-ivs-border/50">
                    <td className="px-4 py-2 text-ivs-text">{new Date(line.work_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</td>
                    <td className="px-4 py-2 font-mono text-xs text-ivs-accent">{line.job_card?.job_number || "—"}</td>
                    <td className="px-4 py-2 text-ivs-text-muted">{line.description || "—"}</td>
                    <td className="px-4 py-2 text-right text-ivs-text">{line.regular_hours}h</td>
                    <td className="px-4 py-2 text-right text-ivs-warning">{line.overtime_hours ? `${line.overtime_hours}h` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approval Info */}
      {(ts.submitted_at || ts.approved_at) && (
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-ivs-accent" />
            <h3 className="text-sm font-semibold text-ivs-text">Timeline</h3>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            {ts.submitted_at && (
              <div>
                <p className="text-xs text-ivs-text-muted">Submitted</p>
                <p className="text-ivs-text">{new Date(ts.submitted_at).toLocaleString()}</p>
              </div>
            )}
            {ts.approved_at && (
              <div>
                <p className="text-xs text-ivs-text-muted">Approved</p>
                <p className="text-ivs-text">{new Date(ts.approved_at).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {ts.notes && (
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ivs-text mb-2">Notes</h3>
          <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{ts.notes}</p>
        </div>
      )}

      {/* Delete */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button
          onClick={() => setDeleteConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
        >
          <Trash2 size={16} /> Delete Timesheet
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-ivs-text mb-2">Delete Timesheet?</h2>
            <p className="text-sm text-ivs-text-muted mb-6">
              This will permanently delete this timesheet for <strong className="text-ivs-text">{ts.employee?.first_name} {ts.employee?.last_name}</strong>. This action cannot be undone.
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

function InfoCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-ivs-text-muted mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-lg font-bold ${highlight ? "text-ivs-warning" : "text-ivs-text"}`}>{value}</p>
    </div>
  );
}
