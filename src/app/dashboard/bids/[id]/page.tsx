"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Bid, BidStatus, Employee } from "@/lib/types";
import Link from "next/link";
import {
  ArrowLeft, MapPin, DollarSign, Calendar, User, FileText,
  AlertCircle, Save, Trash2, ArrowRightCircle,
} from "lucide-react";

const STATUS_OPTIONS: { value: BidStatus; label: string; color: string }[] = [
  { value: "draft", label: "Estimating", color: "bg-yellow-500" },
  { value: "submitted", label: "Submitted", color: "bg-blue-500" },
  { value: "won", label: "Awarded", color: "bg-emerald-500" },
  { value: "lost", label: "Lost", color: "bg-red-500" },
  { value: "cancelled", label: "No Bid", color: "bg-gray-500" },
];

export default function BidDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bid, setBid] = useState<Bid | null>(null);
  const [estimators, setEstimators] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [form, setForm] = useState<Partial<Bid>>({});
  const supabase = createClient();

  const fetchBid = useCallback(async () => {
    setLoading(true);
    const [bidRes, empRes] = await Promise.all([
      supabase.from("bids").select("*").eq("id", id).single(),
      supabase.from("employees").select("id, first_name, last_name").eq("is_active", true).in("role", ["estimator", "pm", "admin"]).order("last_name"),
    ]);
    if (bidRes.data) {
      const b = bidRes.data as Bid;
      setBid(b);
      setForm(b);
    }
    if (empRes.data) setEstimators(empRes.data as Employee[]);
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchBid(); }, [fetchBid]);

  const update = <K extends keyof Bid>(key: K, value: Bid[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!bid) return;
    setSaving(true);
    const updates: Record<string, unknown> = {
      project_name: form.project_name,
      client_name: form.client_name,
      client_contact: form.client_contact || null,
      client_email: form.client_email || null,
      client_phone: form.client_phone || null,
      location: form.location || null,
      description: form.description || null,
      estimated_value: form.estimated_value || null,
      estimated_duration_days: form.estimated_duration_days || null,
      awarded_value: form.awarded_value || null,
      submitted_date: form.submitted_date || null,
      decision_date: form.decision_date || null,
      estimator_id: form.estimator_id || null,
      notes: form.notes || null,
    };
    await supabase.from("bids").update(updates).eq("id", bid.id);
    setBid({ ...bid, ...updates } as Bid);
    setEditing(false);
    setSaving(false);
  };

  const handleStatusChange = async (status: BidStatus) => {
    if (!bid) return;
    setSaving(true);
    const updates: Record<string, unknown> = { status };
    if (status === "submitted" && !bid.submitted_date) {
      updates.submitted_date = new Date().toISOString().split("T")[0];
    }
    if ((status === "won" || status === "lost") && !bid.decision_date) {
      updates.decision_date = new Date().toISOString().split("T")[0];
    }
    await supabase.from("bids").update(updates).eq("id", bid.id);
    setBid({ ...bid, ...updates, status } as Bid);
    setForm((prev) => ({ ...prev, ...updates, status }));
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!bid) return;
    await supabase.from("bids").delete().eq("id", bid.id);
    router.push("/dashboard/bids");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!bid) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto mb-3 text-ivs-danger" size={32} />
        <p className="text-ivs-text">Bid not found</p>
        <Link href="/dashboard/bids" className="text-sm text-ivs-accent hover:underline mt-2 inline-block">
          Back to Bids
        </Link>
      </div>
    );
  }

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === bid.status)!;
  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/bids" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ivs-text">{bid.bid_number}</h1>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full text-white ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
            </div>
            <p className="text-ivs-text-muted mt-1">{bid.project_name} &mdash; {bid.client_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors"
            >
              Edit
            </button>
          )}
          <select
            value={bid.status}
            onChange={(e) => handleStatusChange(e.target.value as BidStatus)}
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
        <InfoCard icon={<DollarSign size={16} />} label="Estimated Value" value={bid.estimated_value ? `$${bid.estimated_value.toLocaleString()}` : "—"} />
        <InfoCard icon={<DollarSign size={16} />} label="Awarded Value" value={bid.awarded_value ? `$${bid.awarded_value.toLocaleString()}` : "—"} />
        <InfoCard icon={<Calendar size={16} />} label="Submitted" value={bid.submitted_date ? new Date(bid.submitted_date).toLocaleDateString() : "—"} />
        <InfoCard icon={<Calendar size={16} />} label="Duration" value={bid.estimated_duration_days ? `${bid.estimated_duration_days} days` : "—"} />
      </div>

      {editing ? (
        /* Edit Form */
        <>
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Project Name *</label>
                <input type="text" value={form.project_name || ""} onChange={(e) => update("project_name", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input type="text" value={form.location || ""} onChange={(e) => update("location", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Estimated Value ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ivs-text-muted text-sm">$</span>
                  <input type="number" step="0.01" value={form.estimated_value ?? ""} onChange={(e) => update("estimated_value", e.target.value ? parseFloat(e.target.value) : null)} className={`${inputCls} pl-7`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Awarded Value ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ivs-text-muted text-sm">$</span>
                  <input type="number" step="0.01" value={form.awarded_value ?? ""} onChange={(e) => update("awarded_value", e.target.value ? parseFloat(e.target.value) : null)} className={`${inputCls} pl-7`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Est. Duration (days)</label>
                <input type="number" value={form.estimated_duration_days ?? ""} onChange={(e) => update("estimated_duration_days", e.target.value ? parseInt(e.target.value) : null)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Estimator</label>
                <select value={form.estimator_id || ""} onChange={(e) => update("estimator_id", e.target.value || null)} className={inputCls}>
                  <option value="">Unassigned</option>
                  {estimators.map((e) => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Client Name *</label>
                <input type="text" value={form.client_name || ""} onChange={(e) => update("client_name", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact Name</label>
                <input type="text" value={form.client_contact || ""} onChange={(e) => update("client_contact", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.client_email || ""} onChange={(e) => update("client_email", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" value={form.client_phone || ""} onChange={(e) => update("client_phone", e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Submitted Date</label>
                <input type="date" value={form.submitted_date || ""} onChange={(e) => update("submitted_date", e.target.value || null)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Decision Date</label>
                <input type="date" value={form.decision_date || ""} onChange={(e) => update("decision_date", e.target.value || null)} className={inputCls} />
              </div>
            </div>
          </div>

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

          <div className="flex items-center justify-between pt-2 pb-8">
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={16} /> Delete Bid
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => { setEditing(false); setForm(bid); }} className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Read-only View */
        <>
          {/* Client Info */}
          <Section icon={<User size={18} />} title="Client Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-ivs-text-muted text-xs">Client Name</p>
                <p className="text-ivs-text font-medium">{bid.client_name}</p>
              </div>
              {bid.client_contact && (
                <div>
                  <p className="text-ivs-text-muted text-xs">Contact</p>
                  <p className="text-ivs-text">{bid.client_contact}</p>
                </div>
              )}
              {bid.client_email && (
                <div>
                  <p className="text-ivs-text-muted text-xs">Email</p>
                  <p className="text-ivs-accent">{bid.client_email}</p>
                </div>
              )}
              {bid.client_phone && (
                <div>
                  <p className="text-ivs-text-muted text-xs">Phone</p>
                  <p className="text-ivs-text">{bid.client_phone}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Location */}
          {bid.location && (
            <Section icon={<MapPin size={18} />} title="Location">
              <p className="text-sm text-ivs-text">{bid.location}</p>
            </Section>
          )}

          {/* Description */}
          {bid.description && (
            <Section icon={<FileText size={18} />} title="Scope / Description">
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{bid.description}</p>
            </Section>
          )}

          {/* Notes */}
          {bid.notes && (
            <Section icon={<FileText size={18} />} title="Notes">
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{bid.notes}</p>
            </Section>
          )}

          {/* Dates */}
          {(bid.submitted_date || bid.decision_date) && (
            <Section icon={<Calendar size={18} />} title="Timeline">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-ivs-text-muted text-xs">Created</p>
                  <p className="text-ivs-text">{new Date(bid.created_at).toLocaleDateString()}</p>
                </div>
                {bid.submitted_date && (
                  <div>
                    <p className="text-ivs-text-muted text-xs">Submitted</p>
                    <p className="text-ivs-text">{new Date(bid.submitted_date).toLocaleDateString()}</p>
                  </div>
                )}
                {bid.decision_date && (
                  <div>
                    <p className="text-ivs-text-muted text-xs">Decision</p>
                    <p className="text-ivs-text">{new Date(bid.decision_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Convert to Job Action */}
          {bid.status === "won" && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-400">Bid Awarded</h3>
                  <p className="text-xs text-emerald-400/70 mt-1">Convert this bid to a job card to start project management.</p>
                </div>
                <Link
                  href="/dashboard/jobs/new"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <ArrowRightCircle size={16} /> Convert to Job
                </Link>
              </div>
            </div>
          )}

          {/* Delete */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={16} /> Delete Bid
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-ivs-text mb-2">Delete Bid?</h2>
            <p className="text-sm text-ivs-text-muted mb-6">
              This will permanently delete <strong className="text-ivs-text">{bid.bid_number}</strong>. This action cannot be undone.
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

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-ivs-text-muted mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-bold text-ivs-text">{value}</p>
    </div>
  );
}
