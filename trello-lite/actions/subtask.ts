"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { UnauthorizedError, NotFoundError, type ActionResult } from "@/lib/errors";
import type { Subtask } from "@prisma/client";

async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) throw new UnauthorizedError();
  return session.user;
}

async function requireCardOwnership(cardId: string, userId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: { include: { board: true } } },
  });
  if (!card) throw new NotFoundError("Card not found");
  if (card.list.board.userId !== userId) throw new UnauthorizedError();
  return card;
}

async function requireSubtaskOwnership(subtaskId: string, userId: string) {
  const subtask = await prisma.subtask.findUnique({
    where: { id: subtaskId },
    include: { card: { include: { list: { include: { board: true } } } } },
  });
  if (!subtask) throw new NotFoundError("Subtask not found");
  if (subtask.card.list.board.userId !== userId) throw new UnauthorizedError();
  return subtask;
}

const createSubtaskSchema = z.object({
  cardId: z.string().min(1),
  title: z.string().min(1, "Subtask title is required").max(255),
});

export async function createSubtask(data: unknown): Promise<ActionResult<Subtask>> {
  try {
    const user = await requireAuth();
    const parsed = createSubtaskSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
    }
    const { cardId, title } = parsed.data;
    await requireCardOwnership(cardId, user.id);

    const order = await prisma.subtask.count({ where: { cardId } });
    const subtask = await prisma.subtask.create({
      data: {
        cardId,
        title,
        order,
        completed: false,
      },
    });

    return { success: true, data: subtask };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (error instanceof NotFoundError) return { success: false, error: error.message };
    return { success: false, error: "Failed to create subtask" };
  }
}

export async function toggleSubtask(subtaskId: string): Promise<ActionResult<Subtask>> {
  try {
    const user = await requireAuth();
    const subtask = await requireSubtaskOwnership(subtaskId, user.id);

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: { completed: !subtask.completed },
    });

    return { success: true, data: updated };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (error instanceof NotFoundError) return { success: false, error: error.message };
    return { success: false, error: "Failed to update subtask" };
  }
}

export async function deleteSubtask(subtaskId: string): Promise<ActionResult<void>> {
  try {
    const user = await requireAuth();
    await requireSubtaskOwnership(subtaskId, user.id);

    await prisma.subtask.delete({
      where: { id: subtaskId },
    });

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (error instanceof NotFoundError) return { success: false, error: error.message };
    return { success: false, error: "Failed to delete subtask" };
  }
}
