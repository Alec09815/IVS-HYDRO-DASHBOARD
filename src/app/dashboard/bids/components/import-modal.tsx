"use client";

import { useState, useCallback } from "react";
import { X, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import Papa from "papaparse";
import type { Bid } from "@/lib/types";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (bids: Partial<Bid>[]) => void;
}

interface ParsedRow {
  bid_number?: string;
  project_name?: string;
  client_name?: string;
  client_contact?: string;
  client_email?: string;
  client_phone?: string;
  location?: string;
  description?: string;
  estimated_value?: string;
  estimated_duration_days?: string;
  [key: string]: string | undefined;
}

export function ImportModal({ open, onClose, onImport }: ImportModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<Partial<Bid>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const processCSV = useCallback((text: string) => {
    const result = Papa.parse<ParsedRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_"),
    });

    if (result.errors.length > 0) {
      setError(`CSV parse error: ${result.errors[0].message}`);
      return;
    }

    const bids: Partial<Bid>[] = result.data.map((row) => ({
      bid_number: row.bid_number || row.bid_number || "",
      project_name: row.project_name || row.project || "",
      client_name: row.client_name || row.client || row.owner || "",
      client_contact: row.client_contact || row.contact || null,
      client_email: row.client_email || row.email || null,
      client_phone: row.client_phone || row.phone || null,
      location: row.location || row.city || null,
      description: row.description || row.scope || null,
      estimated_value: row.estimated_value ? parseFloat(row.estimated_value.replace(/[,$]/g, "")) : null,
      estimated_duration_days: row.estimated_duration_days ? parseInt(row.estimated_duration_days) : null,
      status: "draft" as const,
    }));

    setParsed(bids.filter((b) => b.bid_number && b.project_name));
    setError(null);
  }, []);

  const processXML = useCallback((text: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/xml");
      const errorNode = doc.querySelector("parsererror");
      if (errorNode) {
        setError("Invalid XML file");
        return;
      }

      // Support common XML structures: look for bid/estimate/item elements
      const items = doc.querySelectorAll("bid, estimate, item, Bid, Estimate, Item");
      if (items.length === 0) {
        setError("No bid/estimate elements found in XML");
        return;
      }

      const bids: Partial<Bid>[] = Array.from(items).map((item) => {
        const getText = (tags: string[]) => {
          for (const tag of tags) {
            const el = item.querySelector(tag);
            if (el?.textContent) return el.textContent.trim();
          }
          return null;
        };

        return {
          bid_number: getText(["bid_number", "BidNumber", "number", "Number", "id", "ID"]) || "",
          project_name: getText(["project_name", "ProjectName", "project", "Project", "name", "Name"]) || "",
          client_name: getText(["client_name", "ClientName", "client", "Client", "owner", "Owner"]) || "",
          client_contact: getText(["contact", "Contact"]),
          location: getText(["location", "Location", "city", "City"]),
          description: getText(["description", "Description", "scope", "Scope"]),
          estimated_value: (() => {
            const val = getText(["estimated_value", "EstimatedValue", "value", "Value", "amount", "Amount"]);
            return val ? parseFloat(val.replace(/[,$]/g, "")) : null;
          })(),
          status: "draft" as const,
        };
      });

      setParsed(bids.filter((b) => b.bid_number && b.project_name));
      setError(null);
    } catch {
      setError("Failed to parse XML file");
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      setParsed([]);
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (file.name.endsWith(".xml")) {
          processXML(text);
        } else {
          processCSV(text);
        }
      };
      reader.readAsText(file);
    },
    [processCSV, processXML]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleConfirm = () => {
    onImport(parsed);
    setParsed([]);
    setFileName(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-ivs-bg-card border border-ivs-border rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ivs-border">
          <h2 className="text-lg font-semibold text-ivs-text">Import Bids</h2>
          <button onClick={onClose} className="text-ivs-text-muted hover:text-ivs-text">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver
                ? "border-ivs-accent bg-ivs-accent/5"
                : "border-ivs-border"
            }`}
          >
            <Upload className="mx-auto mb-3 text-ivs-text-muted" size={32} />
            <p className="text-sm text-ivs-text mb-1">
              Drag & drop a CSV or XML file here
            </p>
            <p className="text-xs text-ivs-text-muted mb-3">
              Supports Heavy Bid XML and Excel CSV exports
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-ivs-bg border border-ivs-border rounded-lg text-sm text-ivs-text hover:border-ivs-accent/40 cursor-pointer transition-colors">
              <FileText size={16} />
              Browse Files
              <input
                type="file"
                accept=".csv,.xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-ivs-danger text-sm bg-ivs-danger/10 border border-ivs-danger/20 rounded-lg p-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Preview */}
          {parsed.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={16} className="text-ivs-success" />
                <span className="text-sm text-ivs-text">
                  {parsed.length} bids found in <span className="font-mono text-ivs-accent">{fileName}</span>
                </span>
              </div>
              <div className="bg-ivs-bg rounded-lg border border-ivs-border overflow-x-auto max-h-60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-ivs-border text-ivs-text-muted">
                      <th className="px-3 py-2 text-left">Bid #</th>
                      <th className="px-3 py-2 text-left">Project</th>
                      <th className="px-3 py-2 text-left">Client</th>
                      <th className="px-3 py-2 text-right">Est. Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((bid, i) => (
                      <tr key={i} className="border-b border-ivs-border/50">
                        <td className="px-3 py-2 text-ivs-accent font-mono">{bid.bid_number}</td>
                        <td className="px-3 py-2 text-ivs-text">{bid.project_name}</td>
                        <td className="px-3 py-2 text-ivs-text-muted">{bid.client_name}</td>
                        <td className="px-3 py-2 text-right text-ivs-text-muted">
                          {bid.estimated_value ? `$${bid.estimated_value.toLocaleString()}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ivs-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-ivs-text-muted hover:text-ivs-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={parsed.length === 0}
            className="px-4 py-2 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {parsed.length} Bids
          </button>
        </div>
      </div>
    </div>
  );
}
