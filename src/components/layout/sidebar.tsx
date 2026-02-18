"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { hasModuleAccess, type AppModule } from "@/lib/roles";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Clock,
  HardHat,
  BarChart3,
  DollarSign,
  Wrench,
  ClipboardList,
  Settings,
  LogOut,
  Droplets,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  module: AppModule;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} />, module: "dashboard" },
  { label: "Bids", href: "/dashboard/bids", icon: <FileText size={20} />, module: "bids" },
  { label: "Jobs", href: "/dashboard/jobs", icon: <Briefcase size={20} />, module: "jobs" },
  { label: "Timesheets", href: "/dashboard/timesheets", icon: <Clock size={20} />, module: "timesheets" },
  { label: "Field App", href: "/dashboard/field", icon: <HardHat size={20} />, module: "field_app" },
  { label: "Production", href: "/dashboard/production", icon: <BarChart3 size={20} />, module: "production" },
  { label: "Invoicing", href: "/dashboard/invoicing", icon: <DollarSign size={20} />, module: "invoicing" },
  { label: "Equipment", href: "/dashboard/equipment", icon: <Wrench size={20} />, module: "equipment" },
  { label: "Reports", href: "/dashboard/reports", icon: <ClipboardList size={20} />, module: "reports" },
  { label: "Admin", href: "/dashboard/admin", icon: <Settings size={20} />, module: "admin" },
];

export function Sidebar() {
  const { employee, role, signOut } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = NAV_ITEMS.filter((item) => hasModuleAccess(role, item.module));

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } h-screen bg-ivs-sidebar border-r border-ivs-border flex flex-col transition-all duration-200`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-ivs-border">
        <div className="flex-shrink-0 w-8 h-8 bg-ivs-accent/20 rounded-lg flex items-center justify-center">
          <Droplets size={18} className="text-ivs-accent" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-ivs-text leading-tight">IVS Group</p>
            <p className="text-xs text-ivs-text-muted leading-tight">Hydrodemolition</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-ivs-accent/15 text-ivs-accent"
                  : "text-ivs-text-muted hover:bg-ivs-bg-light hover:text-ivs-text"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User / Footer */}
      <div className="border-t border-ivs-border p-3">
        {!collapsed && employee && (
          <div className="px-2 mb-3">
            <p className="text-sm font-medium text-ivs-text truncate">
              {employee.first_name} {employee.last_name}
            </p>
            <p className="text-xs text-ivs-text-muted truncate">{employee.title ?? employee.role}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={signOut}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ivs-text-muted hover:bg-ivs-bg-light hover:text-ivs-danger transition-colors ${
              collapsed ? "justify-center w-full" : ""
            }`}
            title="Sign Out"
          >
            <LogOut size={18} />
            {!collapsed && <span>Sign Out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-2 rounded-lg text-ivs-text-muted hover:bg-ivs-bg-light transition-colors"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
