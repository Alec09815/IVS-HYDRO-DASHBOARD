"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Users, Phone, Mail, Search } from "lucide-react";
import { ROLES, type UserRole } from "@/lib/roles";

interface EmployeeWithAvailability extends Employee {
  current_jobs: number;
}

export default function TeamPage() {
  const [employees, setEmployees] = useState<EmployeeWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const supabase = createClient();

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    const { data: empData } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true)
      .order("last_name");

    if (empData) {
      // Count current job assignments per employee
      const { data: jobData } = await supabase
        .from("job_cards")
        .select("lead_operator_id, project_manager_id, crew_assigned")
        .in("status", ["active", "mobilizing"]);

      const jobCounts: Record<string, number> = {};
      jobData?.forEach((job) => {
        if (job.lead_operator_id) jobCounts[job.lead_operator_id] = (jobCounts[job.lead_operator_id] || 0) + 1;
        if (job.project_manager_id) jobCounts[job.project_manager_id] = (jobCounts[job.project_manager_id] || 0) + 1;
        const crew = (job.crew_assigned as { employee_id: string }[] | null) ?? [];
        crew.forEach((c) => {
          if (c.employee_id) jobCounts[c.employee_id] = (jobCounts[c.employee_id] || 0) + 1;
        });
      });

      setEmployees(
        empData.map((e) => ({ ...e, current_jobs: jobCounts[e.id] || 0 })) as EmployeeWithAvailability[]
      );
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const filtered = employees.filter((e) => {
    const matchesSearch =
      `${e.first_name} ${e.last_name} ${e.email} ${e.title || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || e.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const availableCount = filtered.filter((e) => e.current_jobs === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/jobs" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ivs-text">Team</h1>
            <p className="text-sm text-ivs-text-muted">
              {employees.length} employees &middot; {availableCount} available
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-ivs-bg-card border border-ivs-border rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search size={16} className="text-ivs-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="bg-transparent text-sm text-ivs-text placeholder-ivs-text-muted outline-none w-full"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-ivs-bg-card border border-ivs-border rounded-lg text-ivs-text text-sm focus:outline-none focus:ring-2 focus:ring-ivs-accent"
        >
          <option value="all">All Roles</option>
          {Object.entries(ROLES).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {/* Roster */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-ivs-bg-card border border-ivs-border rounded-xl">
          <Users className="mx-auto mb-3 text-ivs-text-muted" size={32} />
          <p className="text-ivs-text-muted">No employees found</p>
        </div>
      ) : (
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivs-border text-xs text-ivs-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-center">Active Jobs</th>
                <th className="px-4 py-3 text-center">Availability</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => {
                const roleConfig = ROLES[emp.role as UserRole];
                const isAvailable = emp.current_jobs === 0;
                return (
                  <tr key={emp.id} className="border-b border-ivs-border/50 hover:bg-ivs-bg-light/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ivs-accent/20 flex items-center justify-center text-ivs-accent text-xs font-bold flex-shrink-0">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ivs-text">{emp.first_name} {emp.last_name}</p>
                          {emp.title && <p className="text-xs text-ivs-text-muted">{emp.title}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-ivs-bg border border-ivs-border text-ivs-text-muted">
                        {roleConfig?.label ?? emp.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-ivs-text-muted">
                          <Mail size={11} />
                          <span>{emp.email}</span>
                        </div>
                        {emp.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-ivs-text-muted">
                            <Phone size={11} />
                            <span>{emp.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-ivs-text">
                      {emp.current_jobs}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        isAvailable
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-yellow-500/15 text-yellow-500"
                      }`}>
                        {isAvailable ? "Available" : "Assigned"}
                      </span>
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
