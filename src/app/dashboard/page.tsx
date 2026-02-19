"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { hasModuleAccess, type AppModule } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  Briefcase,
  Clock,
  HardHat,
  BarChart3,
  DollarSign,
  Wrench,
  ClipboardList,
  Settings,
  TrendingUp,
  Users,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";

interface ModuleTile {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  module: AppModule;
  color: string;
}

const MODULE_TILES: ModuleTile[] = [
  {
    label: "Bids & Estimates",
    description: "Manage proposals and bid tracking",
    href: "/dashboard/bids",
    icon: <FileText size={28} />,
    module: "bids",
    color: "from-blue-500/20 to-blue-600/5",
  },
  {
    label: "Job Cards",
    description: "Active projects and job management",
    href: "/dashboard/jobs",
    icon: <Briefcase size={28} />,
    module: "jobs",
    color: "from-emerald-500/20 to-emerald-600/5",
  },
  {
    label: "Timesheets",
    description: "Time tracking and approvals",
    href: "/dashboard/timesheets",
    icon: <Clock size={28} />,
    module: "timesheets",
    color: "from-purple-500/20 to-purple-600/5",
  },
  {
    label: "Field App",
    description: "Calibration and daily forms",
    href: "/dashboard/field",
    icon: <HardHat size={28} />,
    module: "field_app",
    color: "from-orange-500/20 to-orange-600/5",
  },
  {
    label: "Production",
    description: "Production tracking and reports",
    href: "/dashboard/production",
    icon: <BarChart3 size={28} />,
    module: "production",
    color: "from-cyan-500/20 to-cyan-600/5",
  },
  {
    label: "Invoicing",
    description: "Billing and payment tracking",
    href: "/dashboard/invoicing",
    icon: <DollarSign size={28} />,
    module: "invoicing",
    color: "from-green-500/20 to-green-600/5",
  },
  {
    label: "Equipment",
    description: "Fleet and maintenance management",
    href: "/dashboard/equipment",
    icon: <Wrench size={28} />,
    module: "equipment",
    color: "from-amber-500/20 to-amber-600/5",
  },
  {
    label: "Reports",
    description: "Weekly reports and analytics",
    href: "/dashboard/reports",
    icon: <ClipboardList size={28} />,
    module: "reports",
    color: "from-indigo-500/20 to-indigo-600/5",
  },
  {
    label: "Admin",
    description: "Users, roles, and settings",
    href: "/dashboard/admin",
    icon: <Settings size={28} />,
    module: "admin",
    color: "from-red-500/20 to-red-600/5",
  },
];

interface DashboardStats {
  activeJobs: number;
  openBids: number;
  pipelineValue: number;
  crewOnSite: number;
  crewJobCount: number;
  pendingTimesheets: number;
  pendingCOs: number;
}

interface JobStatusCount { status: string; count: number }
interface BidStatusCount { status: string; count: number }
interface RevenuePoint { month: string; invoiced: number; paid: number }

const JOB_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  mobilizing: "#3B82F6",
  active: "#10B981",
  on_hold: "#F97316",
  complete: "#9CA3AF",
  closed: "#6B7280",
};

const BID_COLORS: Record<string, string> = {
  draft: "#F59E0B",
  submitted: "#3B82F6",
  won: "#10B981",
  lost: "#EF4444",
  cancelled: "#6B7280",
};

