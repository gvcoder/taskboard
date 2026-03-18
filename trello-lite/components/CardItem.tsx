"use client";

import { Draggable } from "@hello-pangea/dnd";
import type { Card, Label } from "@prisma/client";

type CardWithLabels = Card & { labels: Label[] };

interface CardItemProps {
  card: CardWithLabels;
  index: number;
  onClick: (cardId: string) => void;
}

export function CardItem({ card, index, onClick }: CardItemProps) {
  const isOverdue =
    card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(card.id)}
          className={`bg-white rounded-md p-2 shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-transparent ${
            snapshot.isDragging ? "shadow-lg rotate-1 border-blue-300" : ""
          }`}
        >
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1">
              {card.labels.map((label) => (
                <span
                  key={label.id}
                  className="h-2 w-8 rounded-full"
                  style={{ backgroundColor: label.color }}
                  title={label.name}
                />
              ))}
            </div>
          )}
          <p className="text-sm text-gray-800">{card.title}</p>
          {card.dueDate && (
            <span
              className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded ${
                isOverdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
              }`}
            >
              {new Date(card.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </Draggable>
  );
}
