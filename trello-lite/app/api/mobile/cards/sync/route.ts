import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";

interface SyncMutation {
  cardId: string;
  listId: string;
  timestamp: number;
}

export async function POST(request: Request) {
  try {
    const mobileUser = getMobileUserFromRequest(request);
    if (!mobileUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const mutations: SyncMutation[] = Array.isArray(body?.mutations) ? body.mutations : [];

    const results: Array<{ cardId: string; status: "applied" | "skipped" | "failed"; error?: string }> = [];

    for (const mutation of mutations) {
      try {
        const card = await prisma.card.findFirst({
          where: {
            id: mutation.cardId,
            list: {
              board: {
                userId: mobileUser.userId,
              },
            },
          },
          include: { list: true },
        });

        if (!card) {
          results.push({ cardId: mutation.cardId, status: "failed", error: "Card not found" });
          continue;
        }

        const targetList = await prisma.list.findFirst({
          where: {
            id: mutation.listId,
            boardId: card.list.boardId,
          },
        });

        if (!targetList) {
          results.push({ cardId: mutation.cardId, status: "failed", error: "Target list not found" });
          continue;
        }

        await prisma.card.update({
          where: { id: mutation.cardId },
          data: {
            listId: targetList.id,
            updatedAt: new Date(),
          },
        });

        results.push({ cardId: mutation.cardId, status: "applied" });
      } catch (err: any) {
        results.push({ cardId: mutation.cardId, status: "failed", error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Batch sync error:", error);
    return NextResponse.json({ error: "Batch sync failed" }, { status: 500 });
  }
}
