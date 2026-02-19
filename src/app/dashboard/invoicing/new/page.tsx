"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import type { JobCard } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, DollarSign, Save } from "lucide-react";

interface InvoiceFormData {
  job_card_id: string;
  invoice_number: string;
  description: string;
  amount: number | null;
  tax_amount: number | null;
  issued_date: string;
  due_date: string;
  notes: string;
}

const INITIAL: InvoiceFormData = {
  job_card_id: "",
  invoice_number: "",
  description: "",
  amount: null,
  tax_amount: null,
  issued_date: new Date().toISOString().split("T")[0],
  due_date: getThirtyDaysOut(),
  notes: "",
};

function getThirtyDaysOut(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

interface JobOption extends Pick<JobCard, "id" | "job_number" | "project_name" | "client_name" | "contract_value"> {}

export default function NewInvoicePage() {
  const router = useRouter();
  const { employee } = useAuth();
  const [form, setForm] = useState<InvoiceFormData>(INITIAL);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from("job_cards")
      .select("id, job_number, project_name, client_name, contract_value")
      .in("status", ["active", "mobilizing", "complete"])
      .order("job_number");
    if (data) setJobs(data as JobOption[]);
  }, [supabase]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Auto-generate invoice number when job changes
  useEffect(() => {
    if (!form.job_card_id) return;
    const job = jobs.find((j) => j.id === form.job_card_id);
    if (job) {
      const now = new Date();
      const num = `INV-${job.job_number}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      setForm((prev) => ({ ...prev, invoice_number: num }));
    }
  }, [form.job_card_id, jobs]);

  const update = <K extends keyof InvoiceFormData>(key: K, value: InvoiceFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const amount = form.amount ?? 0;
  const tax = form.tax_amount ?? 0;
  const total = amount + tax;
  const selectedJob = jobs.find((j) => j.id === form.job_card_id);

  const handleSave = async () => {
    if (!form.job_card_id || !form.invoice_number) {
      setError("Job and Invoice Number are required.");
      return;
    }
    if (!amount) {
      setError("Amount is required.");
      return;
    }
    if (!employee) {
      setError("Not logged in.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      job_card_id: form.job_card_id,
      invoice_number: form.invoice_number,
      description: form.description || null,
      status: "draft" as const,
      amount,
      tax_amount: tax,
      total_amount: total,
      issued_date: form.issued_date || null,
      due_date: form.due_date || null,
      created_by: employee.id,
      notes: form.notes || null,
    };

    const { error: dbErr } = await supabase.from("invoices").insert(payload);
    setSaving(false);
    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    router.push("/dashboard/invoicing");
  };

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/invoicing" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ivs-text flex items-center gap-2">
            <DollarSign size={24} className="text-ivs-accent" /> New Invoice
          </h1>
          <p className="text-sm text-ivs-text-muted mt-1">Create a new invoice for a job</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Job Selection */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Job</h3>
        <div>
          <label className={labelCls}>Select Job *</label>
          <select value={form.job_card_id} onChange={(e) => update("job_card_id", e.target.value)} className={inputCls} required>
            <option value="">Select job...</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.job_number} - {j.project_name} ({j.client_name})</option>
            ))}
          </select>
        </div>
        {selectedJob && (
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-ivs-bg rounded-lg border border-ivs-border p-3">
              <p className="text-xs text-ivs-text-muted">Client</p>
              <p className="text-sm font-medium text-ivs-text">{selectedJob.client_name}</p>
            </div>
            <div className="bg-ivs-bg rounded-lg border border-ivs-border p-3">
              <p className="text-xs text-ivs-text-muted">Contract Value</p>
              <p className="text-sm font-medium text-ivs-text">
                {selectedJob.contract_value ? `$${Number(selectedJob.contract_value).toLocaleString()}` : "Not set"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Details */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Invoice Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Invoice Number *</label>
            <input type="text" value={form.invoice_number} onChange={(e) => update("invoice_number", e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input type="text" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="e.g., Progress billing #3" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Issue Date</label>
            <input type="date" value={form.issued_date} onChange={(e) => update("issued_date", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Due Date</label>
            <input type="date" value={form.due_date} onChange={(e) => update("due_date", e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      {/* Amounts */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Amounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Amount *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ivs-text-muted text-sm">$</span>
              <input
                type="number"
                step="0.01"
                value={form.amount ?? ""}
                onChange={(e) => update("amount", e.target.value ? parseFloat(e.target.value) : null)}
                className={`${inputCls} pl-7`}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Tax</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ivs-text-muted text-sm">$</span>
              <input
                type="number"
                step="0.01"
                value={form.tax_amount ?? ""}
                onChange={(e) => update("tax_amount", e.target.value ? parseFloat(e.target.value) : null)}
                className={`${inputCls} pl-7`}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Total</label>
            <div className="px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-lg font-bold text-ivs-accent">
              ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
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
          placeholder="Payment terms, special instructions..."
          className={inputCls}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-8">
        <Link href="/dashboard/invoicing" className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Creating..." : "Create Invoice"}
        </button>
      </div>
    </div>
  );
}
