"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Trash2, Plus, LogOut, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useToast } from "./ui/toast";
import { createBoard, deleteBoard } from "@/actions/board";
import type { Board } from "@prisma/client";

interface BoardsClientProps {
  initialBoards: Board[];
}

export function BoardsClient({ initialBoards }: BoardsClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [boards, setBoards] = useState(initialBoards);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#0079BF");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);
    const result = await createBoard({ title: title.trim(), color });
    setLoading(false);
    if (!result.success) { toast(result.error, "destructive"); return; }
    setBoards((prev) => [result.data, ...prev]);
    setTitle("");
    setColor("#0079BF");
    setOpen(false);
  }

  async function handleDelete(boardId: string) {
    const result = await deleteBoard(boardId);
    if (!result.success) { toast(result.error, "destructive"); return; }
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold">Trello Lite</h1>
        <div className="flex items-center gap-3">
          {session?.user?.role === "ADMIN" && (
            <Button
              size="sm"
              variant="outline"
              className="bg-purple-100 text-purple-900 hover:bg-purple-200 font-medium"
              onClick={() => router.push("/admin")}
            >
              <Shield className="h-4 w-4 mr-1 text-purple-700" />
              Admin Console
            </Button>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1 text-sm hover:opacity-80"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-800">My Boards</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Board
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Board</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="board-title">Title</Label>
                  <Input
                    id="board-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Project"
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="board-color">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="board-color"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-9 w-16 rounded border border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm text-gray-500">{color}</span>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={loading || !title.trim()} className="w-full">
                  {loading ? "Creating..." : "Create Board"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {boards.length === 0 ? (
          <p className="text-gray-500 text-sm">No boards yet. Create one to get started.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                className="relative rounded-lg overflow-hidden cursor-pointer group h-24 shadow-sm hover:shadow-md transition-shadow"
                style={{ backgroundColor: board.color }}
                onClick={() => router.push(`/boards/${board.id}`)}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                <div className="relative p-3 h-full flex flex-col justify-between">
                  <p className="text-white font-semibold text-sm truncate">{board.title}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(board.id); }}
                    className="self-end text-white/70 hover:text-white transition-colors"
                    aria-label="Delete board"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
