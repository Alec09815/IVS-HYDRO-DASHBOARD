"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft, Plus, Users, Cloud, Thermometer,
  Clock, Shield, Search, Calendar,
} from "lucide-react";

interface ManUpReport {
  id: string;
  report_date: string;
  weather_conditions: string | null;
  temperature_f: number | null;
  start_time: string | null;
  end_time: string | null;
  safety_topic: string | null;
  crew_members: { name: string; role: string }[];
  equipment_on_site: { name: string; asset_number: string }[];
  visitor_log: { name: string; company: string; time: string }[];
  notes: string | null;
  job_card: {
    id: string;
    job_number: string;
    project_name: string;
  };
  prepared_by_employee: {
    first_name: string;
    last_name: string;
  };
}

export default function ManUpReportPage() {
  const [reports, setReports] = useState<ManUpReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [jobs, setJobs] = useState<{ id: string; job_number: string; project_name: string }[]>([]);
  const supabase = createClient();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("man_up_reports")
      .select(`
        id, report_date, weather_conditions, temperature_f, start_time, end_time,
        safety_topic, crew_members, equipment_on_site, visitor_log, notes,
        job_card:job_cards!job_card_id (id, job_number, project_name),
        prepared_by_employee:employees!prepared_by (first_name, last_name)
      `)
      .order("report_date", { ascending: false });

    if (!error && data) setReports(data as unknown as ManUpReport[]);
    setLoading(false);
  }, [supabase]);

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from("job_cards")
      .select("id, job_number, project_name")
      .in("status", ["active", "mobilizing"])
      .order("job_number");
    if (data) setJobs(data);
  }, [supabase]);

  useEffect(() => { fetchReports(); fetchJobs(); }, [fetchReports, fetchJobs]);

  const createReport = async (jobId: string) => {
    // Get current user's employee record
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: emp } = await supabase.from("employees").select("id").eq("auth_user_id", user.id).single();
    if (!emp) return;

    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("man_up_reports").insert({
      job_card_id: jobId,
      report_date: today,
      prepared_by: emp.id,
      crew_members: [],
      equipment_on_site: [],
    });
    if (!error) {
      setCreating(false);
      fetchReports();
    }
  };

  const filtered = reports.filter((r) => {
    const text = `${r.job_card?.job_number} ${r.job_card?.project_name} ${r.prepared_by_employee?.first_name} ${r.prepared_by_employee?.last_name}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/jobs" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ivs-text">Man-Up Reports</h1>
            <p className="text-sm text-ivs-text-muted">Daily crew and equipment reports</p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Report
        </button>
      </div>

      {/* Quick Create Modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-ivs-text mb-4">New Man-Up Report</h2>
            <p className="text-sm text-ivs-text-muted mb-4">Select a job to create today&apos;s report:</p>
            {jobs.length === 0 ? (
              <p className="text-sm text-ivs-text-muted">No active jobs found.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => createReport(job.id)}
                    className="w-full text-left px-4 py-3 bg-ivs-bg border border-ivs-border rounded-lg hover:border-ivs-accent/40 transition-colors"
                  >
                    <span className="text-xs font-mono text-ivs-accent">{job.job_number}</span>
                    <p className="text-sm text-ivs-text">{job.project_name}</p>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setCreating(false)}
              className="mt-4 w-full px-4 py-2 text-sm text-ivs-text-muted hover:text-ivs-text border border-ivs-border rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2 bg-ivs-bg-card border border-ivs-border rounded-lg px-3 py-2 max-w-sm">
        <Search size={16} className="text-ivs-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by job or preparer..."
          className="bg-transparent text-sm text-ivs-text placeholder-ivs-text-muted outline-none w-full"
        />
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-ivs-bg-card border border-ivs-border rounded-xl">
          <Users className="mx-auto mb-3 text-ivs-text-muted" size={32} />
          <p className="text-ivs-text-muted">No man-up reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const crewCount = (report.crew_members ?? []).length;
            const eqCount = (report.equipment_on_site ?? []).length;
            return (
              <Link key={report.id} href={`/dashboard/jobs/man-up/${report.id}`} className="block bg-ivs-bg-card border border-ivs-border rounded-xl p-5 hover:border-ivs-accent/30 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-ivs-accent">{report.job_card?.job_number}</span>
                      <span className="text-xs text-ivs-text-muted">&middot;</span>
                      <span className="text-xs text-ivs-text-muted">{report.job_card?.project_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-ivs-text-muted">
                      <Calendar size={14} />
                      <span className="text-sm font-medium text-ivs-text">
                        {new Date(report.report_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-ivs-text-muted">
                    by {report.prepared_by_employee?.first_name} {report.prepared_by_employee?.last_name}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-ivs-text-muted">
                  <div className="flex items-center gap-1.5">
                    <Users size={13} />
                    <span>{crewCount} crew</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={13} />
                    <span>{eqCount} equipment</span>
                  </div>
                  {report.start_time && report.end_time && (
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} />
                      <span>{report.start_time} — {report.end_time}</span>
                    </div>
                  )}
                  {report.weather_conditions && (
                    <div className="flex items-center gap-1.5">
                      <Cloud size={13} />
                      <span>{report.weather_conditions}</span>
                    </div>
                  )}
                  {report.temperature_f && (
                    <div className="flex items-center gap-1.5">
                      <Thermometer size={13} />
                      <span>{report.temperature_f}°F</span>
                    </div>
                  )}
                  {report.safety_topic && (
                    <div className="flex items-center gap-1.5">
                      <Shield size={13} />
                      <span>{report.safety_topic}</span>
                    </div>
                  )}
                </div>

                {report.notes && (
                  <p className="mt-2 text-xs text-ivs-text-muted line-clamp-2">{report.notes}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
