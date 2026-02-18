"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee, Equipment, CostCode, OnsiteContact, CrewAssignment, RentalEquipment } from "@/lib/types";
import {
  Settings2, MapPin, Users, Wrench, FileText,
  DollarSign, Plus, Trash2, Truck,
} from "lucide-react";

const SURFACE_TYPES = [
  "Bridge Deck", "Column", "Wall", "Pier Cap", "Abutment",
  "Beam", "Slab", "Pavement", "Tunnel", "Other",
];

const CUT_TYPES = [
  "Full Depth", "Partial Depth", "Scarify", "Milling",
  "Surface Preparation", "Selective Removal", "Other",
];

interface JobCardFormProps {
  onSubmit: (data: JobFormData) => void;
  initialData?: Partial<JobFormData>;
  loading?: boolean;
}

export interface JobFormData {
  job_number: string;
  project_name: string;
  client_name: string;
  description: string;
  contract_value: number | null;
  start_date: string;
  estimated_end_date: string;
  project_manager_id: string;
  lead_operator_id: string;
  pump_config: string;
  surface_type: string;
  cut_type: string;
  equipment_assigned: string[];
  cost_codes_assigned: string[];
  onsite_contacts: OnsiteContact[];
  location_address: string;
  location_city: string;
  location_state: string;
  location_zip: string;
  crew_assigned: CrewAssignment[];
  rental_equipment: RentalEquipment[];
  notes: string;
}

const INITIAL_FORM: JobFormData = {
  job_number: "",
  project_name: "",
  client_name: "",
  description: "",
  contract_value: null,
  start_date: "",
  estimated_end_date: "",
  project_manager_id: "",
  lead_operator_id: "",
  pump_config: "20K",
  surface_type: "",
  cut_type: "",
  equipment_assigned: [],
  cost_codes_assigned: [],
  onsite_contacts: [],
  location_address: "",
  location_city: "",
  location_state: "",
  location_zip: "",
  crew_assigned: [],
  rental_equipment: [],
  notes: "",
};

