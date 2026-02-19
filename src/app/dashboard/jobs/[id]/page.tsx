"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { JobCard, JobStatus, ChangeOrder, ChangeOrderStatus, OnsiteContact, CrewAssignment, RentalEquipment } from "@/lib/types";
import Link from "next/link";
import {
  ArrowLeft, MapPin, DollarSign, Calendar, Users, Wrench,
  FileText, Settings2, Truck, AlertCircle, Plus, Trash2, X,
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
  const [job, setJob] = useState<JobCard | null>(null);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCOModal, setShowCOModal] = useState(false);
  const supabase = createClient();

  const fetchJob = useCallback(async () => {
    setLoading(true);
    const [jobRes, coRes] = await Promise.all([
      supabase.from("job_cards").select("*").eq("id", id).single(),
      supabase.from("change_orders").select("*").eq("job_card_id", id).order("created_at"),
    ]);
    if (jobRes.data) setJob(jobRes.data as JobCard);
    if (coRes.data) setChangeOrders(coRes.data as ChangeOrder[]);
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchJob(); }, [fetchJob]);

  const updateStatus = async (status: JobStatus) => {
    if (!job) return;
    setSaving(true);
    const updates: Record<string, unknown> = { status };
    if (status === "complete") updates.actual_end_date = new Date().toISOString().split("T")[0];
    await supabase.from("job_cards").update(updates).eq("id", job.id);
    setJob({ ...job, status, ...(status === "complete" ? { actual_end_date: new Date().toISOString().split("T")[0] } : {}) });
    setSaving(false);
  };

  const handleCOCreated = (co: ChangeOrder) => {
    setChangeOrders([...changeOrders, co]);
    setShowCOModal(false);
  };

  const deleteChangeOrder = async (coId: string) => {
    await supabase.from("change_orders").delete().eq("id", coId);
    setChangeOrders(changeOrders.filter((co) => co.id !== coId));
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

        {/* Status Selector */}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard icon={<DollarSign size={16} />} label="Contract Value" value={job.contract_value ? `$${job.contract_value.toLocaleString()}` : "—"} />
        <InfoCard icon={<DollarSign size={16} />} label="Change Orders" value={coTotal ? `$${coTotal.toLocaleString()}` : "—"} sub={`${changeOrders.length} COs`} />
        <InfoCard icon={<Calendar size={16} />} label="Start Date" value={job.start_date ? new Date(job.start_date).toLocaleDateString() : "—"} />
        <InfoCard icon={<Calendar size={16} />} label="Est. End" value={job.estimated_end_date ? new Date(job.estimated_end_date).toLocaleDateString() : "—"} />
      </div>

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
      {(job.location_address || job.location_city) && (
        <Section icon={<MapPin size={18} />} title="Location">
          <p className="text-sm text-ivs-text">
            {[job.location_address, job.location_city, job.location_state, job.location_zip].filter(Boolean).join(", ")}
          </p>
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
