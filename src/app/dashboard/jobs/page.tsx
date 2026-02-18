"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { JobCard, JobStatus } from "@/lib/types";
import Link from "next/link";
import { Plus, Calendar, MapPin, DollarSign, Users } from "lucide-react";

const STATUS_COLORS: Record<JobStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-500/15", text: "text-yellow-500", label: "Pending" },
  mobilizing: { bg: "bg-blue-500/15", text: "text-blue-500", label: "Mobilizing" },
  active: { bg: "bg-emerald-500/15", text: "text-emerald-500", label: "Active" },
  on_hold: { bg: "bg-orange-500/15", text: "text-orange-500", label: "On Hold" },
  complete: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Complete" },
  closed: { bg: "bg-gray-600/15", text: "text-gray-500", label: "Closed" },
};

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All Jobs" },
  { value: "active", label: "Active" },
  { value: "mobilizing", label: "Mobilizing" },
  { value: "pending", label: "Pending" },
  { value: "on_hold", label: "On Hold" },
  { value: "complete", label: "Complete" },
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const supabase = createClient();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from("job_cards")
      .select("*")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (!error && data) setJobs(data as JobCard[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  const activeCount = jobs.filter((j) => j.status === "active").length;
  const totalValue = jobs.reduce((sum, j) => sum + (j.contract_value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ivs-text">Jobs</h1>
          <p className="text-sm text-ivs-text-muted mt-1">
            {activeCount} active &middot; {jobs.length} total &middot; ${totalValue.toLocaleString()} contract value
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Status Tabs */}
      <div className="flex gap-1 bg-ivs-bg-light border border-ivs-border rounded-lg p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === tab.value
                ? "bg-ivs-accent text-white"
                : "text-ivs-text-muted hover:text-ivs-text"
            }`}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                {jobs.filter((j) => j.status === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Job Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-ivs-text-muted">No jobs found</p>
          <Link href="/dashboard/jobs/new" className="text-sm text-ivs-accent hover:underline mt-2 inline-block">
            Create your first job card
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((job) => {
            const status = STATUS_COLORS[job.status];
            return (
              <div
                key={job.id}
                className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 hover:border-ivs-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-mono text-ivs-accent">{job.job_number}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                    {status.label}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-ivs-text mb-1 line-clamp-2">
                  {job.project_name}
                </h3>
                <p className="text-xs text-ivs-text-muted mb-3">{job.client_name}</p>

                <div className="space-y-1.5">
                  {job.location && (
                    <div className="flex items-center gap-1.5 text-xs text-ivs-text-muted">
                      <MapPin size={12} />
                      <span className="truncate">{job.location}</span>
                    </div>
                  )}
                  {job.contract_value && (
                    <div className="flex items-center gap-1.5 text-xs text-ivs-text-muted">
                      <DollarSign size={12} />
                      <span>${job.contract_value.toLocaleString()}</span>
                    </div>
                  )}
                  {job.start_date && (
                    <div className="flex items-center gap-1.5 text-xs text-ivs-text-muted">
                      <Calendar size={12} />
                      <span>
                        {new Date(job.start_date).toLocaleDateString()}
                        {job.estimated_end_date && ` — ${new Date(job.estimated_end_date).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                  {job.pump_config && (
                    <div className="flex items-center gap-1.5 text-xs text-ivs-text-muted">
                      <Users size={12} />
                      <span>{job.pump_config} PSI</span>
                      {job.surface_type && <span>&middot; {job.surface_type}</span>}
                      {job.cut_type && <span>&middot; {job.cut_type}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
