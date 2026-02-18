"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { HardHat, FileText, Gauge, Calendar } from "lucide-react";
import Link from "next/link";

export default function FieldAppPage() {
  const [calibrations, setCalibrations] = useState(0);
  const [productions, setProductions] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const [calRes, prodRes] = await Promise.all([
      supabase.from("calibration_forms").select("id", { count: "exact", head: true }).eq("form_date", today),
      supabase.from("production_forms").select("id", { count: "exact", head: true }).eq("form_date", today),
    ]);
    setCalibrations(calRes.count ?? 0);
    setProductions(prodRes.count ?? 0);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ivs-text">Field App</h1>
        <p className="text-sm text-ivs-text-muted mt-1">Daily calibration and production forms</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Today's summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-ivs-text-muted mb-2">
                <Calendar size={16} />
                <span className="text-xs font-medium uppercase tracking-wide">Today</span>
              </div>
              <p className="text-lg font-bold text-ivs-text">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            </div>
            <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-ivs-text-muted mb-2">
                <Gauge size={16} />
                <span className="text-xs font-medium uppercase tracking-wide">Calibrations Today</span>
              </div>
              <p className="text-lg font-bold text-ivs-text">{calibrations}</p>
            </div>
            <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-ivs-text-muted mb-2">
                <FileText size={16} />
                <span className="text-xs font-medium uppercase tracking-wide">Production Forms Today</span>
              </div>
              <p className="text-lg font-bold text-ivs-text">{productions}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-ivs-text mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <QuickAction icon={<Gauge size={24} />} title="Calibration Form" description="Record pump calibration data" color="from-cyan-500/20 to-cyan-600/5" />
              <QuickAction icon={<FileText size={24} />} title="Production Form" description="Log daily production quantities" color="from-emerald-500/20 to-emerald-600/5" />
              <QuickAction icon={<HardHat size={24} />} title="Safety Checklist" description="Complete pre-shift safety check" color="from-orange-500/20 to-orange-600/5" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function QuickAction({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <button className="text-left bg-ivs-bg-card border border-ivs-border rounded-xl p-5 hover:border-ivs-accent/40 transition-all group">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-ivs-text mb-3 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-ivs-text group-hover:text-ivs-accent transition-colors">{title}</h3>
      <p className="text-xs text-ivs-text-muted mt-1">{description}</p>
    </button>
  );
}
