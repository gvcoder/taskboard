"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, X, Sparkles, Loader2, CheckSquare, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/toast";
import { getCardWithLabels, updateCard, deleteCard, addLabel, deleteLabel } from "@/actions/card";
import { createSubtask, toggleSubtask, deleteSubtask } from "@/actions/subtask";
import { generateBreakdownForCard } from "@/actions/ai";

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
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

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

  const createSubtaskMutation = useMutation({
    mutationFn: () => createSubtask({ cardId, title: newSubtaskTitle }),
    onSuccess: (res) => {
      if (!res.success) { toast(res.error, "destructive"); return; }
      qc.invalidateQueries({ queryKey: ["card", cardId] });
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      setNewSubtaskTitle("");
    },
    onError: () => toast("Failed to create subtask", "destructive"),
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: (subtaskId: string) => toggleSubtask(subtaskId),
    onSuccess: (res) => {
      if (!res.success) { toast(res.error, "destructive"); return; }
      qc.invalidateQueries({ queryKey: ["card", cardId] });
      qc.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (subtaskId: string) => deleteSubtask(subtaskId),
    onSuccess: (res) => {
      if (!res.success) { toast(res.error, "destructive"); return; }
      qc.invalidateQueries({ queryKey: ["card", cardId] });
      qc.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const aiBreakdownMutation = useMutation({
    mutationFn: () => generateBreakdownForCard(cardId),
    onSuccess: (res) => {
      if (!res.success) { toast(res.error, "destructive"); return; }
      qc.invalidateQueries({ queryKey: ["card", cardId] });
      qc.invalidateQueries({ queryKey: ["board", boardId] });
      toast("AI Subtask Breakdown generated!");
    },
    onError: (err: Error) => toast(err.message || "AI Breakdown failed", "destructive"),
  });

  const subtasks = card?.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-bold">Card Details</DialogTitle>
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm"
            onClick={() => aiBreakdownMutation.mutate()}
            disabled={aiBreakdownMutation.isPending}
          >
            {aiBreakdownMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            AI Subtask Breakdown
          </Button>
        </DialogHeader>

        {isLoading && <p className="text-sm text-gray-500 py-4">Loading card details...</p>}

        {card && (
          <div className="space-y-6 pt-2">
            <div className="space-y-1">
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="font-medium"
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
                placeholder="Add a detailed description..."
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
                Save Changes
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Card
              </Button>
            </div>

            {/* Subtasks Section */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-purple-600" />
                  <p className="text-sm font-semibold text-gray-900">Subtasks / Checklist</p>
                </div>
                {subtasks.length > 0 && (
                  <span className="text-xs text-gray-500 font-medium">
                    {completedSubtasks} / {subtasks.length} ({progressPercent}%)
                  </span>
                )}
              </div>

              {subtasks.length > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-purple-600 h-1.5 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}

              <div className="space-y-2">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-gray-50 border hover:bg-gray-100 transition-colors"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 text-sm">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => toggleSubtaskMutation.mutate(st.id)}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                      <span className={st.completed ? "line-through text-gray-400" : "text-gray-800 font-medium"}>
                        {st.title}
                      </span>
                    </label>
                    <button
                      onClick={() => deleteSubtaskMutation.mutate(st.id)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded"
                      aria-label="Delete subtask"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Add a subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSubtaskTitle.trim()) {
                      e.preventDefault();
                      createSubtaskMutation.mutate();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => createSubtaskMutation.mutate()}
                  disabled={!newSubtaskTitle.trim() || createSubtaskMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Labels Section */}
            <div className="border-t pt-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900">Labels</p>
              <div className="flex flex-wrap gap-2">
                {card.labels.map((lbl) => (
                  <span
                    key={lbl.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-sm"
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
              <div className="flex gap-2 items-center pt-1">
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
                  Add Label
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
