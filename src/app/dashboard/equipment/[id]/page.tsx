"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Equipment, EquipmentStatus } from "@/lib/types";
import Link from "next/link";
import {
  ArrowLeft, Wrench, Calendar, Hash, Settings2,
  AlertCircle, Save,
} from "lucide-react";

const STATUS_BADGE: Record<EquipmentStatus, { bg: string; text: string; label: string }> = {
  available: { bg: "bg-emerald-500/15", text: "text-emerald-500", label: "Available" },
  deployed: { bg: "bg-blue-500/15", text: "text-blue-500", label: "Deployed" },
  maintenance: { bg: "bg-orange-500/15", text: "text-orange-500", label: "Maintenance" },
  retired: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Retired" },
};

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [eq, setEq] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editStatus, setEditStatus] = useState<EquipmentStatus | "">("");
  const [editHours, setEditHours] = useState("");
  const [editNextService, setEditNextService] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const supabase = createClient();

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("equipment").select("*").eq("id", id).single();
    if (data) {
      const item = data as Equipment;
      setEq(item);
      setEditStatus(item.status);
      setEditHours(item.hour_meter_reading?.toString() ?? "");
      setEditNextService(item.next_service_date ?? "");
      setEditNotes(item.notes ?? "");
    }
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  const handleUpdate = async () => {
    if (!eq) return;
    setSaving(true);
    const updates: Record<string, unknown> = {};
    if (editStatus && editStatus !== eq.status) updates.status = editStatus;
    if (editHours !== (eq.hour_meter_reading?.toString() ?? "")) updates.hour_meter_reading = editHours ? parseFloat(editHours) : null;
    if (editNextService !== (eq.next_service_date ?? "")) updates.next_service_date = editNextService || null;
    if (editNotes !== (eq.notes ?? "")) updates.notes = editNotes || null;

    if (Object.keys(updates).length > 0) {
      await supabase.from("equipment").update(updates).eq("id", eq.id);
      setEq({ ...eq, ...updates } as Equipment);
    }
    setSaving(false);
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard icon={<Hash size={16} />} label="Category" value={eq.category} />
        <InfoCard icon={<Settings2 size={16} />} label="Make / Model" value={[eq.make, eq.model].filter(Boolean).join(" ") || "—"} />
        <InfoCard icon={<Wrench size={16} />} label="Hour Meter" value={eq.hour_meter_reading ? `${eq.hour_meter_reading.toLocaleString()} hrs` : "—"} />
        <InfoCard icon={<Calendar size={16} />} label="Next Service" value={eq.next_service_date ? new Date(eq.next_service_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
      </div>

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

      {/* Quick Update */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text flex items-center gap-2">
          <Wrench size={16} className="text-ivs-accent" /> Quick Update
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ivs-text-muted mb-1">Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as EquipmentStatus)}
              className="w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm focus:outline-none focus:ring-2 focus:ring-ivs-accent"
            >
              <option value="available">Available</option>
              <option value="deployed">Deployed</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ivs-text-muted mb-1">Hour Meter</label>
            <input
              type="number"
              step="0.1"
              value={editHours}
              onChange={(e) => setEditHours(e.target.value)}
              className="w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm focus:outline-none focus:ring-2 focus:ring-ivs-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ivs-text-muted mb-1">Next Service Date</label>
            <input
              type="date"
              value={editNextService}
              onChange={(e) => setEditNextService(e.target.value)}
              className="w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm focus:outline-none focus:ring-2 focus:ring-ivs-accent"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ivs-text-muted mb-1">Notes</label>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm focus:outline-none focus:ring-2 focus:ring-ivs-accent"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Notes */}
      {eq.notes && (
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-ivs-text mb-2">Current Notes</h3>
          <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{eq.notes}</p>
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
