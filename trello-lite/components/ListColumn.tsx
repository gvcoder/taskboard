"use client";

import { useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { Plus, Trash2 } from "lucide-react";
import { CardItem } from "./CardItem";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { Card, Label, List } from "@prisma/client";

type CardWithLabels = Card & { labels: Label[] };
type ListWithCards = List & { cards: CardWithLabels[] };

interface ListColumnProps {
  list: ListWithCards;
  onCardClick: (cardId: string) => void;
  onAddCard: (listId: string, title: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
}

export function ListColumn({ list, onCardClick, onAddCard, onDeleteList }: ListColumnProps) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAddCard() {
    if (!title.trim()) return;
    setLoading(true);
    await onAddCard(list.id, title.trim());
    setTitle("");
    setAdding(false);
    setLoading(false);
  }

  return (
    <div className="flex-shrink-0 w-64 bg-gray-100 rounded-lg flex flex-col max-h-full">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="font-semibold text-sm text-gray-700">{list.title}</h3>
        <button
          onClick={() => onDeleteList(list.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Delete list"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <Droppable droppableId={list.id} type="card">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[4px] ${
              snapshot.isDraggingOver ? "bg-blue-50 rounded" : ""
            }`}
          >
            {list.cards.map((card, index) => (
              <CardItem key={card.id} card={card} index={index} onClick={onCardClick} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="px-2 pb-2">
        {adding ? (
          <div className="space-y-1">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title..."
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCard();
                if (e.key === "Escape") { setAdding(false); setTitle(""); }
              }}
            />
            <div className="flex gap-1">
              <Button size="sm" onClick={handleAddCard} disabled={loading}>
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setTitle(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-full px-1 py-1 rounded hover:bg-gray-200 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}
