"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/lib/types";
import { ROLES, type UserRole } from "@/lib/roles";
import { Users, Shield, Database, Plus, X, Pencil, Save, Search } from "lucide-react";

export default function AdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const filtered = employees.filter((e) => {
    const text = `${e.first_name} ${e.last_name} ${e.email} ${e.role}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ivs-text">Admin</h1>
          <p className="text-sm text-ivs-text-muted mt-1">User management, roles, and system settings</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Add User
        </button>
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

      {/* Search */}
      <div className="flex items-center gap-2 bg-ivs-bg-card border border-ivs-border rounded-lg px-3 py-2 max-w-sm">
        <Search size={16} className="text-ivs-text-muted" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="bg-transparent text-sm text-ivs-text placeholder-ivs-text-muted outline-none w-full" />
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
              <Users size={16} className="text-ivs-accent" /> All Users ({filtered.length})
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivs-border text-xs text-ivs-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp) => {
                const roleConfig = ROLES[emp.role as UserRole];
                return editingId === emp.id ? (
                  <EditRow key={emp.id} employee={emp} roles={ROLES} onCancel={() => setEditingId(null)} onSave={() => { setEditingId(null); fetchData(); }} />
                ) : (
                  <tr key={emp.id} className="border-b border-ivs-border/50 hover:bg-ivs-bg-light/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-ivs-accent/20 flex items-center justify-center text-ivs-accent text-xs font-bold">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ivs-text">{emp.first_name} {emp.last_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ivs-text-muted">{emp.email}</td>
                    <td className="px-4 py-3 text-xs text-ivs-text-muted">{emp.title || "—"}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-ivs-bg border border-ivs-border text-ivs-text-muted">{roleConfig?.label ?? emp.role}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${emp.is_active ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}>
                        {emp.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setEditingId(emp.id)} className="p-1.5 text-ivs-text-muted hover:text-ivs-accent hover:bg-ivs-accent/10 rounded-lg transition-colors">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onCreated={() => { setShowInvite(false); fetchData(); }} />
      )}
    </div>
  );
}

/* ── Inline Edit Row ── */

function EditRow({ employee, roles, onCancel, onSave }: { employee: Employee; roles: typeof ROLES; onCancel: () => void; onSave: () => void }) {
  const [role, setRole] = useState(employee.role);
  const [title, setTitle] = useState(employee.title || "");
  const [isActive, setIsActive] = useState(employee.is_active);
  const [hourlyRate, setHourlyRate] = useState(employee.hourly_rate?.toString() || "");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("employees").update({
      role,
      title: title || null,
      is_active: isActive,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
    }).eq("id", employee.id);
    setSaving(false);
    onSave();
  };

  const smallInput = "px-2 py-1.5 bg-ivs-bg border border-ivs-border rounded text-ivs-text text-xs focus:outline-none focus:ring-1 focus:ring-ivs-accent";

  return (
    <tr className="border-b border-ivs-border/50 bg-ivs-accent/5">
      <td className="px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-ivs-accent/20 flex items-center justify-center text-ivs-accent text-xs font-bold">
            {employee.first_name[0]}{employee.last_name[0]}
          </div>
          <p className="text-sm font-medium text-ivs-text">{employee.first_name} {employee.last_name}</p>
        </div>
      </td>
      <td className="px-4 py-2 text-sm text-ivs-text-muted">{employee.email}</td>
      <td className="px-4 py-2">
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title..." className={`w-full ${smallInput}`} />
      </td>
      <td className="px-4 py-2">
        <select value={role} onChange={(e) => setRole(e.target.value)} className={`w-full ${smallInput}`}>
          {Object.entries(roles).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2 text-center">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${isActive ? "bg-emerald-500/15 text-emerald-500 hover:bg-red-500/15 hover:text-red-500" : "bg-red-500/15 text-red-500 hover:bg-emerald-500/15 hover:text-emerald-500"}`}
        >
          {isActive ? "Active" : "Inactive"}
        </button>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-center gap-1">
          <button onClick={onCancel} className="p-1.5 text-ivs-text-muted hover:text-ivs-text rounded transition-colors">
            <X size={14} />
          </button>
          <button onClick={handleSave} disabled={saving} className="p-1.5 text-ivs-accent hover:bg-ivs-accent/10 rounded transition-colors disabled:opacity-50">
            <Save size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Invite Modal ── */

function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("lead_operator");
  const [title, setTitle] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  const handleSubmit = async () => {
    if (!firstName || !lastName || !email) {
      setError("First name, last name, and email are required.");
      return;
    }
    setSaving(true);
    setError("");

    const { error: dbErr } = await supabase.from("employees").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      role,
      title: title || null,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      is_active: true,
    });

    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ivs-text">Add New User</h2>
          <button onClick={onClose} className="p-1 text-ivs-text-muted hover:text-ivs-text">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>First Name *</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Last Name *</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@ivs.com" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Role *</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
              {Object.entries(ROLES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Job Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Lead Operator" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Hourly Rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ivs-text-muted text-sm">$</span>
              <input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="0.00" className={`${inputCls} pl-7`} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add User"}
          </button>
        </div>
      </div>
    </div>
  );
}
