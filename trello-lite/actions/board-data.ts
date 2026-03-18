"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { UnauthorizedError, NotFoundError } from "@/lib/errors";

export async function getBoardWithLists(boardId: string) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) throw new UnauthorizedError();

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          orderBy: { order: "asc" },
          include: {
            cards: { orderBy: { order: "asc" }, include: { labels: true } },
          },
        },
      },
    });

    if (!board) throw new NotFoundError();
    if (board.userId !== session.user.id) throw new UnauthorizedError();

    return { success: true as const, data: board };
  } catch (e) {
    if (e instanceof UnauthorizedError) return { success: false as const, error: "Unauthorized" };
    if (e instanceof NotFoundError) return { success: false as const, error: "Board not found" };
    return { success: false as const, error: "Failed to fetch board" };
  }
}
