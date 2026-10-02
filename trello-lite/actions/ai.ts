"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { UnauthorizedError, NotFoundError, type ActionResult } from "@/lib/errors";
import { generateTaskBreakdown, type GeneratedBreakdown } from "@/lib/ai";

async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) throw new UnauthorizedError();
  return session.user;
}

export async function generateBreakdownForCard(
  cardId: string
): Promise<ActionResult<GeneratedBreakdown>> {
  try {
    const user = await requireAuth();

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        list: { include: { board: true } },
        labels: true,
        subtasks: true,
      },
    });

    if (!card) throw new NotFoundError("Card not found");
    if (card.list.board.userId !== user.id) throw new UnauthorizedError();

    // Call AI service with Flash-Lite model
    const breakdown = await generateTaskBreakdown(card.title, card.description);

    // Save subtasks and labels inside a single transaction
    await prisma.$transaction(async (tx) => {
      // 1. Add subtasks
      const existingSubtaskCount = card.subtasks.length;
      for (let i = 0; i < breakdown.subtasks.length; i++) {
        await tx.subtask.create({
          data: {
            cardId,
            title: breakdown.subtasks[i].title,
            order: existingSubtaskCount + i,
            completed: false,
          },
        });
      }

      // 2. Add suggested labels if they don't already exist on this card
      const existingLabelNames = new Set(card.labels.map((l) => l.name.toLowerCase()));
      for (const label of breakdown.suggestedLabels) {
        if (!existingLabelNames.has(label.name.toLowerCase())) {
          await tx.label.create({
            data: {
              cardId,
              name: label.name,
              color: label.color,
            },
          });
        }
      }
    });

    return { success: true, data: breakdown };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (error instanceof NotFoundError) return { success: false, error: error.message };
    const errorMsg = error instanceof Error ? error.message : "Failed to generate AI breakdown";
    return { success: false, error: errorMsg };
  }
}
