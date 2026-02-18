"use client";

import { useAuth } from "@/contexts/auth-context";
import { hasModuleAccess, type AppModule } from "@/lib/roles";
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

export default function DashboardPage() {
  const { employee, role, loading } = useAuth();

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
          value="—"
          icon={<Briefcase size={20} />}
          trend="+2 this month"
        />
        <StatCard
          label="Open Bids"
          value="—"
          icon={<TrendingUp size={20} />}
          trend="$0 pipeline"
        />
        <StatCard
          label="Crew On Site"
          value="—"
          icon={<Users size={20} />}
          trend="across 0 jobs"
        />
        <StatCard
          label="Pending Approvals"
          value="—"
          icon={<AlertTriangle size={20} />}
          trend="timesheets & COs"
        />
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
