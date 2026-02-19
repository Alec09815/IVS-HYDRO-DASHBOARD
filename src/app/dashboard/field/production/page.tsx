"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import type { JobCard, Employee, CostCode } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, FileText, Save, Send } from "lucide-react";

interface ProductionFormData {
  job_card_id: string;
  form_date: string;
  operator_id: string;
  cost_code_id: string;
  area_location: string;
  quantity_completed: number | null;
  unit: string;
  pump_hours: number | null;
  downtime_hours: number | null;
  downtime_reason: string;
  water_usage_gallons: number | null;
  concrete_removed_cuft: number | null;
  notes: string;
}

const INITIAL: ProductionFormData = {
  job_card_id: "",
  form_date: new Date().toISOString().split("T")[0],
  operator_id: "",
  cost_code_id: "",
  area_location: "",
  quantity_completed: null,
  unit: "sq ft",
  pump_hours: null,
  downtime_hours: null,
  downtime_reason: "",
  water_usage_gallons: null,
  concrete_removed_cuft: null,
  notes: "",
};

const UNITS = ["sq ft", "cu ft", "cu yd", "linear ft", "sq yd", "each"];

const DOWNTIME_REASONS = [
  "Weather", "Equipment Breakdown", "Material Delay", "Safety Stand-Down",
  "Waiting on Inspector", "Water Supply", "Electrical Issue", "Other",
];

export default function ProductionFormPage() {
  const router = useRouter();
  const { employee } = useAuth();
  const [form, setForm] = useState<ProductionFormData>(INITIAL);
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [operators, setOperators] = useState<Employee[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const fetchLookups = useCallback(async () => {
    const [jobRes, empRes, ccRes] = await Promise.all([
      supabase.from("job_cards").select("id, job_number, project_name").in("status", ["active", "mobilizing"]).order("job_number"),
      supabase.from("employees").select("id, first_name, last_name, role").eq("is_active", true).in("role", ["lead_operator", "admin", "pm"]).order("last_name"),
      supabase.from("cost_codes").select("*").eq("is_active", true).order("code"),
    ]);
    if (jobRes.data) setJobs(jobRes.data as JobCard[]);
    if (empRes.data) setOperators(empRes.data as Employee[]);
    if (ccRes.data) setCostCodes(ccRes.data as CostCode[]);
  }, [supabase]);

  useEffect(() => {
    fetchLookups();
    if (employee) {
      setForm((prev) => ({ ...prev, operator_id: employee.id }));
    }
  }, [fetchLookups, employee]);

  const update = <K extends keyof ProductionFormData>(key: K, value: ProductionFormData[K]) =>
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
      quantity_completed: form.quantity_completed || null,
      pump_hours: form.pump_hours || null,
      downtime_hours: form.downtime_hours || null,
      water_usage_gallons: form.water_usage_gallons || null,
      concrete_removed_cuft: form.concrete_removed_cuft || null,
      cost_code_id: form.cost_code_id || null,
      submitted: submit,
      submitted_at: submit ? new Date().toISOString() : null,
    };

    const { error: dbErr } = await supabase.from("production_forms").insert(payload);
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    router.push("/dashboard/production");
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
            <FileText size={24} className="text-ivs-accent" /> Production Form
          </h1>
          <p className="text-sm text-ivs-text-muted mt-1">Log daily production quantities and pump hours</p>
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
            <label className={labelCls}>Cost Code</label>
            <select value={form.cost_code_id} onChange={(e) => update("cost_code_id", e.target.value)} className={inputCls}>
              <option value="">Select cost code...</option>
              {costCodes.map((cc) => (
                <option key={cc.id} value={cc.id}>{cc.code} - {cc.description}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Production Data */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Production Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Area / Location</label>
            <input type="text" value={form.area_location} onChange={(e) => update("area_location", e.target.value)} placeholder="e.g., Span 3 North" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Quantity Completed</label>
            <input type="number" step="0.1" value={form.quantity_completed ?? ""} onChange={(e) => update("quantity_completed", e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 250" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Unit</label>
            <select value={form.unit} onChange={(e) => update("unit", e.target.value)} className={inputCls}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hours & Downtime */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Hours & Downtime</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Pump Hours</label>
            <input type="number" step="0.1" value={form.pump_hours ?? ""} onChange={(e) => update("pump_hours", e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 8.5" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Downtime Hours</label>
            <input type="number" step="0.1" value={form.downtime_hours ?? ""} onChange={(e) => update("downtime_hours", e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 1.5" className={inputCls} />
          </div>
          {(form.downtime_hours ?? 0) > 0 && (
            <div className="md:col-span-2">
              <label className={labelCls}>Downtime Reason</label>
              <select value={form.downtime_reason} onChange={(e) => update("downtime_reason", e.target.value)} className={inputCls}>
                <option value="">Select reason...</option>
                {DOWNTIME_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Materials */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Material Tracking</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Water Usage (gallons)</label>
            <input type="number" step="0.1" value={form.water_usage_gallons ?? ""} onChange={(e) => update("water_usage_gallons", e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 5000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Concrete Removed (cu ft)</label>
            <input type="number" step="0.1" value={form.concrete_removed_cuft ?? ""} onChange={(e) => update("concrete_removed_cuft", e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g., 12.5" className={inputCls} />
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
          placeholder="Work performed, conditions, issues encountered..."
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
