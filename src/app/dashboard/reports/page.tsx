"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ClipboardList, Calendar, Search, Plus } from "lucide-react";
import Link from "next/link";

interface WeeklyReportRow {
  id: string;
  week_ending: string;
  summary: string | null;
  work_completed: string | null;
  safety_incidents: number;
  total_production_qty: number | null;
  production_unit: string | null;
  crew_count: number | null;
  submitted: boolean;
  job_card: { job_number: string; project_name: string } | null;
  prepared_by_employee: { first_name: string; last_name: string } | null;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("weekly_reports")
      .select(`
        id, week_ending, summary, work_completed, safety_incidents,
        total_production_qty, production_unit, crew_count, submitted,
        job_card:job_cards!job_card_id (job_number, project_name),
        prepared_by_employee:employees!prepared_by (first_name, last_name)
      `)
      .order("week_ending", { ascending: false });
    if (data) setReports(data as unknown as WeeklyReportRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const filtered = reports.filter((r) => {
    const text = `${r.job_card?.job_number} ${r.job_card?.project_name}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ivs-text">Weekly Reports</h1>
          <p className="text-sm text-ivs-text-muted mt-1">{reports.length} reports submitted</p>
        </div>
        <Link
          href="/dashboard/reports/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> New Report
        </Link>
      </div>

      <div className="flex items-center gap-2 bg-ivs-bg-card border border-ivs-border rounded-lg px-3 py-2 max-w-sm">
        <Search size={16} className="text-ivs-text-muted" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by job..." className="bg-transparent text-sm text-ivs-text placeholder-ivs-text-muted outline-none w-full" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-ivs-bg-card border border-ivs-border rounded-xl">
          <ClipboardList className="mx-auto mb-3 text-ivs-text-muted" size={32} />
          <p className="text-ivs-text-muted">No weekly reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Link key={r.id} href={`/dashboard/reports/${r.id}`} className="block bg-ivs-bg-card border border-ivs-border rounded-xl p-5 hover:border-ivs-accent/30 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-ivs-accent">{r.job_card?.job_number}</span>
                    <span className="text-xs text-ivs-text-muted">{r.job_card?.project_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-ivs-text-muted" />
                    <span className="text-sm font-medium text-ivs-text">
                      Week ending {new Date(r.week_ending).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${r.submitted ? "bg-emerald-500/15 text-emerald-500" : "bg-gray-500/15 text-gray-400"}`}>
                    {r.submitted ? "Submitted" : "Draft"}
                  </span>
                  <span className="text-xs text-ivs-text-muted">
                    by {r.prepared_by_employee?.first_name} {r.prepared_by_employee?.last_name}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-ivs-text-muted mb-2">
                {r.crew_count != null && <span>Crew: {r.crew_count}</span>}
                {r.total_production_qty != null && <span>Production: {r.total_production_qty} {r.production_unit || ""}</span>}
                <span className={r.safety_incidents > 0 ? "text-ivs-danger font-medium" : ""}>
                  Safety Incidents: {r.safety_incidents}
                </span>
              </div>

              {r.summary && <p className="text-sm text-ivs-text-muted line-clamp-2">{r.summary}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
