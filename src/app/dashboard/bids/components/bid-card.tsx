"use client";

import { Draggable } from "@hello-pangea/dnd";
import type { Bid } from "@/lib/types";
import { MapPin, DollarSign, Calendar, ArrowRightCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface BidCardProps {
  bid: Bid;
  index: number;
  onConvertToJob?: (bid: Bid) => void;
}

export function BidCard({ bid, index, onConvertToJob }: BidCardProps) {
  const router = useRouter();
  const formatCurrency = (val: number | null) =>
    val ? `$${val.toLocaleString()}` : "—";

  return (
    <Draggable draggableId={bid.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => router.push(`/dashboard/bids/${bid.id}`)}
          className={`bg-ivs-bg border border-ivs-border rounded-lg p-3 mb-2 cursor-grab active:cursor-grabbing transition-shadow hover:border-ivs-accent/40 ${
            snapshot.isDragging ? "shadow-lg shadow-ivs-accent/20 border-ivs-accent/40" : ""
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs font-mono text-ivs-accent">{bid.bid_number}</span>
          </div>
          <h4 className="text-sm font-medium text-ivs-text mb-1 line-clamp-2">
            {bid.project_name}
          </h4>
          <p className="text-xs text-ivs-text-muted mb-2">{bid.client_name}</p>

          <div className="space-y-1">
            {bid.location && (
              <div className="flex items-center gap-1.5 text-xs text-ivs-text-muted">
                <MapPin size={12} />
                <span className="truncate">{bid.location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-ivs-text-muted">
              <DollarSign size={12} />
              <span>{formatCurrency(bid.estimated_value)}</span>
            </div>
            {bid.submitted_date && (
              <div className="flex items-center gap-1.5 text-xs text-ivs-text-muted">
                <Calendar size={12} />
                <span>{new Date(bid.submitted_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {bid.status === "won" && onConvertToJob && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConvertToJob(bid);
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-ivs-success/15 text-ivs-success text-xs font-medium rounded-md hover:bg-ivs-success/25 transition-colors"
            >
              <ArrowRightCircle size={14} />
              Convert to Job
            </button>
          )}
        </div>
      )}
    </Draggable>
  );
}
