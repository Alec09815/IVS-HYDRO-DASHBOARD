"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/contexts/toast-context";
import type { Equipment, EquipmentStatus } from "@/lib/types";
import Link from "next/link";
import {
  ArrowLeft, Wrench, Calendar, Hash, Settings2,
  AlertCircle, Save, Trash2, Pencil,
} from "lucide-react";

const STATUS_BADGE: Record<EquipmentStatus, { bg: string; text: string; label: string }> = {
  available: { bg: "bg-emerald-500/15", text: "text-emerald-500", label: "Available" },
  deployed: { bg: "bg-blue-500/15", text: "text-blue-500", label: "Deployed" },
  maintenance: { bg: "bg-orange-500/15", text: "text-orange-500", label: "Maintenance" },
  retired: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Retired" },
};

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [eq, setEq] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [form, setForm] = useState<Partial<Equipment>>({});
  const supabase = createClient();

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("equipment").select("*").eq("id", id).single();
    if (data) {
      const item = data as Equipment;
      setEq(item);
      setForm(item);
    }
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  const update = <K extends keyof Equipment>(key: K, value: Equipment[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!eq) return;
    setSaving(true);
    const updates = {
      name: form.name || eq.name,
      category: form.category || eq.category,
      make: form.make || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      year: form.year || null,
      status: form.status || eq.status,
      hour_meter_reading: form.hour_meter_reading ?? null,
      next_service_date: form.next_service_date || null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("equipment").update(updates).eq("id", eq.id);
    if (error) { showError(error.message); setSaving(false); return; }
    setEq({ ...eq, ...updates } as Equipment);
    setEditing(false);
    setSaving(false);
    success("Equipment updated");
  };

  const handleDelete = async () => {
    if (!eq) return;
    await supabase.from("equipment").delete().eq("id", eq.id);
    success("Equipment deleted");
    router.push("/dashboard/equipment");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!eq) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto mb-3 text-ivs-danger" size={32} />
        <p className="text-ivs-text">Equipment not found</p>
        <Link href="/dashboard/equipment" className="text-sm text-ivs-accent hover:underline mt-2 inline-block">
          Back to Equipment
        </Link>
      </div>
    );
  }

  const badge = STATUS_BADGE[eq.status];
  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/equipment" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ivs-text">{eq.name}</h1>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-sm text-ivs-text-muted mt-1 font-mono">{eq.asset_number}</p>
          </div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors">
            <Pencil size={14} /> Edit
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard icon={<Hash size={16} />} label="Category" value={eq.category} />
        <InfoCard icon={<Settings2 size={16} />} label="Make / Model" value={[eq.make, eq.model].filter(Boolean).join(" ") || "—"} />
        <InfoCard icon={<Wrench size={16} />} label="Hour Meter" value={eq.hour_meter_reading ? `${eq.hour_meter_reading.toLocaleString()} hrs` : "—"} />
        <InfoCard icon={<Calendar size={16} />} label="Next Service" value={eq.next_service_date ? new Date(eq.next_service_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
      </div>

      {editing ? (
        /* ── Edit Form ── */
        <>
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Equipment Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input type="text" value={form.name || ""} onChange={(e) => update("name", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Category *</label>
                <input type="text" value={form.category || ""} onChange={(e) => update("category", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Make</label>
                <input type="text" value={form.make || ""} onChange={(e) => update("make", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Model</label>
                <input type="text" value={form.model || ""} onChange={(e) => update("model", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Serial Number</label>
                <input type="text" value={form.serial_number || ""} onChange={(e) => update("serial_number", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Year</label>
                <input type="number" value={form.year ?? ""} onChange={(e) => update("year", e.target.value ? parseInt(e.target.value) : null)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Status & Maintenance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status || eq.status} onChange={(e) => update("status", e.target.value as EquipmentStatus)} className={inputCls}>
                  <option value="available">Available</option>
                  <option value="deployed">Deployed</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Hour Meter Reading</label>
                <input type="number" step="0.1" value={form.hour_meter_reading ?? ""} onChange={(e) => update("hour_meter_reading", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Next Service Date</label>
                <input type="date" value={form.next_service_date || ""} onChange={(e) => update("next_service_date", e.target.value || null)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Notes</h3>
            <textarea value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} rows={3} className={inputCls} />
          </div>

          {/* Edit Actions */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors">
              <Trash2 size={16} /> Delete Equipment
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => { setEditing(false); setForm(eq); }} className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      ) : (
        /* ── Read-Only View ── */
        <>
          {/* Specifications */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-ivs-text mb-4 flex items-center gap-2">
              <Settings2 size={16} className="text-ivs-accent" /> Specifications
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-ivs-text-muted text-xs">Serial Number</p>
                <p className="text-ivs-text font-mono">{eq.serial_number || "—"}</p>
              </div>
              <div>
                <p className="text-ivs-text-muted text-xs">Year</p>
                <p className="text-ivs-text">{eq.year || "—"}</p>
              </div>
              <div>
                <p className="text-ivs-text-muted text-xs">Last Service</p>
                <p className="text-ivs-text">{eq.last_service_date ? new Date(eq.last_service_date).toLocaleDateString() : "—"}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {eq.notes && (
            <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-ivs-text mb-2">Notes</h3>
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{eq.notes}</p>
            </div>
          )}

          {/* Delete */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors">
              <Trash2 size={16} /> Delete Equipment
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-ivs-text mb-2">Delete Equipment?</h2>
            <p className="text-sm text-ivs-text-muted mb-6">
              This will permanently delete <strong className="text-ivs-text">{eq.name}</strong> ({eq.asset_number}). This action cannot be undone.
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

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-ivs-text-muted mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-semibold text-ivs-text">{value}</p>
    </div>
  );
}
