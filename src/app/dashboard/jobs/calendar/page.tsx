"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { JobCard, JobStatus } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

type ViewMode = "month" | "week" | "day";

const JOB_COLORS: Record<JobStatus, string> = {
  active: "#3B82F6",      // blue
  mobilizing: "#3B82F6",  // blue
  pending: "#F97316",     // orange
  on_hold: "#F97316",     // orange
  complete: "#10B981",    // green
  closed: "#6B7280",      // gray
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function jobSpansDate(job: JobCard, date: Date): boolean {
  if (!job.start_date) return false;
  const start = new Date(job.start_date);
  const end = job.estimated_end_date ? new Date(job.estimated_end_date) : start;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return d >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
         d <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const supabase = createClient();
  const router = useRouter();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_cards")
      .select("*")
      .not("start_date", "is", null)
      .order("start_date");
    if (!error && data) setJobs(data as JobCard[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const openJob = (job: JobCard) => router.push(`/dashboard/jobs/${job.id}`);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/jobs" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ivs-text">Job Calendar</h1>
            <p className="text-sm text-ivs-text-muted">{jobs.length} jobs with dates</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 mr-2">
            <LegendDot color="#3B82F6" label="Active" />
            <LegendDot color="#F97316" label="Pending" />
            <LegendDot color="#10B981" label="Completed" />
          </div>

          {/* View Toggle */}
          <div className="flex bg-ivs-bg-light border border-ivs-border rounded-lg p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                  view === v ? "bg-ivs-accent text-white" : "text-ivs-text-muted hover:text-ivs-text"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)} className="p-1.5 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-medium text-ivs-text-muted hover:text-ivs-text border border-ivs-border rounded-lg transition-colors">
              Today
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === "month" ? (
        <MonthView currentDate={currentDate} jobs={jobs} onClickJob={openJob} />
      ) : view === "week" ? (
        <WeekView currentDate={currentDate} jobs={jobs} onClickJob={openJob} />
      ) : (
        <DayView currentDate={currentDate} jobs={jobs} onClickJob={openJob} />
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs text-ivs-text-muted">{label}</span>
    </div>
  );
}

// ── Month View ──

function MonthView({ currentDate, jobs, onClickJob }: { currentDate: Date; jobs: JobCard[]; onClickJob: (j: JobCard) => void }) {
  const { weeks } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const start = startOfWeek(firstDay);
    const weeks: Date[][] = [];
    let current = new Date(start);
    while (current <= lastDay || weeks.length < 5) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) { week.push(new Date(current)); current = addDays(current, 1); }
      weeks.push(week);
      if (weeks.length >= 6) break;
    }
    return { weeks };
  }, [currentDate]);

  const today = new Date();
  const month = currentDate.getMonth();

  return (
    <div className="flex-1 flex flex-col">
      <h2 className="text-lg font-semibold text-ivs-text mb-3">
        {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
      </h2>
      <div className="grid grid-cols-7 gap-px mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-xs font-medium text-ivs-text-muted text-center py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-ivs-border flex-1 rounded-lg overflow-hidden border border-ivs-border">
        {weeks.flat().map((date, i) => {
          const isCurrentMonth = date.getMonth() === month;
          const isToday = isSameDay(date, today);
          const dayJobs = jobs.filter((j) => jobSpansDate(j, date));
          return (
            <div key={i} className={`min-h-[80px] p-1 ${isCurrentMonth ? "bg-ivs-bg-light" : "bg-ivs-bg"}`}>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mb-1 ${
                isToday ? "bg-ivs-accent text-white font-bold" : isCurrentMonth ? "text-ivs-text" : "text-ivs-text-muted/40"
              }`}>{date.getDate()}</span>
              <div className="space-y-0.5">
                {dayJobs.slice(0, 3).map((job) => (
                  <button
                    key={job.id}
                    onClick={() => onClickJob(job)}
                    className="w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate text-white font-medium hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: JOB_COLORS[job.status] }}
                    title={`${job.job_number} — ${job.project_name}`}
                  >
                    {job.job_number}
                  </button>
                ))}
                {dayJobs.length > 3 && <div className="text-[10px] text-ivs-text-muted px-1">+{dayJobs.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ──

function WeekView({ currentDate, jobs, onClickJob }: { currentDate: Date; jobs: JobCard[]; onClickJob: (j: JobCard) => void }) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="flex-1 flex flex-col">
      <h2 className="text-lg font-semibold text-ivs-text mb-3">
        {weekStart.toLocaleDateString("default", { month: "short", day: "numeric" })} —{" "}
        {addDays(weekStart, 6).toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}
      </h2>
      <div className="grid grid-cols-7 gap-2 flex-1">
        {days.map((date, i) => {
          const isToday = isSameDay(date, today);
          const dayJobs = jobs.filter((j) => jobSpansDate(j, date));
          return (
            <div key={i} className={`bg-ivs-bg-light border rounded-xl p-3 ${isToday ? "border-ivs-accent" : "border-ivs-border"}`}>
              <div className="text-center mb-3">
                <p className="text-xs text-ivs-text-muted">{date.toLocaleDateString("default", { weekday: "short" })}</p>
                <p className={`text-lg font-bold ${isToday ? "text-ivs-accent" : "text-ivs-text"}`}>{date.getDate()}</p>
              </div>
              <div className="space-y-1.5">
                {dayJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => onClickJob(job)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded-lg text-white font-medium hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: JOB_COLORS[job.status] }}
                    title={job.project_name}
                  >
                    <p className="font-mono text-[10px] opacity-80">{job.job_number}</p>
                    <p className="truncate">{job.project_name}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day View ──

function DayView({ currentDate, jobs, onClickJob }: { currentDate: Date; jobs: JobCard[]; onClickJob: (j: JobCard) => void }) {
  const dayJobs = jobs.filter((j) => jobSpansDate(j, currentDate));

  return (
    <div className="flex-1">
      <h2 className="text-lg font-semibold text-ivs-text mb-3">
        {currentDate.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </h2>
      {dayJobs.length === 0 ? (
        <div className="text-center py-20 text-ivs-text-muted">No jobs scheduled for this day</div>
      ) : (
        <div className="space-y-3">
          {dayJobs.map((job) => (
            <button
              key={job.id}
              onClick={() => onClickJob(job)}
              className="w-full text-left flex items-center gap-4 bg-ivs-bg-card border border-ivs-border rounded-xl p-4 hover:border-ivs-accent/30 transition-colors"
            >
              <div className="w-1.5 h-14 rounded-full flex-shrink-0" style={{ backgroundColor: JOB_COLORS[job.status] }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-ivs-accent">{job.job_number}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: JOB_COLORS[job.status] }}>
                    {job.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-ivs-text truncate">{job.project_name}</h3>
                <p className="text-xs text-ivs-text-muted">{job.client_name}</p>
              </div>
              <div className="text-right text-xs text-ivs-text-muted">
                {job.location && <p>{job.location}</p>}
                {job.contract_value && <p className="font-medium">${job.contract_value.toLocaleString()}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
