"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import type { JobCard, Equipment, Employee } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Gauge, Save, Send } from "lucide-react";

interface CalibrationFormData {
  job_card_id: string;
  form_date: string;
  operator_id: string;
  equipment_id: string;
  pump_pressure_psi: number | null;
  water_flow_gpm: number | null;
  nozzle_size: string;
  nozzle_count: number | null;
  stand_off_distance: string;
  traverse_speed: string;
  pass_count: number | null;
  removal_depth: string;
  surface_profile: string;
  notes: string;
}

const INITIAL: CalibrationFormData = {
  job_card_id: "",
  form_date: new Date().toISOString().split("T")[0],
  operator_id: "",
  equipment_id: "",
  pump_pressure_psi: null,
  water_flow_gpm: null,
  nozzle_size: "",
  nozzle_count: null,
  stand_off_distance: "",
  traverse_speed: "",
  pass_count: null,
  removal_depth: "",
  surface_profile: "",
  notes: "",
};

const SURFACE_PROFILES = [
  "CSP 1 - Acid Etched", "CSP 2 - Grinding", "CSP 3 - Light Shotblast",
  "CSP 4 - Light Scarify", "CSP 5 - Medium Shotblast", "CSP 6 - Medium Scarify",
  "CSP 7 - Heavy Shotblast", "CSP 8 - Scabble", "CSP 9 - Heavy Scarify",
  "CSP 10 - Hydrodemolition",
];

export default function CalibrationFormPage() {
  const router = useRouter();
  const { employee } = useAuth();
  const [form, setForm] = useState<CalibrationFormData>(INITIAL);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [operators, setOperators] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const fetchLookups = useCallback(async () => {
    const [jobRes, eqRes, empRes] = await Promise.all([
      supabase.from("job_cards").select("id, job_number, project_name").in("status", ["active", "mobilizing"]).order("job_number"),
      supabase.from("equipment").select("id, asset_number, name, category").in("status", ["available", "deployed"]).order("name"),
      supabase.from("employees").select("id, first_name, last_name, role").eq("is_active", true).in("role", ["lead_operator", "admin", "pm"]).order("last_name"),
    ]);
    if (jobRes.data) setJobs(jobRes.data as JobCard[]);
    if (eqRes.data) setEquipment(eqRes.data as Equipment[]);
    if (empRes.data) setOperators(empRes.data as Employee[]);
  }, [supabase]);

  useEffect(() => {
    fetchLookups();
    if (employee) {
      setForm((prev) => ({ ...prev, operator_id: employee.id }));
    }
  }, [fetchLookups, employee]);

  const update = <K extends keyof CalibrationFormData>(key: K, value: CalibrationFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async (submit: boolean) => {
    if (!form.job_card_id || !form.operator_id) {
      setError("Job and Operator are required.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      pump_pressure_psi: form.pump_pressure_psi || null,
      water_flow_gpm: form.water_flow_gpm || null,
      nozzle_count: form.nozzle_count || null,
      pass_count: form.pass_count || null,
      equipment_id: form.equipment_id || null,
      submitted: submit,
      submitted_at: submit ? new Date().toISOString() : null,
    };

    const { error: dbErr } = await supabase.from("calibration_forms").insert(payload);
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    router.push("/dashboard/field");
  };

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/field" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ivs-text flex items-center gap-2">
            <Gauge size={24} className="text-ivs-accent" /> Calibration Form
          </h1>
          <p className="text-sm text-ivs-text-muted mt-1">Record pump calibration settings and test results</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Job & Operator */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Job & Operator</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Job *</label>
            <select value={form.job_card_id} onChange={(e) => update("job_card_id", e.target.value)} className={inputCls} required>
              <option value="">Select job...</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.job_number} - {j.project_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date *</label>
            <input type="date" value={form.form_date} onChange={(e) => update("form_date", e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Operator *</label>
            <select value={form.operator_id} onChange={(e) => update("operator_id", e.target.value)} className={inputCls} required>
              <option value="">Select operator...</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>{o.first_name} {o.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Equipment</label>
            <select value={form.equipment_id} onChange={(e) => update("equipment_id", e.target.value)} className={inputCls}>
              <option value="">Select equipment...</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.asset_number} - {eq.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pump Settings */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Pump Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Pump Pressure (PSI)</label>
            <input type="number" value={form.pump_pressure_psi ?? ""} onChange={(e) => update("pump_pressure_psi", e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g., 20000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Water Flow Rate (GPM)</label>
            <input type="number" step="0.1" value={form.water_flow_gpm ?? ""} onChange={(e) => update("water_flow_gpm", e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 18.5" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Nozzle Configuration */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Nozzle Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nozzle Size</label>
            <input type="text" value={form.nozzle_size} onChange={(e) => update("nozzle_size", e.target.value)} placeholder="e.g., 0.040&quot;" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Nozzle Count</label>
            <input type="number" value={form.nozzle_count ?? ""} onChange={(e) => update("nozzle_count", e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g., 4" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Stand-Off Distance</label>
            <input type="text" value={form.stand_off_distance} onChange={(e) => update("stand_off_distance", e.target.value)} placeholder="e.g., 2 inches" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Traverse Speed</label>
            <input type="text" value={form.traverse_speed} onChange={(e) => update("traverse_speed", e.target.value)} placeholder="e.g., 12 in/sec" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Calibration Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Pass Count</label>
            <input type="number" value={form.pass_count ?? ""} onChange={(e) => update("pass_count", e.target.value ? parseInt(e.target.value) : null)} placeholder="e.g., 3" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Removal Depth</label>
            <input type="text" value={form.removal_depth} onChange={(e) => update("removal_depth", e.target.value)} placeholder="e.g., 1.5 inches" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Surface Profile</label>
            <select value={form.surface_profile} onChange={(e) => update("surface_profile", e.target.value)} className={inputCls}>
              <option value="">Select profile...</option>
              {SURFACE_PROFILES.map((sp) => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
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
          placeholder="Additional observations, adjustments made, test area description..."
          className={inputCls}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-8">
        <Link href="/dashboard/field" className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
          Cancel
        </Link>
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors disabled:opacity-50"
        >
          <Save size={16} /> Save Draft
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Send size={16} /> Submit
        </button>
      </div>
    </div>
  );
}
