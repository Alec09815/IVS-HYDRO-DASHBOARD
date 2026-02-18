"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { JobCard, JobStatus } from "@/lib/types";
import Link from "next/link";
import { Plus, Calendar, MapPin, DollarSign, Users, ClipboardList } from "lucide-react";

const STATUS_BADGE: Record<JobStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-500/15", text: "text-yellow-500", label: "Pending" },
  mobilizing: { bg: "bg-blue-500/15", text: "text-blue-500", label: "Mobilizing" },
  active: { bg: "bg-emerald-500/15", text: "text-emerald-500", label: "Active" },
  on_hold: { bg: "bg-orange-500/15", text: "text-orange-500", label: "On Hold" },
  complete: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Complete" },
  closed: { bg: "bg-gray-600/15", text: "text-gray-500", label: "Closed" },
};

const ACTIVE_STATUSES: JobStatus[] = ["pending", "mobilizing", "active", "on_hold"];
const COMPLETED_STATUSES: JobStatus[] = ["complete", "closed"];

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "completed">("active");
  const supabase = createClient();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_cards")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setJobs(data as JobCard[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const filtered = jobs.filter((j) =>
    tab === "active" ? ACTIVE_STATUSES.includes(j.status) : COMPLETED_STATUSES.includes(j.status)
  );

  const activeCount = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length;
  const completedCount = jobs.filter((j) => COMPLETED_STATUSES.includes(j.status)).length;
  const totalValue = jobs.reduce((sum, j) => sum + (j.contract_value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ivs-text">Jobs</h1>
          <p className="text-sm text-ivs-text-muted mt-1">
            {activeCount} active &middot; {completedCount} completed &middot; ${totalValue.toLocaleString()} total value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/jobs/team"
            className="flex items-center gap-2 px-4 py-2 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors"
          >
            <Users size={16} />
            Team
          </Link>
          <Link
            href="/dashboard/jobs/man-up"
            className="flex items-center gap-2 px-4 py-2 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors"
          >
            <ClipboardList size={16} />
            Man-Up
          </Link>
          <Link
            href="/dashboard/jobs/calendar"
            className="flex items-center gap-2 px-4 py-2 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors"
          >
            <Calendar size={16} />
            Calendar
          </Link>
          <Link
            href="/dashboard/jobs/new"
            className="flex items-center gap-2 px-4 py-2 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Job
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ivs-bg-light border border-ivs-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("active")}
          className={`px-5 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === "active" ? "bg-ivs-accent text-white" : "text-ivs-text-muted hover:text-ivs-text"
          }`}
        >
          Active <span className="ml-1 text-xs opacity-70">{activeCount}</span>
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`px-5 py-1.5 text-sm font-medium rounded-md transition-colors ${
            tab === "completed" ? "bg-ivs-accent text-white" : "text-ivs-text-muted hover:text-ivs-text"
          }`}
        >
          Completed <span className="ml-1 text-xs opacity-70">{completedCount}</span>
        </button>
      </div>

      {/* Job Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-ivs-bg-card border border-ivs-border rounded-xl">
          <p className="text-ivs-text-muted">
            {tab === "active" ? "No active jobs" : "No completed jobs"}
          </p>
          {tab === "active" && (
            <Link href="/dashboard/jobs/new" className="text-sm text-ivs-accent hover:underline mt-2 inline-block">
              Create your first job card
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivs-border text-xs text-ivs-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Job #</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Config</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-left">Dates</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => {
                const status = STATUS_BADGE[job.status];
                return (
                  <tr key={job.id} className="border-b border-ivs-border/50 hover:bg-ivs-bg-light/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/jobs/${job.id}`} className="font-mono text-sm text-ivs-accent hover:underline">
                        {job.job_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/jobs/${job.id}`} className="text-sm text-ivs-text hover:text-ivs-accent transition-colors">
                        {job.project_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-ivs-text-muted">{job.client_name}</td>
                    <td className="px-4 py-3">
                      {job.location ? (
                        <div className="flex items-center gap-1 text-xs text-ivs-text-muted">
                          <MapPin size={12} />
                          <span className="truncate max-w-[120px]">{job.location}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-ivs-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {job.pump_config ? (
                        <span className="text-xs text-ivs-text-muted">
                          {job.pump_config}
                          {job.surface_type && ` · ${job.surface_type}`}
                        </span>
                      ) : (
                        <span className="text-xs text-ivs-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {job.contract_value ? (
                        <div className="flex items-center justify-end gap-1 text-sm text-ivs-text">
                          <DollarSign size={12} />
                          {job.contract_value.toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-xs text-ivs-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ivs-text-muted">
                      {job.start_date ? (
                        <span>
                          {new Date(job.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {job.estimated_end_date && (
                            <> — {new Date(job.estimated_end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                          )}
                        </span>
                      ) : "—"}
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
