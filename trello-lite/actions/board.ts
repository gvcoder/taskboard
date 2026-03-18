"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { UnauthorizedError, NotFoundError, type ActionResult } from "@/lib/errors";
import type { Board } from "@prisma/client";

const boardSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) throw new UnauthorizedError();
  return session.user;
}

export async function createBoard(data: unknown): Promise<ActionResult<Board>> {
  try {
    const user = await requireAuth();
    const parsed = boardSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
    }
    const board = await prisma.board.create({
      data: {
        title: parsed.data.title,
        color: parsed.data.color ?? "#0079BF",
        userId: user.id,
      },
    });
    return { success: true, data: board };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    return { success: false, error: "Failed to create board" };
  }
}

export async function deleteBoard(boardId: string): Promise<ActionResult<void>> {
  try {
    const user = await requireAuth();
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) throw new NotFoundError();
    if (board.userId !== user.id) throw new UnauthorizedError();
    await prisma.board.delete({ where: { id: boardId } });
    return { success: true, data: undefined };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false, error: "Board not found" };
    return { success: false, error: "Failed to delete board" };
  }
}

export async function getBoards(): Promise<ActionResult<Board[]>> {
  try {
    const user = await requireAuth();
    const boards = await prisma.board.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: boards };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    return { success: false, error: "Failed to fetch boards" };
  }
}
