"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { InvoiceStatus } from "@/lib/types";
import Link from "next/link";
import {
  ArrowLeft, DollarSign, Calendar, FileText, Send,
  AlertCircle, Save, Trash2, CheckCircle, Ban,
} from "lucide-react";

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  description: string | null;
  status: InvoiceStatus;
  amount: number;
  tax_amount: number;
  total_amount: number;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  job_card: { id: string; job_number: string; project_name: string; client_name: string; contract_value: number | null } | null;
  created_by_employee: { first_name: string; last_name: string } | null;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Draft" },
  sent: { bg: "bg-blue-500/15", text: "text-blue-500", label: "Sent" },
  paid: { bg: "bg-emerald-500/15", text: "text-emerald-500", label: "Paid" },
  overdue: { bg: "bg-red-500/15", text: "text-red-500", label: "Overdue" },
  void: { bg: "bg-gray-600/15", text: "text-gray-500", label: "Void" },
};

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [form, setForm] = useState<Partial<InvoiceDetail>>({});
  const supabase = createClient();

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number, description, status, amount, tax_amount, total_amount,
        issued_date, due_date, paid_date, notes, created_at,
        job_card:job_cards!job_card_id (id, job_number, project_name, client_name, contract_value),
        created_by_employee:employees!created_by (first_name, last_name)
      `)
      .eq("id", id)
      .single();

    if (data) {
      const inv = data as unknown as InvoiceDetail;
      setInvoice(inv);
      setForm(inv);
    }
    setLoading(false);
  }, [supabase, id]);

  useEffect(() => { fetchInvoice(); }, [fetchInvoice]);

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice) return;
    setSaving(true);
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "paid") updates.paid_date = new Date().toISOString().split("T")[0];
    await supabase.from("invoices").update(updates).eq("id", invoice.id);
    setInvoice({ ...invoice, ...updates, status: newStatus } as InvoiceDetail);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!invoice) return;
    setSaving(true);
    const amount = form.amount ?? 0;
    const tax = form.tax_amount ?? 0;
    const updates = {
      description: form.description || null,
      amount,
      tax_amount: tax,
      total_amount: amount + tax,
      issued_date: form.issued_date || null,
      due_date: form.due_date || null,
      notes: form.notes || null,
    };
    await supabase.from("invoices").update(updates).eq("id", invoice.id);
    setInvoice({ ...invoice, ...updates } as InvoiceDetail);
    setEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!invoice) return;
    await supabase.from("invoices").delete().eq("id", invoice.id);
    router.push("/dashboard/invoicing");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto mb-3 text-ivs-danger" size={32} />
        <p className="text-ivs-text">Invoice not found</p>
        <Link href="/dashboard/invoicing" className="text-sm text-ivs-accent hover:underline mt-2 inline-block">
          Back to Invoicing
        </Link>
      </div>
    );
  }

  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft;
  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoicing" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-ivs-text">{invoice.invoice_number}</h1>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>
            <p className="text-ivs-text-muted mt-1">
              {invoice.job_card?.project_name} &mdash; {invoice.job_card?.client_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editing && invoice.status !== "void" && (
            <button onClick={() => setEditing(true)} className="px-4 py-2 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors">
              Edit
            </button>
          )}
          {/* Quick status actions */}
          {invoice.status === "draft" && (
            <button onClick={() => handleStatusChange("sent")} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-500/15 text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-500/25 transition-colors disabled:opacity-50">
              <Send size={16} /> Mark Sent
            </button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <button onClick={() => handleStatusChange("paid")} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/15 text-emerald-400 text-sm font-medium rounded-lg hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
              <CheckCircle size={16} /> Mark Paid
            </button>
          )}
          {invoice.status !== "void" && invoice.status !== "paid" && (
            <button onClick={() => handleStatusChange("void")} disabled={saving} className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:bg-gray-500/10 rounded-lg text-sm transition-colors disabled:opacity-50">
              <Ban size={16} /> Void
            </button>
          )}
        </div>
      </div>

      {/* Amount Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard icon={<DollarSign size={16} />} label="Amount" value={`$${(invoice.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <InfoCard icon={<DollarSign size={16} />} label="Tax" value={`$${(invoice.tax_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <InfoCard icon={<DollarSign size={16} />} label="Total" value={`$${(invoice.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} accent />
        <InfoCard icon={<Calendar size={16} />} label="Due Date" value={invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
      </div>

      {editing ? (
        /* Edit Form */
        <>
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Description</label>
                <input type="text" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Issue Date</label>
                <input type="date" value={form.issued_date || ""} onChange={(e) => setForm({ ...form, issued_date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Due Date</label>
                <input type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Amounts</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ivs-text-muted text-sm">$</span>
                  <input type="number" step="0.01" value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: e.target.value ? parseFloat(e.target.value) : 0 })} className={`${inputCls} pl-7`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Tax</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ivs-text-muted text-sm">$</span>
                  <input type="number" step="0.01" value={form.tax_amount ?? ""} onChange={(e) => setForm({ ...form, tax_amount: e.target.value ? parseFloat(e.target.value) : 0 })} className={`${inputCls} pl-7`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Total</label>
                <div className="px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-lg font-bold text-ivs-accent">
                  ${((form.amount || 0) + (form.tax_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-ivs-text">Notes</h3>
            <textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputCls} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 pb-8">
            <button onClick={() => { setEditing(false); setForm(invoice); }} className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </>
      ) : (
        /* Read-only View */
        <>
          {/* Job Reference */}
          {invoice.job_card && (
            <Section icon={<FileText size={18} />} title="Job Reference">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-ivs-text-muted text-xs">Job Number</p>
                  <Link href={`/dashboard/jobs/${invoice.job_card.id}`} className="text-ivs-accent hover:underline font-mono">
                    {invoice.job_card.job_number}
                  </Link>
                </div>
                <div>
                  <p className="text-ivs-text-muted text-xs">Project</p>
                  <p className="text-ivs-text">{invoice.job_card.project_name}</p>
                </div>
                <div>
                  <p className="text-ivs-text-muted text-xs">Contract Value</p>
                  <p className="text-ivs-text">{invoice.job_card.contract_value ? `$${invoice.job_card.contract_value.toLocaleString()}` : "—"}</p>
                </div>
              </div>
            </Section>
          )}

          {/* Description */}
          {invoice.description && (
            <Section icon={<FileText size={18} />} title="Description">
              <p className="text-sm text-ivs-text-muted">{invoice.description}</p>
            </Section>
          )}

          {/* Dates */}
          <Section icon={<Calendar size={18} />} title="Dates">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-xs text-ivs-text-muted">Created</p>
                <p className="text-ivs-text">{new Date(invoice.created_at).toLocaleDateString()}</p>
              </div>
              {invoice.issued_date && (
                <div>
                  <p className="text-xs text-ivs-text-muted">Issued</p>
                  <p className="text-ivs-text">{new Date(invoice.issued_date).toLocaleDateString()}</p>
                </div>
              )}
              {invoice.due_date && (
                <div>
                  <p className="text-xs text-ivs-text-muted">Due</p>
                  <p className="text-ivs-text">{new Date(invoice.due_date).toLocaleDateString()}</p>
                </div>
              )}
              {invoice.paid_date && (
                <div>
                  <p className="text-xs text-ivs-text-muted">Paid</p>
                  <p className="text-emerald-400">{new Date(invoice.paid_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </Section>

          {/* Created By */}
          {invoice.created_by_employee && (
            <Section icon={<FileText size={18} />} title="Created By">
              <p className="text-sm text-ivs-text">{invoice.created_by_employee.first_name} {invoice.created_by_employee.last_name}</p>
            </Section>
          )}

          {/* Notes */}
          {invoice.notes && (
            <Section icon={<FileText size={18} />} title="Notes">
              <p className="text-sm text-ivs-text-muted whitespace-pre-wrap">{invoice.notes}</p>
            </Section>
          )}

          {/* Delete */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
            >
              <Trash2 size={16} /> Delete Invoice
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-ivs-text mb-2">Delete Invoice?</h2>
            <p className="text-sm text-ivs-text-muted mb-6">
              This will permanently delete <strong className="text-ivs-text">{invoice.invoice_number}</strong>. This action cannot be undone.
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

function InfoCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-ivs-text-muted mb-1">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-lg font-bold ${accent ? "text-ivs-accent" : "text-ivs-text"}`}>{value}</p>
    </div>
  );
}
