"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { DollarSign, Search, Filter, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  description: string | null;
  status: string;
  amount: number;
  total_amount: number;
  issued_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  job_card: { job_number: string; project_name: string; client_name: string } | null;
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-500/15", text: "text-gray-400" },
  sent: { bg: "bg-blue-500/15", text: "text-blue-500" },
  paid: { bg: "bg-emerald-500/15", text: "text-emerald-500" },
  overdue: { bg: "bg-red-500/15", text: "text-red-500" },
  void: { bg: "bg-gray-600/15", text: "text-gray-500" },
};

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number, description, status, amount, total_amount,
        issued_date, due_date, paid_date,
        job_card:job_cards!job_card_id (job_number, project_name, client_name)
      `)
      .order("created_at", { ascending: false });
    if (data) setInvoices(data as unknown as InvoiceRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const filtered = invoices.filter((inv) => {
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const text = `${inv.invoice_number} ${inv.job_card?.job_number} ${inv.job_card?.client_name}`.toLowerCase();
    return matchesStatus && text.includes(search.toLowerCase());
  });

  const totalOutstanding = invoices.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.total_amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ivs-text">Invoicing</h1>
          <p className="text-sm text-ivs-text-muted mt-1">
            ${totalOutstanding.toLocaleString()} outstanding &middot; ${totalPaid.toLocaleString()} collected
          </p>
        </div>
        <Link
          href="/dashboard/invoicing/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> New Invoice
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-ivs-bg-card border border-ivs-border rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search size={16} className="text-ivs-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." className="bg-transparent text-sm text-ivs-text placeholder-ivs-text-muted outline-none w-full" />
        </div>
        <div className="flex items-center gap-1 bg-ivs-bg-light border border-ivs-border rounded-lg p-0.5">
          <Filter size={14} className="text-ivs-text-muted ml-2" />
          {["all", "draft", "sent", "paid", "overdue"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${statusFilter === s ? "bg-ivs-accent text-white" : "text-ivs-text-muted hover:text-ivs-text"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-ivs-bg-card border border-ivs-border rounded-xl">
          <DollarSign className="mx-auto mb-3 text-ivs-text-muted" size={32} />
          <p className="text-ivs-text-muted">No invoices found</p>
        </div>
      ) : (
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivs-border text-xs text-ivs-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Invoice #</th>
                <th className="px-4 py-3 text-left">Job</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Issued</th>
                <th className="px-4 py-3 text-left">Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const badge = STATUS_BADGE[inv.status] ?? STATUS_BADGE.draft;
                return (
                  <tr key={inv.id} onClick={() => router.push(`/dashboard/invoicing/${inv.id}`)} className="border-b border-ivs-border/50 hover:bg-ivs-bg-light/50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-mono text-sm text-ivs-accent">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-xs font-mono text-ivs-text-muted">{inv.job_card?.job_number}</td>
                    <td className="px-4 py-3 text-sm text-ivs-text">{inv.job_card?.client_name}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${badge.bg} ${badge.text}`}>{inv.status}</span></td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-ivs-text">${inv.total_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-ivs-text-muted">{inv.issued_date ? new Date(inv.issued_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-ivs-text-muted">{inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
