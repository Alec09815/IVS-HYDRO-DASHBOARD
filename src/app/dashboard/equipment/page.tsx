"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Equipment, EquipmentStatus } from "@/lib/types";
import { Wrench, Search, Filter } from "lucide-react";

const STATUS_BADGE: Record<EquipmentStatus, { bg: string; text: string; label: string }> = {
  available: { bg: "bg-emerald-500/15", text: "text-emerald-500", label: "Available" },
  deployed: { bg: "bg-blue-500/15", text: "text-blue-500", label: "Deployed" },
  maintenance: { bg: "bg-orange-500/15", text: "text-orange-500", label: "Maintenance" },
  retired: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Retired" },
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("equipment").select("*").order("name");
    if (data) setEquipment(data as Equipment[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  const filtered = equipment.filter((e) => {
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    const text = `${e.name} ${e.asset_number} ${e.make} ${e.model} ${e.category}`.toLowerCase();
    return matchesStatus && text.includes(search.toLowerCase());
  });

  const availableCount = equipment.filter((e) => e.status === "available").length;
  const deployedCount = equipment.filter((e) => e.status === "deployed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ivs-text">Equipment</h1>
        <p className="text-sm text-ivs-text-muted mt-1">
          {equipment.length} total &middot; {availableCount} available &middot; {deployedCount} deployed
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-ivs-bg-card border border-ivs-border rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search size={16} className="text-ivs-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search equipment..." className="bg-transparent text-sm text-ivs-text placeholder-ivs-text-muted outline-none w-full" />
        </div>
        <div className="flex items-center gap-1 bg-ivs-bg-light border border-ivs-border rounded-lg p-0.5">
          <Filter size={14} className="text-ivs-text-muted ml-2" />
          {["all", "available", "deployed", "maintenance", "retired"].map((s) => (
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
          <Wrench className="mx-auto mb-3 text-ivs-text-muted" size={32} />
          <p className="text-ivs-text-muted">No equipment found</p>
        </div>
      ) : (
        <div className="bg-ivs-bg-card border border-ivs-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ivs-border text-xs text-ivs-text-muted uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Asset #</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Make / Model</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Hours</th>
                <th className="px-4 py-3 text-left">Next Service</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((eq) => {
                const badge = STATUS_BADGE[eq.status];
                return (
                  <tr key={eq.id} className="border-b border-ivs-border/50 hover:bg-ivs-bg-light/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-ivs-accent">{eq.asset_number}</td>
                    <td className="px-4 py-3 text-sm font-medium text-ivs-text">{eq.name}</td>
                    <td className="px-4 py-3 text-xs text-ivs-text-muted">{eq.category}</td>
                    <td className="px-4 py-3 text-xs text-ivs-text-muted">{[eq.make, eq.model].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span></td>
                    <td className="px-4 py-3 text-right text-sm text-ivs-text">{eq.hour_meter_reading ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-ivs-text-muted">{eq.next_service_date ? new Date(eq.next_service_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
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
