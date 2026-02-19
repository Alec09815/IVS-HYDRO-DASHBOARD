"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock, CheckCircle, XCircle, Search, Filter, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TimesheetRow {
  id: string;
  week_ending: string;
  status: string;
  total_regular_hours: number;
  total_overtime_hours: number;
  submitted_at: string | null;
  approved_at: string | null;
  notes: string | null;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    title: string | null;
  };
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Draft" },
  submitted: { bg: "bg-yellow-500/15", text: "text-yellow-500", label: "Submitted" },
  approved: { bg: "bg-emerald-500/15", text: "text-emerald-500", label: "Approved" },
  rejected: { bg: "bg-red-500/15", text: "text-red-500", label: "Rejected" },
};

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const fetchTimesheets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("timesheets")
      .select(`
        id, week_ending, status, total_regular_hours, total_overtime_hours,
        submitted_at, approved_at, notes,
        employee:employees!employee_id (id, first_name, last_name, title)
      `)
      .order("week_ending", { ascending: false });

    if (!error && data) {
      setTimesheets(data as unknown as TimesheetRow[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchTimesheets(); }, [fetchTimesheets]);

  const handleApprove = async (id: string) => {
    await supabase.from("timesheets").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    fetchTimesheets();
  };

  const handleReject = async (id: string) => {
    await supabase.from("timesheets").update({ status: "rejected" }).eq("id", id);
    fetchTimesheets();
  };

  const filtered = timesheets.filter((ts) => {
    const matchesStatus = statusFilter === "all" || ts.status === statusFilter;
    const empName = ts.employee ? `${ts.employee.first_name} ${ts.employee.last_name}` : "";
    const matchesSearch = empName.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = timesheets.filter((t) => t.status === "submitted").length;
  const totalHours = filtered.reduce((sum, t) => sum + (t.total_regular_hours || 0) + (t.total_overtime_hours || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ivs-text">Timesheets</h1>
          <p className="text-sm text-ivs-text-muted mt-1">
            {pendingCount} pending review &middot; {totalHours.toFixed(1)} total hours shown
          </p>
        </div>
        <Link
          href="/dashboard/timesheets/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> New Timesheet
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-ivs-bg-card border border-ivs-border rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search size={16} className="text-ivs-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by employee..."
            className="bg-transparent text-sm text-ivs-text placeholder-ivs-text-muted outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-1 bg-ivs-bg-light border border-ivs-border rounded-lg p-0.5">
          <Filter size={14} className="text-ivs-text-muted ml-2" />
          {["all", "submitted", "approved", "rejected", "draft"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                statusFilter === s ? "bg-ivs-accent text-white" : "text-ivs-text-muted hover:text-ivs-text"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-ivs-bg-card border border-ivs-border rounded-xl">
          <Clock className="mx-auto mb-3 text-ivs-text-muted" size={32} />
          <p className="text-ivs-text-muted">No timesheets found</p>
        </div>
      ) : (
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivs-border text-xs text-ivs-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Week Ending</th>
                <th className="px-4 py-3 text-center">Regular</th>
                <th className="px-4 py-3 text-center">Overtime</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ts) => {
                const status = STATUS_BADGE[ts.status] ?? STATUS_BADGE.draft;
                const total = (ts.total_regular_hours || 0) + (ts.total_overtime_hours || 0);
                return (
                  <tr key={ts.id} onClick={() => router.push(`/dashboard/timesheets/${ts.id}`)} className="border-b border-ivs-border/50 hover:bg-ivs-bg-light/50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ivs-accent/20 flex items-center justify-center text-ivs-accent text-xs font-bold flex-shrink-0">
                          {ts.employee?.first_name?.[0]}{ts.employee?.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ivs-text">
                            {ts.employee?.first_name} {ts.employee?.last_name}
                          </p>
                          {ts.employee?.title && <p className="text-xs text-ivs-text-muted">{ts.employee.title}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ivs-text">
                      {new Date(ts.week_ending).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-ivs-text">{ts.total_regular_hours || 0}h</td>
                    <td className="px-4 py-3 text-center text-sm text-ivs-warning">
                      {ts.total_overtime_hours ? `${ts.total_overtime_hours}h` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium text-ivs-text">{total}h</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ivs-text-muted">
                      {ts.submitted_at ? new Date(ts.submitted_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {ts.status === "submitted" && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleApprove(ts.id)}
                            className="p-1.5 text-ivs-success hover:bg-ivs-success/10 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(ts.id)}
                            className="p-1.5 text-ivs-danger hover:bg-ivs-danger/10 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
