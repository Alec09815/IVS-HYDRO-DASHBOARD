"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BarChart3, Calendar, Search, Plus } from "lucide-react";
import Link from "next/link";

interface ProductionRow {
  id: string;
  form_date: string;
  area_location: string | null;
  quantity_completed: number | null;
  unit: string | null;
  pump_hours: number | null;
  downtime_hours: number | null;
  downtime_reason: string | null;
  submitted: boolean;
  job_card: { job_number: string; project_name: string } | null;
  operator: { first_name: string; last_name: string } | null;
}

export default function ProductionPage() {
  const [records, setRecords] = useState<ProductionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("production_forms")
      .select(`
        id, form_date, area_location, quantity_completed, unit, pump_hours,
        downtime_hours, downtime_reason, submitted,
        job_card:job_cards!job_card_id (job_number, project_name),
        operator:employees!operator_id (first_name, last_name)
      `)
      .order("form_date", { ascending: false });
    if (data) setRecords(data as unknown as ProductionRow[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = records.filter((r) => {
    const text = `${r.job_card?.job_number} ${r.job_card?.project_name} ${r.operator?.first_name} ${r.operator?.last_name}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const totalQty = filtered.reduce((s, r) => s + (r.quantity_completed || 0), 0);
  const totalPumpHrs = filtered.reduce((s, r) => s + (r.pump_hours || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ivs-text">Production</h1>
          <p className="text-sm text-ivs-text-muted mt-1">
            {filtered.length} records &middot; {totalQty.toLocaleString()} total qty &middot; {totalPumpHrs.toFixed(1)} pump hours
          </p>
        </div>
        <Link
          href="/dashboard/field/production"
          className="flex items-center gap-2 px-4 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> New Entry
        </Link>
      </div>

      <div className="flex items-center gap-2 bg-ivs-bg-card border border-ivs-border rounded-lg px-3 py-2 max-w-sm">
        <Search size={16} className="text-ivs-text-muted" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by job or operator..." className="bg-transparent text-sm text-ivs-text placeholder-ivs-text-muted outline-none w-full" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-ivs-bg-card border border-ivs-border rounded-xl">
          <BarChart3 className="mx-auto mb-3 text-ivs-text-muted" size={32} />
          <p className="text-ivs-text-muted">No production records found</p>
        </div>
      ) : (
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivs-border text-xs text-ivs-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Job</th>
                <th className="px-4 py-3 text-left">Operator</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Pump Hrs</th>
                <th className="px-4 py-3 text-right">Downtime</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-ivs-border/50 hover:bg-ivs-bg-light/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-ivs-text">
                    <div className="flex items-center gap-1.5"><Calendar size={13} className="text-ivs-text-muted" />{new Date(r.form_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs font-mono text-ivs-accent">{r.job_card?.job_number}</span></td>
                  <td className="px-4 py-3 text-sm text-ivs-text-muted">{r.operator?.first_name} {r.operator?.last_name}</td>
                  <td className="px-4 py-3 text-xs text-ivs-text-muted">{r.area_location || "—"}</td>
                  <td className="px-4 py-3 text-right text-sm text-ivs-text">{r.quantity_completed ?? "—"} {r.unit || ""}</td>
                  <td className="px-4 py-3 text-right text-sm text-ivs-text">{r.pump_hours ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-sm text-ivs-warning">{r.downtime_hours ? `${r.downtime_hours}h` : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${r.submitted ? "bg-emerald-500/15 text-emerald-500" : "bg-gray-500/15 text-gray-400"}`}>
                      {r.submitted ? "Submitted" : "Draft"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