export default function DashboardPage() {
  const { employee, role, loading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobsByStatus, setJobsByStatus] = useState<JobStatusCount[]>([]);
  const [bidsByStatus, setBidsByStatus] = useState<BidStatusCount[]>([]);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const supabase = createClient();

  const fetchStats = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const [jobsRes, bidsRes, manUpRes, tsRes, coRes] = await Promise.all([
      supabase.from("job_cards").select("id", { count: "exact", head: true }).in("status", ["active", "mobilizing"]),
      supabase.from("bids").select("estimated_value").in("status", ["draft", "submitted"]),
      supabase.from("man_up_reports").select("crew_members, job_card_id").eq("report_date", today),
      supabase.from("timesheets").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      supabase.from("change_orders").select("id", { count: "exact", head: true }).eq("status", "submitted"),
    ]);

    const bids = bidsRes.data ?? [];
    const manUps = manUpRes.data ?? [];
    const totalCrew = manUps.reduce((sum, r) => {
      const members = Array.isArray(r.crew_members) ? r.crew_members : [];
      return sum + members.length;
    }, 0);
    const uniqueJobs = new Set(manUps.map((r) => r.job_card_id)).size;

    setStats({
      activeJobs: jobsRes.count ?? 0,
      openBids: bids.length,
      pipelineValue: bids.reduce((s, b) => s + (Number(b.estimated_value) || 0), 0),
      crewOnSite: totalCrew,
      crewJobCount: uniqueJobs,
      pendingTimesheets: tsRes.count ?? 0,
      pendingCOs: coRes.count ?? 0,
    });
  }, [supabase]);

  const fetchChartData = useCallback(async () => {
    // Jobs by status
    const { data: allJobs } = await supabase.from("job_cards").select("status");
    if (allJobs) {
      const counts: Record<string, number> = {};
      allJobs.forEach((j) => { counts[j.status] = (counts[j.status] || 0) + 1; });
      setJobsByStatus(Object.entries(counts).map(([status, count]) => ({ status, count })));
    }

    // Bids by status
    const { data: allBids } = await supabase.from("bids").select("status");
    if (allBids) {
      const counts: Record<string, number> = {};
      allBids.forEach((b) => { counts[b.status] = (counts[b.status] || 0) + 1; });
      setBidsByStatus(Object.entries(counts).map(([status, count]) => ({ status, count })));
    }

    // Revenue by month (last 6 months from invoices)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const { data: invoices } = await supabase
      .from("invoices")
      .select("amount, status, invoice_date")
      .gte("invoice_date", sixMonthsAgo.toISOString().split("T")[0])
      .in("status", ["sent", "paid"])
      .order("invoice_date");

    if (invoices) {
      const monthMap: Record<string, { invoiced: number; paid: number }> = {};
      invoices.forEach((inv) => {
        const date = new Date(inv.invoice_date);
        const key = date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (!monthMap[key]) monthMap[key] = { invoiced: 0, paid: 0 };
        monthMap[key].invoiced += Number(inv.amount) || 0;
        if (inv.status === "paid") monthMap[key].paid += Number(inv.amount) || 0;
      });
      setRevenueData(Object.entries(monthMap).map(([month, vals]) => ({ month, ...vals })));
    }
  }, [supabase]);

  useEffect(() => { fetchStats(); fetchChartData(); }, [fetchStats, fetchChartData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const visibleTiles = MODULE_TILES.filter((tile) =>
    hasModuleAccess(role, tile.module)
  );

  const pendingTotal = (stats?.pendingTimesheets ?? 0) + (stats?.pendingCOs ?? 0);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center gap-4">
        <Image
          src="/logo.png"
          alt="IVS Group Inc."
          width={48}
          height={48}
        />
        <div>
          <h1 className="text-2xl font-bold text-ivs-text">
            Welcome back, {employee?.first_name ?? "User"}
          </h1>
          <p className="text-ivs-text-muted mt-1">
            IVS Hydrodemolition Operations Dashboard
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Jobs"
          value={stats ? String(stats.activeJobs) : "—"}
          icon={<Briefcase size={20} />}
          trend={stats ? `${stats.activeJobs} mobilizing or active` : "Loading..."}
        />
        <StatCard
          label="Open Bids"
          value={stats ? String(stats.openBids) : "—"}
          icon={<TrendingUp size={20} />}
          trend={stats ? `$${stats.pipelineValue.toLocaleString()} pipeline` : "Loading..."}
        />
        <StatCard
          label="Crew On Site"
          value={stats ? String(stats.crewOnSite) : "—"}
          icon={<Users size={20} />}
          trend={stats ? `across ${stats.crewJobCount} job${stats.crewJobCount !== 1 ? "s" : ""} today` : "Loading..."}
        />
        <StatCard
          label="Pending Approvals"
          value={stats ? String(pendingTotal) : "—"}
          icon={<AlertTriangle size={20} />}
          trend={stats ? `${stats.pendingTimesheets} timesheets, ${stats.pendingCOs} COs` : "Loading..."}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Jobs by Status */}
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ivs-text mb-4">Jobs by Status</h3>
          {jobsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={jobsByStatus}>
                <XAxis dataKey="status" tick={{ fill: "#8b8fa3", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8b8fa3", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2d3e", borderRadius: "8px" }}
                  labelStyle={{ color: "#e1e4ed" }}
                  itemStyle={{ color: "#e1e4ed" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {jobsByStatus.map((entry, idx) => (
                    <Cell key={idx} fill={JOB_COLORS[entry.status] || "#3B82F6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-ivs-text-muted text-sm">No data</div>
          )}
        </div>

        {/* Bid Pipeline */}
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ivs-text mb-4">Bid Pipeline</h3>
          {bidsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={bidsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="status"
                  stroke="none"
                >
                  {bidsByStatus.map((entry, idx) => (
                    <Cell key={idx} fill={BID_COLORS[entry.status] || "#6B7280"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2d3e", borderRadius: "8px" }}
                  labelStyle={{ color: "#e1e4ed" }}
                  itemStyle={{ color: "#e1e4ed" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-ivs-text-muted text-sm">No data</div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2">
            {bidsByStatus.map((b) => (
              <div key={b.status} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BID_COLORS[b.status] || "#6B7280" }} />
                <span className="text-xs text-ivs-text-muted capitalize">{b.status} ({b.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ivs-text mb-4">Revenue (6 Mo)</h3>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: "#8b8fa3", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8b8fa3", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1d2e", border: "1px solid #2a2d3e", borderRadius: "8px" }}
                  labelStyle={{ color: "#e1e4ed" }}
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]}
                />
                <Area type="monotone" dataKey="invoiced" stroke="#3B82F6" fill="url(#invoicedGrad)" strokeWidth={2} name="Invoiced" />
                <Area type="monotone" dataKey="paid" stroke="#10B981" fill="url(#paidGrad)" strokeWidth={2} name="Paid" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-ivs-text-muted text-sm">No invoice data yet</div>
          )}
        </div>
      </div>

      {/* Module Tiles */}
      <div>
        <h2 className="text-lg font-semibold text-ivs-text mb-4">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleTiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group bg-ivs-bg-card border border-ivs-border rounded-xl p-5 hover:border-ivs-accent/40 transition-all hover:shadow-lg hover:shadow-ivs-accent/5"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tile.color} flex items-center justify-center text-ivs-text mb-3 group-hover:scale-105 transition-transform`}
              >
                {tile.icon}
              </div>
              <h3 className="text-sm font-semibold text-ivs-text group-hover:text-ivs-accent transition-colors">
                {tile.label}
              </h3>
              <p className="text-xs text-ivs-text-muted mt-1">
                {tile.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
}) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-ivs-text-muted uppercase tracking-wide">
          {label}
        </span>
        <span className="text-ivs-text-muted">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-ivs-text">{value}</p>
      <p className="text-xs text-ivs-text-muted mt-1">{trend}</p>
    </div>
  );
}
