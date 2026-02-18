"use client";

import { useState } from "react";
import { X, ArrowRightCircle } from "lucide-react";
import type { Bid } from "@/lib/types";

interface ConvertToJobModalProps {
  open: boolean;
  bid: Bid | null;
  onClose: () => void;
  onConvert: (bid: Bid, jobData: { job_number: string; contract_value: number | null; start_date: string }) => void;
}

export function ConvertToJobModal({ open, bid, onClose, onConvert }: ConvertToJobModalProps) {
  const [jobNumber, setJobNumber] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [startDate, setStartDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bid) return;
    onConvert(bid, {
      job_number: jobNumber,
      contract_value: contractValue ? parseFloat(contractValue) : null,
      start_date: startDate,
    });
    setJobNumber("");
    setContractValue("");
    setStartDate("");
    onClose();
  };

  if (!open || !bid) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ivs-border">
          <div className="flex items-center gap-2">
            <ArrowRightCircle size={20} className="text-ivs-success" />
            <h2 className="text-lg font-semibold text-ivs-text">Convert to Job</h2>
          </div>
          <button onClick={onClose} className="text-ivs-text-muted hover:text-ivs-text">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Bid Info */}
          <div className="bg-ivs-bg rounded-lg border border-ivs-border p-3">
            <p className="text-xs text-ivs-text-muted">Converting from bid</p>
            <p className="text-sm font-medium text-ivs-accent">{bid.bid_number}</p>
            <p className="text-sm text-ivs-text">{bid.project_name}</p>
            <p className="text-xs text-ivs-text-muted">{bid.client_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ivs-text-muted mb-1">
              Job Number *
            </label>
            <input
              type="text"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              required
              placeholder="e.g., JOB-2026-001"
              className="w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ivs-text-muted mb-1">
              Contract Value
            </label>
            <input
              type="number"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              placeholder={bid.awarded_value?.toString() || bid.estimated_value?.toString() || "0"}
              className="w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm placeholder-ivs-text-muted focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ivs-text-muted mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-ivs-text text-sm focus:outline-none focus:ring-2 focus:ring-ivs-accent focus:border-transparent"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-ivs-success hover:bg-ivs-success/80 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create Job Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