export function JobCardForm({ onSubmit, initialData, loading }: JobCardFormProps) {
  const [form, setForm] = useState<JobFormData>({ ...INITIAL_FORM, ...initialData });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const supabase = createClient();

  const fetchLookups = useCallback(async () => {
    const [empRes, eqRes, ccRes] = await Promise.all([
      supabase.from("employees").select("*").eq("is_active", true).order("last_name"),
      supabase.from("equipment").select("*").order("name"),
      supabase.from("cost_codes").select("*").eq("is_active", true).order("code"),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (eqRes.data) setEquipment(eqRes.data);
    if (ccRes.data) setCostCodes(ccRes.data);
  }, [supabase]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  // Auto-populate cost codes when surface/cut type changes
  useEffect(() => {
    if (costCodes.length === 0) return;
    const auto = costCodes
      .filter((cc) => {
        const cat = cc.category.toLowerCase();
        if (form.surface_type && cat.includes(form.surface_type.toLowerCase())) return true;
        if (form.cut_type && cat.includes(form.cut_type.toLowerCase())) return true;
        if (form.pump_config === "40K" && cat.includes("40k")) return true;
        if (form.pump_config === "20K" && cat.includes("20k")) return true;
        return false;
      })
      .map((cc) => cc.id);
    if (auto.length > 0) {
      setForm((prev) => ({ ...prev, cost_codes_assigned: auto }));
    }
  }, [form.surface_type, form.cut_type, form.pump_config, costCodes]);

  const update = <K extends keyof JobFormData>(key: K, value: JobFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleEquipment = (id: string) => {
    setForm((prev) => ({
      ...prev,
      equipment_assigned: prev.equipment_assigned.includes(id)
        ? prev.equipment_assigned.filter((e) => e !== id)
        : [...prev.equipment_assigned, id],
    }));
  };

  const toggleCostCode = (id: string) => {
    setForm((prev) => ({
      ...prev,
      cost_codes_assigned: prev.cost_codes_assigned.includes(id)
        ? prev.cost_codes_assigned.filter((c) => c !== id)
        : [...prev.cost_codes_assigned, id],
    }));
  };

  const addContact = () =>
    update("onsite_contacts", [...form.onsite_contacts, { name: "", role: "", phone: "", email: "" }]);

  const updateContact = (i: number, field: keyof OnsiteContact, value: string) => {
    const updated = [...form.onsite_contacts];
    updated[i] = { ...updated[i], [field]: value };
    update("onsite_contacts", updated);
  };

  const removeContact = (i: number) =>
    update("onsite_contacts", form.onsite_contacts.filter((_, idx) => idx !== i));

  const addCrewMember = () =>
    update("crew_assigned", [...form.crew_assigned, { employee_id: "", role: "" }]);

  const updateCrewMember = (i: number, field: keyof CrewAssignment, value: string) => {
    const updated = [...form.crew_assigned];
    updated[i] = { ...updated[i], [field]: value };
    update("crew_assigned", updated);
  };

  const removeCrewMember = (i: number) =>
    update("crew_assigned", form.crew_assigned.filter((_, idx) => idx !== i));

  const addRental = () =>
    update("rental_equipment", [
      ...form.rental_equipment,
      { description: "", vendor: "", daily_rate: null, start_date: null, end_date: null },
    ]);

  const updateRental = (i: number, field: keyof RentalEquipment, value: string | number | null) => {
    const updated = [...form.rental_equipment];
    updated[i] = { ...updated[i], [field]: value };
    update("rental_equipment", updated);
  };

  const removeRental = (i: number) =>
    update("rental_equipment", form.rental_equipment.filter((_, idx) => idx !== i));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const inputCls =
    "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Job Configuration ── */}
      <Section icon={<Settings2 size={18} />} title="Job Configuration">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pump Config Toggle */}
          <div>
            <label className={labelCls}>Pump Configuration *</label>
            <div className="flex bg-ivs-bg border border-ivs-border rounded-lg overflow-hidden">
              {["20K", "40K"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => update("pump_config", opt)}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    form.pump_config === opt
                      ? "bg-ivs-accent text-white"
                      : "text-ivs-text-muted hover:text-ivs-text"
                  }`}
                >
                  {opt} PSI
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Surface Type</label>
            <select
              value={form.surface_type}
              onChange={(e) => update("surface_type", e.target.value)}
              className={inputCls}
            >
              <option value="">Select surface type...</option>
              {SURFACE_TYPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Cut Type</label>
            <select
              value={form.cut_type}
              onChange={(e) => update("cut_type", e.target.value)}
              className={inputCls}
            >
              <option value="">Select cut type...</option>
              {CUT_TYPES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* ── Job Details ── */}
      <Section icon={<FileText size={18} />} title="Job Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Job Number *</label>
            <input type="text" value={form.job_number} onChange={(e) => update("job_number", e.target.value)} required placeholder="JOB-2026-001" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Project Name *</label>
            <input type="text" value={form.project_name} onChange={(e) => update("project_name", e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Client Name *</label>
            <input type="text" value={form.client_name} onChange={(e) => update("client_name", e.target.value)} required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contract Value</label>
            <input type="number" value={form.contract_value ?? ""} onChange={(e) => update("contract_value", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Estimated End Date</label>
            <input type="date" value={form.estimated_end_date} onChange={(e) => update("estimated_end_date", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Project Manager</label>
            <select value={form.project_manager_id} onChange={(e) => update("project_manager_id", e.target.value)} className={inputCls}>
              <option value="">Select PM...</option>
              {employees.filter((e) => ["admin", "pm"].includes(e.role)).map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Lead Operator</label>
            <select value={form.lead_operator_id} onChange={(e) => update("lead_operator_id", e.target.value)} className={inputCls}>
              <option value="">Select lead operator...</option>
              {employees.filter((e) => ["lead_operator", "admin"].includes(e.role)).map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className={labelCls}>Description / Scope</label>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} className={inputCls} />
        </div>
      </Section>

      {/* ── Location Details ── */}
      <Section icon={<MapPin size={18} />} title="Location Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Address</label>
            <input type="text" value={form.location_address} onChange={(e) => update("location_address", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>City</label>
            <input type="text" value={form.location_city} onChange={(e) => update("location_city", e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>State</label>
              <input type="text" value={form.location_state} onChange={(e) => update("location_state", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>ZIP</label>
              <input type="text" value={form.location_zip} onChange={(e) => update("location_zip", e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
      </Section>

      {/* ── On-Site Contacts ── */}
      <Section icon={<Users size={18} />} title="On-Site Contacts">
        {form.onsite_contacts.map((contact, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3 items-end">
            <div>
              <label className={labelCls}>Name</label>
              <input type="text" value={contact.name} onChange={(e) => updateContact(i, "name", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Role</label>
              <input type="text" value={contact.role} onChange={(e) => updateContact(i, "role", e.target.value)} placeholder="e.g., Inspector" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" value={contact.phone} onChange={(e) => updateContact(i, "phone", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={contact.email} onChange={(e) => updateContact(i, "email", e.target.value)} className={inputCls} />
            </div>
            <button type="button" onClick={() => removeContact(i)} className="p-2 text-ivs-danger hover:bg-ivs-danger/10 rounded-lg self-end">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addContact} className="flex items-center gap-2 text-sm text-ivs-accent hover:text-ivs-accent-hover transition-colors">
          <Plus size={14} /> Add Contact
        </button>
      </Section>

      {/* ── Equipment ── */}
      <Section icon={<Wrench size={18} />} title="Equipment">
        {equipment.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {equipment.map((eq) => (
              <label
                key={eq.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  form.equipment_assigned.includes(eq.id)
                    ? "border-ivs-accent bg-ivs-accent/10 text-ivs-text"
                    : "border-ivs-border text-ivs-text-muted hover:border-ivs-accent/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.equipment_assigned.includes(eq.id)}
                  onChange={() => toggleEquipment(eq.id)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  form.equipment_assigned.includes(eq.id) ? "bg-ivs-accent border-ivs-accent" : "border-ivs-border"
                }`}>
                  {form.equipment_assigned.includes(eq.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
                <div className="text-xs">
                  <p className="font-medium">{eq.name}</p>
                  <p className="text-ivs-text-muted">{eq.asset_number}</p>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ivs-text-muted">No equipment in database. Add equipment in the Equipment module.</p>
        )}
      </Section>

      {/* ── Cost Codes ── */}
      <Section icon={<DollarSign size={18} />} title="Cost Codes">
        <p className="text-xs text-ivs-text-muted mb-3">Auto-populated based on job configuration. Click to toggle.</p>
        {costCodes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {costCodes.map((cc) => (
              <label
                key={cc.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  form.cost_codes_assigned.includes(cc.id)
                    ? "border-ivs-accent bg-ivs-accent/10 text-ivs-text"
                    : "border-ivs-border text-ivs-text-muted hover:border-ivs-accent/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.cost_codes_assigned.includes(cc.id)}
                  onChange={() => toggleCostCode(cc.id)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                  form.cost_codes_assigned.includes(cc.id) ? "bg-ivs-accent border-ivs-accent" : "border-ivs-border"
                }`}>
                  {form.cost_codes_assigned.includes(cc.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
                <div className="text-xs">
                  <span className="font-mono text-ivs-accent">{cc.code}</span>
                  <span className="ml-2">{cc.description}</span>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ivs-text-muted">No cost codes in database. Add them in the Admin module.</p>
        )}
      </Section>

      {/* ── Crew Assignment ── */}
      <Section icon={<Users size={18} />} title="Crew Assignment">
        {form.crew_assigned.map((member, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 items-end">
            <div>
              <label className={labelCls}>Employee</label>
              <select value={member.employee_id} onChange={(e) => updateCrewMember(i, "employee_id", e.target.value)} className={inputCls}>
                <option value="">Select employee...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Role on Job</label>
              <input type="text" value={member.role} onChange={(e) => updateCrewMember(i, "role", e.target.value)} placeholder="e.g., Operator, Laborer" className={inputCls} />
            </div>
            <button type="button" onClick={() => removeCrewMember(i)} className="p-2 text-ivs-danger hover:bg-ivs-danger/10 rounded-lg self-end">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addCrewMember} className="flex items-center gap-2 text-sm text-ivs-accent hover:text-ivs-accent-hover transition-colors">
          <Plus size={14} /> Add Crew Member
        </button>
      </Section>

      {/* ── Rental Equipment ── */}
      <Section icon={<Truck size={18} />} title="Rental Equipment">
        {form.rental_equipment.map((rental, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3 items-end">
            <div className="md:col-span-2">
              <label className={labelCls}>Description</label>
              <input type="text" value={rental.description} onChange={(e) => updateRental(i, "description", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Vendor</label>
              <input type="text" value={rental.vendor} onChange={(e) => updateRental(i, "vendor", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Daily Rate</label>
              <input type="number" value={rental.daily_rate ?? ""} onChange={(e) => updateRental(i, "daily_rate", e.target.value ? parseFloat(e.target.value) : null)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Start</label>
              <input type="date" value={rental.start_date ?? ""} onChange={(e) => updateRental(i, "start_date", e.target.value || null)} className={inputCls} />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className={labelCls}>End</label>
                <input type="date" value={rental.end_date ?? ""} onChange={(e) => updateRental(i, "end_date", e.target.value || null)} className={inputCls} />
              </div>
              <button type="button" onClick={() => removeRental(i)} className="p-2 text-ivs-danger hover:bg-ivs-danger/10 rounded-lg">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addRental} className="flex items-center gap-2 text-sm text-ivs-accent hover:text-ivs-accent-hover transition-colors">
          <Plus size={14} /> Add Rental
        </button>
      </Section>

      {/* ── Notes ── */}
      <Section icon={<FileText size={18} />} title="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={4}
          placeholder="Internal notes, special instructions, safety requirements..."
          className={inputCls}
        />
      </Section>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-ivs-border">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Job Card"}
        </button>
      </div>
    </form>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-ivs-accent">{icon}</span>
        <h3 className="text-sm font-semibold text-ivs-text">{title}</h3>
      </div>
      {children}
    </div>
  );
}
