"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/contexts/toast-context";
import type { JobCard, JobStatus, ChangeOrder, ChangeOrderStatus, OnsiteContact, CrewAssignment, RentalEquipment, Employee } from "@/lib/types";
import Link from "next/link";
import {
  ArrowLeft, MapPin, DollarSign, Calendar, Users, Wrench,
  FileText, Settings2, Truck, AlertCircle, Plus, Trash2, X,
  Save, Pencil,
} from "lucide-react";

const STATUS_OPTIONS: { value: JobStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "mobilizing", label: "Mobilizing", color: "bg-blue-500" },
  { value: "active", label: "Active", color: "bg-emerald-500" },
  { value: "on_hold", label: "On Hold", color: "bg-orange-500" },
  { value: "complete", label: "Complete", color: "bg-gray-400" },
  { value: "closed", label: "Closed", color: "bg-gray-600" },
];

const CO_STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-500/15", text: "text-gray-400" },
  submitted: { bg: "bg-blue-500/15", text: "text-blue-500" },
  approved: { bg: "bg-emerald-500/15", text: "text-emerald-500" },
  rejected: { bg: "bg-red-500/15", text: "text-red-500" },
  invoiced: { bg: "bg-purple-500/15", text: "text-purple-500" },
};

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [job, setJob] = useState<JobCard | null>(null);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showCOModal, setShowCOModal] = useState(false);
  const [form, setForm] = useState<Partial<JobCard>>({});
  const supabase = createClient();

  const fetchJob = useCallback(async () => {
    setLoading(true);
    const [jobRes, coRes, empRes] = await Promise.all([
      supabase.from("job_cards").select("*").eq("id", id).single(),
      supabase.from("change_orders").select("*").eq("job_card_id", id).order("created_at"),
      supabase.from("employees").select("id, first_name, last_name, role").eq("is_active", true).order("last_name"),
    ]);
    if (jobRes.data) {
      const j = jobRes.data as JobCard;
      setJob(j);
      setForm(j);
    }
    if (coRes.data) setChangeOrders(coRes.data as ChangeOrder[]);
    if (empRes.data) setEmployees(empRes.data as Employee[]);
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  const update = <K extends keyof JobCard>(key: K, value: JobCard[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateStatus = async (status: JobStatus) => {
    if (!job) return;
    setSaving(true);
    const updates: Record<string, unknown> = { status };
    if (status === "complete") updates.actual_end_date = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("job_cards").update(updates).eq("id", job.id);
    if (error) { showError(error.message); }
    else {
      setJob({ ...job, status, ...(status === "complete" ? { actual_end_date: new Date().toISOString().split("T")[0] } : {}) });
      setForm((prev) => ({ ...prev, status }));
      success(`Status updated to ${STATUS_OPTIONS.find((s) => s.value === status)?.label}`);
    }
    setSaving(false);
  };

  const handleSave = async () => {
    if (!job) return;
    setSaving(true);
    const updates: Record<string, unknown> = {
      project_name: form.project_name,
      client_name: form.client_name,
      location: form.location || null,
      description: form.description || null,
      contract_value: form.contract_value || null,
      start_date: form.start_date || null,
      estimated_end_date: form.estimated_end_date || null,
      project_manager_id: form.project_manager_id || null,
      lead_operator_id: form.lead_operator_id || null,
      notes: form.notes || null,
      pump_config: form.pump_config || null,
      surface_type: form.surface_type || null,
      cut_type: form.cut_type || null,
      location_address: form.location_address || null,
      location_city: form.location_city || null,
      location_state: form.location_state || null,
      location_zip: form.location_zip || null,
      onsite_contacts: form.onsite_contacts || [],
      crew_assigned: form.crew_assigned || [],
      rental_equipment: form.rental_equipment || [],
    };
    const { error } = await supabase.from("job_cards").update(updates).eq("id", job.id);
    if (error) { showError(error.message); }
    else {
      setBid_job({ ...job, ...updates } as unknown as JobCard);
      setEditing(false);
      success("Job updated");
    }
    setSaving(false);
  };

  // Alias for clarity after save
  const setBid_job = setJob;

  const handleDelete = async () => {
    if (!job) return;
    await supabase.from("job_cards").delete().eq("id", job.id);
    success("Job deleted");
    router.push("/dashboard/jobs");
  };

  const handleCOCreated = (co: ChangeOrder) => {
    setChangeOrders([...changeOrders, co]);
    setShowCOModal(false);
    success("Change order created");
  };

  const deleteChangeOrder = async (coId: string) => {
    await supabase.from("change_orders").delete().eq("id", coId);
    setChangeOrders(changeOrders.filter((co) => co.id !== coId));
    success("Change order deleted");
  };

  /* ── Contact/Crew/Rental helpers ── */
  const addContact = () => {
    const contacts = [...((form.onsite_contacts as OnsiteContact[]) || []), { name: "", role: "", phone: "", email: "" }];
    setForm((prev) => ({ ...prev, onsite_contacts: contacts }));
  };
  const removeContact = (idx: number) => {
    const contacts = [...((form.onsite_contacts as OnsiteContact[]) || [])];
    contacts.splice(idx, 1);
    setForm((prev) => ({ ...prev, onsite_contacts: contacts }));
  };
  const updateContact = (idx: number, field: keyof OnsiteContact, value: string) => {
    const contacts = [...((form.onsite_contacts as OnsiteContact[]) || [])];
    contacts[idx] = { ...contacts[idx], [field]: value };
    setForm((prev) => ({ ...prev, onsite_contacts: contacts }));
  };

  const addCrew = () => {
    const crew = [...((form.crew_assigned as CrewAssignment[]) || []), { employee_id: "", role: "", name: "" }];
    setForm((prev) => ({ ...prev, crew_assigned: crew }));
  };
  const removeCrew = (idx: number) => {
    const crew = [...((form.crew_assigned as CrewAssignment[]) || [])];
    crew.splice(idx, 1);
    setForm((prev) => ({ ...prev, crew_assigned: crew }));
  };
  const updateCrew = (idx: number, field: keyof CrewAssignment, value: string) => {
    const crew = [...((form.crew_assigned as CrewAssignment[]) || [])];
    crew[idx] = { ...crew[idx], [field]: value };
    if (field === "employee_id") {
      const emp = employees.find((e) => e.id === value);
      if (emp) crew[idx].name = `${emp.first_name} ${emp.last_name}`;
    }
    setForm((prev) => ({ ...prev, crew_assigned: crew }));
  };

  const addRental = () => {
    const rentals = [...((form.rental_equipment as RentalEquipment[]) || []), { description: "", vendor: "", daily_rate: null, start_date: null, end_date: null }];
    setForm((prev) => ({ ...prev, rental_equipment: rentals }));
  };
  const removeRental = (idx: number) => {
    const rentals = [...((form.rental_equipment as RentalEquipment[]) || [])];
    rentals.splice(idx, 1);
    setForm((prev) => ({ ...prev, rental_equipment: rentals }));
  };
  const updateRental = (idx: number, field: keyof RentalEquipment, value: string | number | null) => {
    const rentals = [...((form.rental_equipment as RentalEquipment[]) || [])];
    rentals[idx] = { ...rentals[idx], [field]: value };
    setForm((prev) => ({ ...prev, rental_equipment: rentals }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto mb-3 text-ivs-danger" size={32} />
        <p className="text-ivs-text">Job not found</p>
        <Link href="/dashboard/jobs" className="text-sm text-ivs-accent hover:underline mt-2 inline-block">
          Back to Jobs
        </Link>
      </div>
    );
  }

  const contacts: OnsiteContact[] = (job.onsite_contacts as OnsiteContact[] | null) ?? [];
  const crew: CrewAssignment[] = (job.crew_assigned as CrewAssignment[] | null) ?? [];
  const rentals: RentalEquipment[] = (job.rental_equipment as RentalEquipment[] | null) ?? [];
  const currentStatus = STATUS_OPTIONS.find((s) => s.value === job.status)!;
  const coTotal = changeOrders.reduce((sum, co) => sum + (co.amount || 0), 0);

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";
  const smallInput = "w-full px-2 py-1.5 bg-ivs-bg border border-ivs-border rounded text-ivs-text text-xs focus:outline-none focus:ring-1 focus:ring-ivs-accent";

  const formContacts = (form.onsite_contacts as OnsiteContact[]) || [];
  const formCrew = (form.crew_assigned as CrewAssignment[]) || [];
  const formRentals = (form.rental_equipment as RentalEquipment[]) || [];

  const pms = employees.filter((e) => ["pm", "admin", "executive"].includes(e.role));
  const operators = employees.filter((e) => ["lead_operator", "pm", "admin"].includes(e.role));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/jobs" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ivs-text">{job.job_number}</h1>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full text-white ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
            </div>
            <p className="text-ivs-text-muted mt-1">{job.project_name} &mdash; {job.client_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors"
            >
              <Pencil size={14} /> Edit
            </button>
          )}
          <select
            value={job.status}
            onChange={(e) => updateStatus(e.target.value as JobStatus)}
            disabled={saving}
            className="px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm focus:outline-none focus:ring-2 focus:ring-ivs-accent"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard icon={<DollarSign size={16} />} label="Contract Value" value={job.contract_value ? `$${job.contract_value.toLocaleString()}` : "—"} />
        <InfoCard icon={<DollarSign size={16} />} label="Change Orders" value={coTotal ? `$${coTotal.toLocaleString()}` : "—"} sub={`${changeOrders.length} COs`} />
        <InfoCard icon={<Calendar size={16} />} label="Start Date" value={job.start_date ? new Date(job.start_date).toLocaleDateString() : "—"} />
        <InfoCard icon={<Calendar size={16} />} label="Est. End" value={job.estimated_end_date ? new Date(job.estimated_end_date).toLocaleDateString() : "—"} />
      </div>

      {editing ? (
        /* ── Edit Form ── */
        <>
          {/* Project Info */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Project Name *</label>
                <input type="text" value={form.project_name || ""} onChange={(e) => update("project_name", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Client Name *</label>
                <input type="text" value={form.client_name || ""} onChange={(e) => update("client_name", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contract Value ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ivs-text-muted text-sm">$</span>
                  <input type="number" step="0.01" value={form.contract_value ?? ""} onChange={(e) => update("contract_value", e.target.value ? parseFloat(e.target.value) : null)} className={`${inputCls} pl-7`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Location (legacy)</label>
                <input type="text" value={form.location || ""} onChange={(e) => update("location", e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Dates & People */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Dates & People</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="date" value={form.start_date || ""} onChange={(e) => update("start_date", e.target.value || null)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Est. End Date</label>
                <input type="date" value={form.estimated_end_date || ""} onChange={(e) => update("estimated_end_date", e.target.value || null)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Project Manager</label>
                <select value={form.project_manager_id || ""} onChange={(e) => update("project_manager_id", e.target.value || null)} className={inputCls}>
                  <option value="">Unassigned</option>
                  {pms.map((e) => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Lead Operator</label>
                <select value={form.lead_operator_id || ""} onChange={(e) => update("lead_operator_id", e.target.value || null)} className={inputCls}>
                  <option value="">Unassigned</option>
                  {operators.map((e) => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Job Configuration */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Job Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Pump Config (PSI)</label>
                <input type="text" value={form.pump_config || ""} onChange={(e) => update("pump_config", e.target.value)} placeholder="e.g. 20000" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Surface Type</label>
                <select value={form.surface_type || ""} onChange={(e) => update("surface_type", e.target.value || null)} className={inputCls}>
                  <option value="">Select...</option>
                  <option value="Bridge Deck">Bridge Deck</option>
                  <option value="Parking Garage">Parking Garage</option>
                  <option value="Industrial Floor">Industrial Floor</option>
                  <option value="Column / Pier">Column / Pier</option>
                  <option value="Wall">Wall</option>
                  <option value="Tunnel">Tunnel</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Cut Type</label>
                <select value={form.cut_type || ""} onChange={(e) => update("cut_type", e.target.value || null)} className={inputCls}>
                  <option value="">Select...</option>
                  <option value="Partial Depth">Partial Depth</option>
                  <option value="Full Depth">Full Depth</option>
                  <option value="Selective">Selective</option>
                  <option value="Surface Prep">Surface Prep</option>
                  <option value="Scarification">Scarification</option>
                </select>
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Location Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>Address</label>
                <input type="text" value={form.location_address || ""} onChange={(e) => update("location_address", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input type="text" value={form.location_city || ""} onChange={(e) => update("location_city", e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>State</label>
                  <input type="text" value={form.location_state || ""} onChange={(e) => update("location_state", e.target.value)} maxLength={2} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>ZIP</label>
                  <input type="text" value={form.location_zip || ""} onChange={(e) => update("location_zip", e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          {/* On-Site Contacts */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">On-Site Contacts</h3>
            {formContacts.map((c, i) => (
              <div key={i} className="bg-ivs-bg rounded-lg border border-ivs-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ivs-text-muted">Contact #{i + 1}</span>
                  <button onClick={() => removeContact(i)} className="text-ivs-text-muted hover:text-ivs-danger"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={c.name} onChange={(e) => updateContact(i, "name", e.target.value)} placeholder="Name" className={smallInput} />
                  <input type="text" value={c.role} onChange={(e) => updateContact(i, "role", e.target.value)} placeholder="Role" className={smallInput} />
                  <input type="tel" value={c.phone} onChange={(e) => updateContact(i, "phone", e.target.value)} placeholder="Phone" className={smallInput} />
                  <input type="email" value={c.email} onChange={(e) => updateContact(i, "email", e.target.value)} placeholder="Email" className={smallInput} />
                </div>
              </div>
            ))}
            <button onClick={addContact} className="flex items-center gap-2 text-sm text-ivs-accent hover:text-ivs-accent-hover">
              <Plus size={14} /> Add Contact
            </button>
          </div>

          {/* Crew Assignment */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Crew Assignment</h3>
            {formCrew.map((c, i) => (
              <div key={i} className="flex items-center gap-2 bg-ivs-bg rounded-lg border border-ivs-border p-3">
                <select value={c.employee_id} onChange={(e) => updateCrew(i, "employee_id", e.target.value)} className={`${smallInput} flex-1`}>
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                  ))}
                </select>
                <input type="text" value={c.role} onChange={(e) => updateCrew(i, "role", e.target.value)} placeholder="Role" className={`${smallInput} w-40`} />
                <button onClick={() => removeCrew(i)} className="text-ivs-text-muted hover:text-ivs-danger"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={addCrew} className="flex items-center gap-2 text-sm text-ivs-accent hover:text-ivs-accent-hover">
              <Plus size={14} /> Add Crew Member
            </button>
          </div>

          {/* Rental Equipment */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Rental Equipment</h3>
            {formRentals.map((r, i) => (
              <div key={i} className="bg-ivs-bg rounded-lg border border-ivs-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ivs-text-muted">Rental #{i + 1}</span>
                  <button onClick={() => removeRental(i)} className="text-ivs-text-muted hover:text-ivs-danger"><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={r.description} onChange={(e) => updateRental(i, "description", e.target.value)} placeholder="Description" className={smallInput} />
                  <input type="text" value={r.vendor} onChange={(e) => updateRental(i, "vendor", e.target.value)} placeholder="Vendor" className={smallInput} />
                  <input type="number" step="0.01" value={r.daily_rate ?? ""} onChange={(e) => updateRental(i, "daily_rate", e.target.value ? parseFloat(e.target.value) : null)} placeholder="$/day" className={smallInput} />
                  <input type="date" value={r.start_date || ""} onChange={(e) => updateRental(i, "start_date", e.target.value || null)} className={smallInput} />
                </div>
              </div>
            ))}
            <button onClick={addRental} className="flex items-center gap-2 text-sm text-ivs-accent hover:text-ivs-accent-hover">
              <Plus size={14} /> Add Rental
            </button>
          </div>

          {/* Description & Notes */}
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Description & Notes</h3>
            <div>
              <label className={labelCls}>Scope / Description</label>
              <textarea value={form.description || ""} onChange={(e) => update("description", e.target.value)} rows={4} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} rows={3} className={inputCls} />
            </div>
          </div>

          {/* Edit Actions */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={16} /> Delete Job
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => { setEditing(false); setForm(job); }} className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
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
          {/* Job Configuration */}
          {(job.pump_config || job.surface_type || job.cut_type) && (
            <Section icon={<Settings2 size={18} />} title="Job Configuration">
              <div className="flex flex-wrap gap-3">
                {job.pump_config && (
                  <span className="px-3 py-1.5 bg-ivs-accent/15 text-ivs-accent text-sm font-medium rounded-lg">
                    {job.pump_config} PSI
                  </span>
                )}
                {job.surface_type && (
                  <span className="px-3 py-1.5 bg-ivs-bg text-ivs-text text-sm rounded-lg border border-ivs-border">
                    {job.surface_type}
                  </span>
                )}
                {job.cut_type && (
                  <span className="px-3 py-1.5 bg-ivs-bg text-ivs-text text-sm rounded-lg border border-ivs-border">
                    {job.cut_type}
                  </span>
                )}
              </div>
            </Section>
          )}

          {/* Description */}
          {job.description && (
            <Section icon={<FileText size={18} />} title="Description / Scope">
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{job.description}</p>
            </Section>
          )}

          {/* Location */}
          {(job.location_address || job.location_city || job.location) && (
            <Section icon={<MapPin size={18} />} title="Location">
              {job.location_address ? (
                <p className="text-sm text-ivs-text">
                  {[job.location_address, job.location_city, job.location_state, job.location_zip].filter(Boolean).join(", ")}
                </p>
              ) : (
                <p className="text-sm text-ivs-text">{job.location}</p>
              )}
            </Section>
          )}

          {/* On-Site Contacts */}
          {contacts.length > 0 && (
            <Section icon={<Users size={18} />} title="On-Site Contacts">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {contacts.map((c, i) => (
                  <div key={i} className="bg-ivs-bg rounded-lg border border-ivs-border p-3">
                    <p className="text-sm font-medium text-ivs-text">{c.name}</p>
                    <p className="text-xs text-ivs-text-muted">{c.role}</p>
                    {c.phone && <p className="text-xs text-ivs-text-muted mt-1">{c.phone}</p>}
                    {c.email && <p className="text-xs text-ivs-accent">{c.email}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Crew */}
          {crew.length > 0 && (
            <Section icon={<Users size={18} />} title="Crew Assignment">
              <div className="flex flex-wrap gap-2">
                {crew.map((m, i) => (
                  <div key={i} className="px-3 py-2 bg-ivs-bg rounded-lg border border-ivs-border">
                    <p className="text-sm text-ivs-text">{m.name || m.employee_id}</p>
                    <p className="text-xs text-ivs-text-muted">{m.role}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Equipment */}
          {job.equipment_assigned && (job.equipment_assigned as string[]).length > 0 && (
            <Section icon={<Wrench size={18} />} title="Equipment Assigned">
              <p className="text-sm text-ivs-text-muted">{(job.equipment_assigned as string[]).length} piece(s) assigned</p>
            </Section>
          )}

          {/* Rental Equipment */}
          {rentals.length > 0 && (
            <Section icon={<Truck size={18} />} title="Rental Equipment">
              <div className="space-y-2">
                {rentals.map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-ivs-bg rounded-lg border border-ivs-border p-3">
                    <div>
                      <p className="text-sm text-ivs-text">{r.description}</p>
                      <p className="text-xs text-ivs-text-muted">{r.vendor}</p>
                    </div>
                    {r.daily_rate && <p className="text-sm font-medium text-ivs-text">${r.daily_rate}/day</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Change Orders */}
          <Section icon={<DollarSign size={18} />} title="Change Orders">
            {changeOrders.length > 0 ? (
              <div className="bg-ivs-bg rounded-lg border border-ivs-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ivs-border text-ivs-text-muted text-xs">
                      <th className="px-4 py-2 text-left">CO #</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-left">Reason</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeOrders.map((co) => {
                      const badge = CO_STATUS_BADGE[co.status] ?? CO_STATUS_BADGE.draft;
                      return (
                        <tr key={co.id} className="border-b border-ivs-border/50">
                          <td className="px-4 py-2 font-mono text-ivs-accent">{co.co_number}</td>
                          <td className="px-4 py-2 text-ivs-text">{co.description}</td>
                          <td className="px-4 py-2 text-xs text-ivs-text-muted">{co.reason || "—"}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${badge.bg} ${badge.text}`}>
                              {co.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right text-ivs-text">${(co.amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-2">
                            <button onClick={() => deleteChangeOrder(co.id)} className="text-ivs-text-muted hover:text-ivs-danger">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-ivs-border">
                      <td colSpan={4} className="px-4 py-2 text-xs text-ivs-text-muted font-medium">Total</td>
                      <td className="px-4 py-2 text-right font-medium text-ivs-text">${coTotal.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-ivs-text-muted">No change orders yet.</p>
            )}
            <button onClick={() => setShowCOModal(true)} className="mt-3 flex items-center gap-2 text-sm text-ivs-accent hover:text-ivs-accent-hover transition-colors">
              <Plus size={14} /> Add Change Order
            </button>
          </Section>

          {/* Notes */}
          {job.notes && (
            <Section icon={<FileText size={18} />} title="Notes">
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{job.notes}</p>
            </Section>
          )}

          {/* Delete */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={16} /> Delete Job
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-ivs-text mb-2">Delete Job?</h2>
            <p className="text-sm text-ivs-text-muted mb-6">
              This will permanently delete <strong className="text-ivs-text">{job.job_number}</strong> and all associated data. This action cannot be undone.
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

      {/* Change Order Modal */}
      {showCOModal && (
        <ChangeOrderModal
          jobId={job.id}
          nextNumber={changeOrders.length + 1}
          onClose={() => setShowCOModal(false)}
          onCreated={handleCOCreated}
        />
      )}
    </div>
  );
}

/* ── Change Order Modal ── */

function ChangeOrderModal({
  jobId,
  nextNumber,
  onClose,
  onCreated,
}: {
  jobId: string;
  nextNumber: number;
  onClose: () => void;
  onCreated: (co: ChangeOrder) => void;
}) {
  const supabase = createClient();
  const [coNumber] = useState(`CO-${String(nextNumber).padStart(2, "0")}`);
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  const handleSubmit = async () => {
    if (!description) {
      setError("Description is required.");
      return;
    }
    setSaving(true);
    setError("");

    const { data, error: dbErr } = await supabase
      .from("change_orders")
      .insert({
        job_card_id: jobId,
        co_number: coNumber,
        description,
        reason: reason || null,
        amount: parseFloat(amount) || 0,
        status: "draft" as ChangeOrderStatus,
        notes: notes || null,
      })
      .select()
      .single();

    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    if (data) onCreated(data as ChangeOrder);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ivs-text">New Change Order</h2>
          <button onClick={onClose} className="p-1 text-ivs-text-muted hover:text-ivs-text">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className={labelCls}>CO Number</label>
          <input type="text" value={coNumber} readOnly className={`${inputCls} opacity-60`} />
        </div>

        <div>
          <label className={labelCls}>Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Describe the scope change..."
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Reason</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
            <option value="">Select reason...</option>
            <option value="Scope Change">Scope Change</option>
            <option value="Unforeseen Conditions">Unforeseen Conditions</option>
            <option value="Design Revision">Design Revision</option>
            <option value="Client Request">Client Request</option>
            <option value="Additional Work">Additional Work</option>
            <option value="Material Change">Material Change</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Amount ($)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ivs-text-muted text-sm">$</span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`${inputCls} pl-7`}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Additional details..."
            className={inputCls}
          />
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
            {saving ? "Creating..." : "Create Change Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Helper Components ── */

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

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-ivs-text-muted mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-bold text-ivs-text">{value}</p>
      {sub && <p className="text-xs text-ivs-text-muted">{sub}</p>}
    </div>
  );
}
