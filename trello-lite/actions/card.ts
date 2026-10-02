"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { UnauthorizedError, NotFoundError, type ActionResult } from "@/lib/errors";
import type { Card, Label } from "@prisma/client";

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

async function requireListOwnership(listId: string, userId: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: { board: true },
  });
  if (!list) throw new NotFoundError("List not found");
  if (list.board.userId !== userId) throw new UnauthorizedError();
  return list;
}

const createCardSchema = z.object({
  listId: z.string().min(1),
  title: z.string().min(1, "Title is required").max(255, "Title must be 255 characters or less"),
});

const updateCardSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

const labelSchema = z.object({
  cardId: z.string().min(1),
  name: z.string().min(1, "Label name is required"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (#RRGGBB)"),
});

export async function createCard(data: unknown): Promise<ActionResult<Card>> {
  try {
    const user = await requireAuth();
    const parsed = createCardSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
    }
    await requireListOwnership(parsed.data.listId, user.id);
    const order = await prisma.card.count({ where: { listId: parsed.data.listId } });
    const card = await prisma.card.create({
      data: { title: parsed.data.title, listId: parsed.data.listId, order },
    });
    return { success: true, data: card };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false, error: e.message };
    return { success: false, error: "Failed to create card" };
  }
}

export async function updateCard(
  cardId: string,
  data: unknown
): Promise<ActionResult<Card>> {
  try {
    const user = await requireAuth();
    await requireCardOwnership(cardId, user.id);
    const parsed = updateCardSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
    }
    const card = await prisma.card.update({
      where: { id: cardId },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.dueDate !== undefined && {
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        }),
      },
    });
    return { success: true, data: card };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false, error: e.message };
    return { success: false, error: "Failed to update card" };
  }
}

export async function deleteCard(cardId: string): Promise<ActionResult<void>> {
  try {
    const user = await requireAuth();
    await requireCardOwnership(cardId, user.id);
    await prisma.card.delete({ where: { id: cardId } });
    return { success: true, data: undefined };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false, error: e.message };
    return { success: false, error: "Failed to delete card" };
  }
}

export async function moveCard(data: {
  cardId: string;
  destListId: string;
  destIndex: number;
}): Promise<ActionResult<void>> {
  try {
    const user = await requireAuth();
    const card = await requireCardOwnership(data.cardId, user.id);
    await requireListOwnership(data.destListId, user.id);

    const sourceListId = card.listId;

    await prisma.$transaction(async (tx) => {
      const sourceCards = await tx.card.findMany({
        where: { listId: sourceListId },
        orderBy: { order: "asc" },
      });

      if (sourceListId === data.destListId) {
        // Within-list reorder
        const reordered = sourceCards.filter((c) => c.id !== data.cardId);
        reordered.splice(data.destIndex, 0, card);
        for (let i = 0; i < reordered.length; i++) {
          await tx.card.update({ where: { id: reordered[i].id }, data: { order: i } });
        }
      } else {
        // Cross-list move
        const destCards = await tx.card.findMany({
          where: { listId: data.destListId },
          orderBy: { order: "asc" },
        });

        const newSourceCards = sourceCards.filter((c) => c.id !== data.cardId);
        const newDestCards = [...destCards];
        newDestCards.splice(data.destIndex, 0, card);

        await tx.card.update({
          where: { id: data.cardId },
          data: { listId: data.destListId },
        });

        for (let i = 0; i < newSourceCards.length; i++) {
          await tx.card.update({ where: { id: newSourceCards[i].id }, data: { order: i } });
        }
        for (let i = 0; i < newDestCards.length; i++) {
          await tx.card.update({ where: { id: newDestCards[i].id }, data: { order: i } });
        }
      }
    });

    return { success: true, data: undefined };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false, error: e.message };
    return { success: false, error: "Failed to move card" };
  }
}

export async function addLabel(data: unknown): Promise<ActionResult<Label>> {
  try {
    const user = await requireAuth();
    const parsed = labelSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" };
    }
    await requireCardOwnership(parsed.data.cardId, user.id);
    const label = await prisma.label.create({
      data: { name: parsed.data.name, color: parsed.data.color, cardId: parsed.data.cardId },
    });
    return { success: true, data: label };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false, error: e.message };
    return { success: false, error: "Failed to add label" };
  }
}

export async function deleteLabel(labelId: string): Promise<ActionResult<void>> {
  try {
    const user = await requireAuth();
    const label = await prisma.label.findUnique({
      where: { id: labelId },
      include: { card: { include: { list: { include: { board: true } } } } },
    });
    if (!label) throw new NotFoundError("Label not found");
    if (label.card.list.board.userId !== user.id) throw new UnauthorizedError();
    await prisma.label.delete({ where: { id: labelId } });
    return { success: true, data: undefined };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false, error: e.message };
    return { success: false, error: "Failed to delete label" };
  }
}

export async function getCardWithLabels(cardId: string) {
  try {
    const user = await requireAuth();
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        labels: true,
        subtasks: { orderBy: { order: "asc" } },
        list: { include: { board: true } },
      },
    });
    if (!card) throw new NotFoundError();
    if (card.list.board.userId !== user.id) throw new UnauthorizedError();
    return { success: true, data: card };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false, error: "Card not found" };
    return { success: false, error: "Failed to fetch card" };
  }
}
