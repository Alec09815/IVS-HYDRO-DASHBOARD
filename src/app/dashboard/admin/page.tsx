"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/lib/types";
import { ROLES, type UserRole } from "@/lib/roles";
import { Settings, Users, Shield, Database } from "lucide-react";

export default function AdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("employees").select("*").order("last_name");
    if (data) setEmployees(data as Employee[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const roleCounts = employees.reduce<Record<string, number>>((acc, e) => {
    acc[e.role] = (acc[e.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ivs-text">Admin</h1>
        <p className="text-sm text-ivs-text-muted mt-1">User management, roles, and system settings</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-ivs-text-muted mb-2"><Users size={16} /><span className="text-xs font-medium uppercase tracking-wide">Total Users</span></div>
          <p className="text-2xl font-bold text-ivs-text">{employees.length}</p>
          <p className="text-xs text-ivs-text-muted mt-1">{employees.filter((e) => e.is_active).length} active</p>
        </div>
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-ivs-text-muted mb-2"><Shield size={16} /><span className="text-xs font-medium uppercase tracking-wide">Roles</span></div>
          <p className="text-2xl font-bold text-ivs-text">{Object.keys(roleCounts).length}</p>
          <p className="text-xs text-ivs-text-muted mt-1">of {Object.keys(ROLES).length} configured</p>
        </div>
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-ivs-text-muted mb-2"><Database size={16} /><span className="text-xs font-medium uppercase tracking-wide">Database</span></div>
          <p className="text-2xl font-bold text-ivs-text">13</p>
          <p className="text-xs text-ivs-text-muted mt-1">tables with RLS</p>
        </div>
      </div>

      {/* Roles Breakdown */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-ivs-text mb-4 flex items-center gap-2">
          <Shield size={16} className="text-ivs-accent" /> Roles &amp; Permissions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(ROLES).map(([key, config]) => (
            <div key={key} className="bg-ivs-bg rounded-lg border border-ivs-border p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-ivs-text">{config.label}</span>
                <span className="text-xs text-ivs-accent font-mono">{roleCounts[key] || 0}</span>
              </div>
              <p className="text-xs text-ivs-text-muted">{config.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* User List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-ivs-border">
            <h3 className="text-sm font-semibold text-ivs-text flex items-center gap-2">
              <Users size={16} className="text-ivs-accent" /> All Users
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivs-border text-xs text-ivs-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const roleConfig = ROLES[emp.role as UserRole];
                return (
                  <tr key={emp.id} className="border-b border-ivs-border/50 hover:bg-ivs-bg-light/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ivs-accent/20 flex items-center justify-center text-ivs-accent text-xs font-bold">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ivs-text">{emp.first_name} {emp.last_name}</p>
                          {emp.title && <p className="text-xs text-ivs-text-muted">{emp.title}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ivs-text-muted">{emp.email}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-ivs-bg border border-ivs-border text-ivs-text-muted">{roleConfig?.label ?? emp.role}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${emp.is_active ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}>
                        {emp.is_active ? "Active" : "Inactive"}
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
