"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { UnauthorizedError, NotFoundError, type ActionResult } from "@/lib/errors";
import type { List } from "@prisma/client";

const listSchema = z.object({
  boardId: z.string().min(1),
  title: z.string().min(1, "Title is required").max(100, "Title must be 100 characters or less"),
});

async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) throw new UnauthorizedError();
  return session.user;
}

async function requireBoardOwnership(boardId: string, userId: string) {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) throw new NotFoundError("Board not found");
  if (board.userId !== userId) throw new UnauthorizedError();
  return board;
}

export async function createList(data: unknown): Promise<ActionResult<List>> {
  try {
    const user = await requireAuth();
    const parsed = listSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
    }
    await requireBoardOwnership(parsed.data.boardId, user.id);
    const order = await prisma.list.count({ where: { boardId: parsed.data.boardId } });
    const list = await prisma.list.create({
      data: { title: parsed.data.title, boardId: parsed.data.boardId, order },
    });
    return { success: true, data: list };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false, error: e.message };
    return { success: false, error: "Failed to create list" };
  }
}

export async function deleteList(listId: string): Promise<ActionResult<void>> {
  try {
    const user = await requireAuth();
    const list = await prisma.list.findUnique({ where: { id: listId }, include: { board: true } });
    if (!list) throw new NotFoundError();
    if (list.board.userId !== user.id) throw new UnauthorizedError();
    await prisma.list.delete({ where: { id: listId } });
    return { success: true, data: undefined };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false, error: "List not found" };
    return { success: false, error: "Failed to delete list" };
  }
}

export async function reorderLists(
  boardId: string,
  orderedListIds: string[]
): Promise<ActionResult<void>> {
  try {
    const user = await requireAuth();
    await requireBoardOwnership(boardId, user.id);
    await prisma.$transaction(
      orderedListIds.map((id, index) =>
        prisma.list.update({ where: { id }, data: { order: index } })
      )
    );
    return { success: true, data: undefined };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false, error: e.message };
    return { success: false, error: "Failed to reorder lists" };
  }
}
