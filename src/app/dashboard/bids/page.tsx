"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { KanbanColumn } from "./components/kanban-column";
import { ImportModal } from "./components/import-modal";
import { ConvertToJobModal } from "./components/convert-to-job-modal";
import { createClient } from "@/lib/supabase/client";
import { BID_KANBAN_COLUMNS, type Bid, type KanbanColumnId } from "@/lib/types";
import { Upload, Plus, RefreshCw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COLUMN_ORDER: KanbanColumnId[] = ["draft", "submitted", "won", "lost", "cancelled"];

export default function BidsPage() {
  const [bids, setBids] = useState<Record<KanbanColumnId, Bid[]>>({
    draft: [],
    submitted: [],
    won: [],
    lost: [],
    cancelled: [],
  });
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [convertBid, setConvertBid] = useState<Bid | null>(null);
  const [search, setSearch] = useState("");
  const supabase = createClient();
  const router = useRouter();

  const fetchBids = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const grouped: Record<KanbanColumnId, Bid[]> = {
        draft: [],
        submitted: [],
        won: [],
        lost: [],
        cancelled: [],
      };
      data.forEach((bid: Bid) => {
        if (grouped[bid.status]) {
          grouped[bid.status].push(bid);
        }
      });
      setBids(grouped);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = source.droppableId as KanbanColumnId;
    const destCol = destination.droppableId as KanbanColumnId;

    const newBids = { ...bids };
    const sourceItems = [...newBids[sourceCol]];
    const [movedBid] = sourceItems.splice(source.index, 1);
    newBids[sourceCol] = sourceItems;

    const destItems = sourceCol === destCol ? sourceItems : [...newBids[destCol]];
    const updatedBid = { ...movedBid, status: destCol };
    destItems.splice(destination.index, 0, updatedBid);
    newBids[destCol] = destItems;

    setBids(newBids);

    // Persist status change
    if (sourceCol !== destCol) {
      await supabase
        .from("bids")
        .update({ status: destCol })
        .eq("id", draggableId);
    }
  };

  const handleImport = async (importedBids: Partial<Bid>[]) => {
    const { error } = await supabase.from("bids").insert(
      importedBids.map((b) => ({
        bid_number: b.bid_number,
        project_name: b.project_name,
        client_name: b.client_name,
        client_contact: b.client_contact,
        client_email: b.client_email,
        client_phone: b.client_phone,
        location: b.location,
        description: b.description,
        estimated_value: b.estimated_value,
        estimated_duration_days: b.estimated_duration_days,
        status: "draft",
      }))
    );
    if (!error) fetchBids();
  };

  const handleConvertToJob = async (
    bid: Bid,
    jobData: { job_number: string; contract_value: number | null; start_date: string }
  ) => {
    const { error } = await supabase.from("job_cards").insert({
      job_number: jobData.job_number,
      bid_id: bid.id,
      project_name: bid.project_name,
      client_name: bid.client_name,
      location: bid.location,
      description: bid.description,
      contract_value: jobData.contract_value || bid.awarded_value || bid.estimated_value,
      start_date: jobData.start_date || null,
      status: "pending",
    });
    if (!error) {
      router.push("/dashboard/jobs");
    }
  };

  const filterBids = (list: Bid[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((b) =>
      `${b.bid_number} ${b.project_name} ${b.client_name} ${b.location || ""}`.toLowerCase().includes(q)
    );
  };

  const totalPipeline = Object.values(bids)
    .flat()
    .reduce((sum, b) => sum + (b.estimated_value || 0), 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ivs-text">Bid Tracker</h1>
          <p className="text-sm text-ivs-text-muted mt-1">
            Pipeline: ${totalPipeline.toLocaleString()} &middot;{" "}
            {Object.values(bids).flat().length} total bids
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-ivs-bg-card border border-ivs-border rounded-lg px-3 py-2 w-56">
            <Search size={16} className="text-ivs-text-muted flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bids..."
              className="bg-transparent text-sm text-ivs-text placeholder-ivs-text-muted outline-none w-full"
            />
          </div>
          <button
            onClick={fetchBids}
            className="p-2 text-ivs-text-muted hover:text-ivs-text hover:bg-ivs-bg-card rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-ivs-bg-card border border-ivs-border text-ivs-text text-sm font-medium rounded-lg hover:border-ivs-accent/40 transition-colors"
          >
            <Upload size={16} />
            Import
          </button>
          <Link
            href="/dashboard/bids/new"
            className="flex items-center gap-2 px-4 py-2 bg-ivs-accent hover:bg-ivs-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Bid
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-2 border-ivs-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto flex-1 pb-4">
            {COLUMN_ORDER.map((colId) => (
              <KanbanColumn
                key={colId}
                columnId={colId}
                bids={filterBids(bids[colId])}
                onConvertToJob={(bid) => setConvertBid(bid)}
              />
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Modals */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
      <ConvertToJobModal
        open={!!convertBid}
        bid={convertBid}
        onClose={() => setConvertBid(null)}
        onConvert={handleConvertToJob}
      />
    </div>
  );
}
