"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/toast";
import { getCardWithLabels, updateCard, deleteCard, addLabel, deleteLabel } from "@/actions/card";

interface CardModalProps {
  cardId: string;
  boardId: string;
  onClose: () => void;
}

export function CardModal({ cardId, boardId, onClose }: CardModalProps) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: result, isLoading } = useQuery({
    queryKey: ["card", cardId],
    queryFn: () => getCardWithLabels(cardId),
    enabled: !!cardId,
  });

  const card = result?.success ? result.data : null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#3B82F6");

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description ?? "");
      setDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : "");
    }
  }, [card]);

  const updateMutation = useMutation({
    mutationFn: () => updateCard(cardId, { title, description: description || null, dueDate: dueDate || null }),
    onSuccess: (res) => {
      if (!res.success) { toast(res.error, "destructive"); return; }
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      qc.invalidateQueries({ queryKey: ["card", cardId] });
      toast("Card updated");
    },
    onError: () => toast("Failed to update card", "destructive"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCard(cardId),
    onSuccess: (res) => {
      if (!res.success) { toast(res.error, "destructive"); return; }
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      onClose();
    },
    onError: () => toast("Failed to delete card", "destructive"),
  });

  const addLabelMutation = useMutation({
    mutationFn: () => addLabel({ cardId, name: labelName, color: labelColor }),
    onSuccess: (res) => {
      if (!res.success) { toast(res.error, "destructive"); return; }
      qc.invalidateQueries({ queryKey: ["card", cardId] });
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      setLabelName("");
    },
    onError: () => toast("Failed to add label", "destructive"),
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (labelId: string) => deleteLabel(labelId),
    onSuccess: (res) => {
      if (!res.success) { toast(res.error, "destructive"); return; }
      qc.invalidateQueries({ queryKey: ["card", cardId] });
      qc.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Card Details</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-gray-500">Loading...</p>}

        {card && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="card-desc">Description</Label>
              <textarea
                id="card-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                placeholder="Add a description..."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="card-due">Due Date</Label>
              <Input
                id="card-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                size="sm"
              >
                Save
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>

            {/* Labels */}
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-medium">Labels</p>
              <div className="flex flex-wrap gap-2">
                {card.labels.map((lbl) => (
                  <span
                    key={lbl.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                    style={{ backgroundColor: lbl.color }}
                  >
                    {lbl.name}
                    <button
                      onClick={() => deleteLabelMutation.mutate(lbl.id)}
                      className="hover:opacity-75"
                      aria-label={`Remove label ${lbl.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Label name"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  className="flex-1"
                />
                <input
                  type="color"
                  value={labelColor}
                  onChange={(e) => setLabelColor(e.target.value)}
                  className="h-9 w-9 rounded border border-gray-300 cursor-pointer"
                  aria-label="Label color"
                />
                <Button
                  size="sm"
                  onClick={() => addLabelMutation.mutate()}
                  disabled={!labelName.trim() || addLabelMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
