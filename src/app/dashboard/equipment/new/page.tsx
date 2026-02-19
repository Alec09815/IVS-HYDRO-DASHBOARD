"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EquipmentStatus } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Wrench, Save } from "lucide-react";

interface EquipmentFormData {
  asset_number: string;
  name: string;
  category: string;
  make: string;
  model: string;
  serial_number: string;
  year: number | null;
  status: EquipmentStatus;
  hour_meter_reading: number | null;
  last_service_date: string;
  next_service_date: string;
  notes: string;
}

const INITIAL: EquipmentFormData = {
  asset_number: "",
  name: "",
  category: "",
  make: "",
  model: "",
  serial_number: "",
  year: null,
  status: "available",
  hour_meter_reading: null,
  last_service_date: "",
  next_service_date: "",
  notes: "",
};

const CATEGORIES = [
  "Pump Unit", "Robot", "Hose", "Nozzle Assembly", "Power Pack",
  "Water Trailer", "Containment", "Vacuum Truck", "Support Vehicle",
  "Safety Equipment", "Other",
];

export default function NewEquipmentPage() {
  const router = useRouter();
  const [form, setForm] = useState<EquipmentFormData>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const update = <K extends keyof EquipmentFormData>(key: K, value: EquipmentFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.asset_number || !form.name || !form.category) {
      setError("Asset Number, Name, and Category are required.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      asset_number: form.asset_number,
      name: form.name,
      category: form.category,
      make: form.make || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      year: form.year || null,
      status: form.status,
      hour_meter_reading: form.hour_meter_reading || null,
      last_service_date: form.last_service_date || null,
      next_service_date: form.next_service_date || null,
      notes: form.notes || null,
    };

    const { error: dbErr } = await supabase.from("equipment").insert(payload);
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    router.push("/dashboard/equipment");
  };

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/equipment" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ivs-text flex items-center gap-2">
            <Wrench size={24} className="text-ivs-accent" /> Add Equipment
          </h1>
          <p className="text-sm text-ivs-text-muted mt-1">Register a new piece of equipment to the fleet</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Identity */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Equipment Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Asset Number *</label>
            <input type="text" value={form.asset_number} onChange={(e) => update("asset_number", e.target.value)} placeholder="e.g., EQ-001" className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Name *</label>
            <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g., 20K Pump Unit #1" className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Category *</label>
            <select value={form.category} onChange={(e) => update("category", e.target.value)} className={inputCls} required>
              <option value="">Select category...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select value={form.status} onChange={(e) => update("status", e.target.value as EquipmentStatus)} className={inputCls}>
              <option value="available">Available</option>
              <option value="deployed">Deployed</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Specifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Make</label>
            <input type="text" value={form.make} onChange={(e) => update("make", e.target.value)} placeholder="e.g., Jetstream" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Model</label>
            <input type="text" value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="e.g., X4200" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Serial Number</label>
            <input type="text" value={form.serial_number} onChange={(e) => update("serial_number", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <input type="number" value={form.year ?? ""} onChange={(e) => update("year", e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g., 2024" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Service */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Service & Maintenance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Hour Meter Reading</label>
            <input type="number" step="0.1" value={form.hour_meter_reading ?? ""} onChange={(e) => update("hour_meter_reading", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Last Service Date</label>
            <input type="date" value={form.last_service_date} onChange={(e) => update("last_service_date", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Next Service Date</label>
            <input type="date" value={form.next_service_date} onChange={(e) => update("next_service_date", e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Notes</h3>
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          placeholder="Condition notes, accessories, special instructions..."
          className={inputCls}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-8">
        <Link href="/dashboard/equipment" className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Adding..." : "Add Equipment"}
        </button>
      </div>
    </div>
  );
}
