"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft, ClipboardList, Calendar, Users, AlertTriangle,
  CloudRain, FileText, AlertCircle, Trash2, BarChart3,
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
  const [report, setReport] = useState<WeeklyReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
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

    if (data) setReport(data as unknown as WeeklyReportDetail);
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleDelete = async () => {
    if (!report) return;
    await supabase.from("weekly_reports").delete().eq("id", report.id);
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard icon={<Users size={16} />} label="Crew Count" value={report.crew_count?.toString() || "—"} />
        <InfoCard icon={<BarChart3 size={16} />} label="Production" value={report.total_production_qty ? `${report.total_production_qty.toLocaleString()} ${report.production_unit || ""}` : "—"} />
        <InfoCard icon={<AlertTriangle size={16} />} label="Safety Incidents" value={report.safety_incidents.toString()} danger={report.safety_incidents > 0} />
        <InfoCard icon={<CloudRain size={16} />} label="Weather Delays" value={report.weather_delays_hours ? `${report.weather_delays_hours}h` : "None"} />
      </div>

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

      {/* Executive Summary */}
      {report.summary && (
        <Section icon={<FileText size={18} />} title="Executive Summary">
          <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{report.summary}</p>
        </Section>
      )}

      {/* Work Completed */}
      {report.work_completed && (
        <Section icon={<FileText size={18} />} title="Work Completed This Week">
          <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{report.work_completed}</p>
        </Section>
      )}

      {/* Planned Next Week */}
      {report.planned_next_week && (
        <Section icon={<Calendar size={18} />} title="Planned Work Next Week">
          <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{report.planned_next_week}</p>
        </Section>
      )}

      {/* Safety */}
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

      {/* Issues */}
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
        <button
          onClick={() => setDeleteConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
        >
          <Trash2 size={16} /> Delete Report
        </button>
      </div>

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
