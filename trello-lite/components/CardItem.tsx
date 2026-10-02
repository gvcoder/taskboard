"use client";

import { Draggable } from "@hello-pangea/dnd";
import { CheckSquare } from "lucide-react";
import type { Card, Label, Subtask } from "@prisma/client";

type CardWithDetails = Card & {
  labels: Label[];
  subtasks?: Subtask[];
};

interface CardItemProps {
  card: CardWithDetails;
  index: number;
  onClick: (cardId: string) => void;
}

export function CardItem({ card, index, onClick }: CardItemProps) {
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  const subtasks = card.subtasks || [];
  const completedCount = subtasks.filter((s) => s.completed).length;

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(card.id)}
          className={`bg-white rounded-md p-2.5 shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-transparent ${
            snapshot.isDragging ? "shadow-lg rotate-1 border-blue-300" : ""
          }`}
        >
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
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
          <p className="text-sm font-medium text-gray-800">{card.title}</p>

          <div className="flex items-center gap-2 mt-2">
            {card.dueDate && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  isOverdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {new Date(card.dueDate).toLocaleDateString()}
              </span>
            )}

            {subtasks.length > 0 && (
              <span
                className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${
                  completedCount === subtasks.length
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-purple-50 text-purple-700"
                }`}
              >
                <CheckSquare className="h-3 w-3" />
                {completedCount}/{subtasks.length}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
