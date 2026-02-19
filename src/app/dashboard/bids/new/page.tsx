"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/contexts/toast-context";
import type { Employee } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, FileText, Save, Send } from "lucide-react";

export default function NewBidPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [bidNumber, setBidNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [estimatorId, setEstimatorId] = useState("");
  const [notes, setNotes] = useState("");
  const [estimators, setEstimators] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const fetchLookups = useCallback(async () => {
    // Generate next bid number
    const { data: bids } = await supabase.from("bids").select("bid_number").order("created_at", { ascending: false }).limit(1);
    const year = new Date().getFullYear();
    if (bids && bids.length > 0) {
      const last = bids[0].bid_number;
      const match = last.match(/(\d+)$/);
      const next = match ? parseInt(match[1]) + 1 : 1;
      setBidNumber(`BID-${year}-${String(next).padStart(3, "0")}`);
    } else {
      setBidNumber(`BID-${year}-001`);
    }

    // Fetch estimators
    const { data: emps } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("is_active", true)
      .in("role", ["estimator", "pm", "admin"])
      .order("last_name");
    if (emps) setEstimators(emps as Employee[]);
  }, [supabase]);

  useEffect(() => { fetchLookups(); }, [fetchLookups]);

  const handleSave = async (submit: boolean) => {
    if (!projectName || !clientName) {
      setError("Project name and client name are required.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      bid_number: bidNumber,
      project_name: projectName,
      client_name: clientName,
      client_contact: clientContact || null,
      client_email: clientEmail || null,
      client_phone: clientPhone || null,
      location: location || null,
      description: description || null,
      estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
      estimated_duration_days: estimatedDuration ? parseInt(estimatedDuration) : null,
      estimator_id: estimatorId || null,
      notes: notes || null,
      status: submit ? "submitted" : "draft",
      submitted_date: submit ? new Date().toISOString().split("T")[0] : null,
    };

    const { data, error: dbErr } = await supabase.from("bids").insert(payload).select().single();
    setSaving(false);
    if (dbErr) {
      showError(dbErr.message);
      setError(dbErr.message);
      return;
    }
    success(submit ? "Bid submitted" : "Bid draft saved");
    if (data) {
      router.push(`/dashboard/bids/${data.id}`);
    } else {
      router.push("/dashboard/bids");
    }
  };

  const inputCls = "w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent";
  const labelCls = "block text-sm font-medium text-ivs-text-muted mb-1";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/bids" className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ivs-text flex items-center gap-2">
            <FileText size={24} className="text-ivs-accent" /> New Bid
          </h1>
          <p className="text-sm text-ivs-text-muted mt-1">Create a new bid estimate</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Bid Info */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Bid Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Bid Number</label>
            <input type="text" value={bidNumber} onChange={(e) => setBidNumber(e.target.value)} className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className={labelCls}>Estimator</label>
            <select value={estimatorId} onChange={(e) => setEstimatorId(e.target.value)} className={inputCls}>
              <option value="">Unassigned</option>
              {estimators.map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Project Name *</label>
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Estimated Value ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ivs-text-muted text-sm">$</span>
              <input type="number" step="0.01" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="0.00" className={`${inputCls} pl-7`} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Est. Duration (days)</label>
            <input type="number" value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)} placeholder="e.g., 30" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Client Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Client Name *</label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Company name..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contact Name</label>
            <input type="text" value={clientContact} onChange={(e) => setClientContact(e.target.value)} placeholder="Contact person..." className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="email@company.com" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(555) 123-4567" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Description & Notes */}
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ivs-text">Scope & Notes</h3>
        <div>
          <label className={labelCls}>Description / Scope</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe the scope of work..." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Internal notes..." className={inputCls} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-8">
        <Link href="/dashboard/bids" className="px-4 py-2.5 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors">
          Cancel
        </Link>
        <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors disabled:opacity-50">
          <Save size={16} /> Save as Draft
        </button>
        <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          <Send size={16} /> Submit Bid
        </button>
      </div>
    </div>
  );
}
