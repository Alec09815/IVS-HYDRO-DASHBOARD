"use client";

import { Droppable } from "@hello-pangea/dnd";
import { BidCard } from "./bid-card";
import type { Bid, KanbanColumnId } from "@/lib/types";
import { BID_KANBAN_COLUMNS } from "@/lib/types";

interface KanbanColumnProps {
  columnId: KanbanColumnId;
  bids: Bid[];
  onConvertToJob?: (bid: Bid) => void;
}

export function KanbanColumn({ columnId, bids, onConvertToJob }: KanbanColumnProps) {
  const column = BID_KANBAN_COLUMNS[columnId];

  return (
    <div className="flex flex-col w-72 min-w-[288px] bg-ivs-bg-light rounded-xl border border-ivs-border">
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ivs-border">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-sm font-semibold text-ivs-text">{column.label}</h3>
        </div>
        <span className="text-xs text-ivs-text-muted bg-ivs-bg px-2 py-0.5 rounded-full">
          {bids.length}
        </span>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-2 overflow-y-auto min-h-[200px] transition-colors ${
              snapshot.isDraggingOver ? "bg-ivs-accent/5" : ""
            }`}
          >
            {bids.map((bid, index) => (
              <BidCard
                key={bid.id}
                bid={bid}
                index={index}
                onConvertToJob={columnId === "won" ? onConvertToJob : undefined}
              />
            ))}
            {provided.placeholder}
            {bids.length === 0 && (
              <div className="text-center py-8 text-xs text-ivs-text-muted">
                No bids
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
