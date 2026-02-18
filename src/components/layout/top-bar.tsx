"use client";

import { useAuth } from "@/contexts/auth-context";
import { ROLES } from "@/lib/roles";
import { Bell, Search } from "lucide-react";

export function TopBar() {
  const { employee, role } = useAuth();

  return (
    <header className="h-16 bg-ivs-bg-light border-b border-ivs-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-2 bg-ivs-bg border border-ivs-border rounded-lg px-3 py-2 w-80">
        <Search size={16} className="text-ivs-text-muted" />
        <input
          type="text"
          placeholder="Search jobs, bids, employees..."
          className="bg-transparent text-sm text-ivs-text placeholder-ivs-text-muted outline-none w-full"
        />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-ivs-text-muted hover:bg-ivs-bg hover:text-ivs-text transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-ivs-accent rounded-full" />
        </button>

        {/* User Badge */}
        {employee && role && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-ivs-accent/20 flex items-center justify-center text-ivs-accent text-sm font-bold">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-ivs-text leading-tight">
                {employee.first_name} {employee.last_name}
              </p>
              <p className="text-xs text-ivs-text-muted leading-tight">
                {ROLES[role].label}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
