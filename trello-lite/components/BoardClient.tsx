"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useSession, signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowLeft, LogOut, Shield } from "lucide-react";
import { ListColumn } from "./ListColumn";
import { CardModal } from "./CardModal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import { createList, deleteList, reorderLists } from "@/actions/list";
import { createCard, moveCard } from "@/actions/card";
import { deleteBoard } from "@/actions/board";
import { getBoardWithLists } from "@/actions/board-data";
import { applyOptimisticMove, applyOptimisticListReorder } from "@/lib/dnd-utils";
import type { Board, List, Card, Label } from "@prisma/client";

type CardWithLabels = Card & { labels: Label[] };
type ListWithCards = List & { cards: CardWithLabels[] };
type BoardWithLists = Board & { lists: ListWithCards[] };

interface BoardClientProps {
  boardId: string;
  initialBoard: BoardWithLists;
}

export function BoardClient({ boardId, initialBoard }: BoardClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [listTitle, setListTitle] = useState("");

  const { data: boardData } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const res = await getBoardWithLists(boardId);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    initialData: initialBoard,
  });

  const moveMutation = useMutation({
    mutationFn: moveCard,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["board", boardId] });
      const prev = qc.getQueryData(["board", boardId]);

      // Find source list and index
      const board = qc.getQueryData<typeof initialBoard>(["board", boardId]);
      if (!board) return { prev };

      let sourceListId = "";
      let sourceIndex = 0;
      for (const list of board.lists) {
        const idx = list.cards.findIndex((c) => c.id === vars.cardId);
        if (idx !== -1) { sourceListId = list.id; sourceIndex = idx; break; }
      }

      qc.setQueryData(["board", boardId], (old: typeof initialBoard | undefined) => {
        if (!old) return old;
        return applyOptimisticMove(old as any, { ...vars, sourceListId, sourceIndex }) as any;
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["board", boardId], ctx.prev);
      toast("Failed to move card", "destructive");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ orderedIds }: { orderedIds: string[] }) =>
      reorderLists(boardId, orderedIds),
    onMutate: async ({ orderedIds }) => {
      await qc.cancelQueries({ queryKey: ["board", boardId] });
      const prev = qc.getQueryData(["board", boardId]);
      qc.setQueryData(["board", boardId], (old: typeof initialBoard | undefined) => {
        if (!old) return old;
        return applyOptimisticListReorder(old as any, orderedIds) as any;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["board", boardId], ctx.prev);
      toast("Failed to reorder lists", "destructive");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["board", boardId] }),
  });

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId, type } = result;
      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

      if (type === "list") {
        const lists = boardData?.lists ?? [];
        const orderedIds = lists.map((l) => l.id);
        const [moved] = orderedIds.splice(source.index, 1);
        orderedIds.splice(destination.index, 0, moved);
        reorderMutation.mutate({ orderedIds });
        return;
      }

      moveMutation.mutate({
        cardId: draggableId,
        destListId: destination.droppableId,
        destIndex: destination.index,
      });
    },
    [boardData, moveMutation, reorderMutation]
  );

  async function handleAddCard(listId: string, title: string) {
    const result = await createCard({ listId, title });
    if (!result.success) { toast(result.error, "destructive"); return; }
    qc.invalidateQueries({ queryKey: ["board", boardId] });
  }

  async function handleDeleteList(listId: string) {
    const result = await deleteList(listId);
    if (!result.success) { toast(result.error, "destructive"); return; }
    qc.invalidateQueries({ queryKey: ["board", boardId] });
  }

  async function handleAddList() {
    if (!listTitle.trim()) return;
    const result = await createList({ boardId, title: listTitle.trim() });
    if (!result.success) { toast(result.error, "destructive"); return; }
    setListTitle("");
    setAddingList(false);
    qc.invalidateQueries({ queryKey: ["board", boardId] });
  }

  async function handleDeleteBoard() {
    const result = await deleteBoard(boardId);
    if (!result.success) { toast(result.error, "destructive"); return; }
    router.push("/boards");
  }

  const board = boardData;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: board?.color ?? "#0079BF" }}>
      <header className="bg-black/20 backdrop-blur-sm px-4 py-2 flex items-center gap-3">
        <button onClick={() => router.push("/boards")} className="text-white/80 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1">{board?.title}</h1>
        {session?.user?.role === "ADMIN" && (
          <Button
            size="sm"
            variant="outline"
            className="bg-purple-100 text-purple-900 hover:bg-purple-200 font-medium text-xs px-2.5 py-1 h-8"
            onClick={() => router.push("/admin")}
          >
            <Shield className="h-3.5 w-3.5 mr-1 text-purple-700" />
            Admin Console
          </Button>
        )}
        <button
          onClick={handleDeleteBoard}
          className="text-white/70 hover:text-red-300 text-sm"
        >
          Delete Board
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-white/70 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-x-auto p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="board" type="list" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-3 items-start h-full"
              >
                {(board?.lists ?? []).map((list, index) => (
                    <Draggable key={list.id} draggableId={list.id} index={index}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                        >
                          <ListColumn
                            list={list}
                            onCardClick={setSelectedCardId}
                            onAddCard={handleAddCard}
                            onDeleteList={handleDeleteList}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}

                {/* Add list */}
                <div className="flex-shrink-0 w-64">
                  {addingList ? (
                    <div className="bg-gray-100 rounded-lg p-2 space-y-1">
                      <Input
                        autoFocus
                        value={listTitle}
                        onChange={(e) => setListTitle(e.target.value)}
                        placeholder="List title..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddList();
                          if (e.key === "Escape") { setAddingList(false); setListTitle(""); }
                        }}
                      />
                      <div className="flex gap-1">
                        <Button size="sm" onClick={handleAddList}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAddingList(false); setListTitle(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingList(true)}
                      className="flex items-center gap-1 text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-lg px-3 py-2 text-sm w-full transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add a list
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          boardId={boardId}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  );
}
