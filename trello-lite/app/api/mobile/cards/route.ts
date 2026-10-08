import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  try {
    const mobileUser = getMobileUserFromRequest(request);
    if (!mobileUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all boards belonging to the user with lists and cards
    const boards = await prisma.board.findMany({
      where: { userId: mobileUser.userId },
      include: {
        lists: {
          orderBy: { order: "asc" },
          include: {
            cards: {
              orderBy: [
                { dueDate: "asc" },
                { order: "asc" },
                { createdAt: "desc" },
              ],
              include: {
                labels: true,
                subtasks: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Flatten into prioritized list while preserving board/list context
    const prioritizedCards: Array<{
      id: string;
      title: string;
      description: string | null;
      dueDate: Date | null;
      boardId: string;
      boardTitle: string;
      boardColor: string;
      listId: string;
      listTitle: string;
      statusOrder: number;
      availableLists: Array<{ id: string; title: string; order: number }>;
      labels: Array<{ id: string; name: string; color: string }>;
      totalSubtasks: number;
      completedSubtasks: number;
      updatedAt: Date;
    }> = [];

    for (const board of boards) {
      const availableLists = board.lists.map((l) => ({
        id: l.id,
        title: l.title,
        order: l.order,
      }));

      for (const list of board.lists) {
        for (const card of list.cards) {
          prioritizedCards.push({
            id: card.id,
            title: card.title,
            description: card.description,
            dueDate: card.dueDate,
            boardId: board.id,
            boardTitle: board.title,
            boardColor: board.color,
            listId: list.id,
            listTitle: list.title,
            statusOrder: list.order,
            availableLists,
            labels: card.labels,
            totalSubtasks: card.subtasks.length,
            completedSubtasks: card.subtasks.filter((s) => s.completed).length,
            updatedAt: card.updatedAt,
          });
        }
      }
    }

    // Sort cards by priority: overdue/upcoming due dates first, then updatedAt
    prioritizedCards.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return NextResponse.json({
      cards: prioritizedCards,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Mobile cards fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mobile cards" },
      { status: 500 }
    );
  }
}
