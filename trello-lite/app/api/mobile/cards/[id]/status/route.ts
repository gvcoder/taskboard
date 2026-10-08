import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMobileUserFromRequest } from "@/lib/mobile-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const mobileUser = getMobileUserFromRequest(request);
    if (!mobileUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: cardId } = await params;
    const body = await request.json();
    const { listId } = body;

    if (!listId) {
      return NextResponse.json(
        { error: "Target listId is required" },
        { status: 400 }
      );
    }

    // Verify card belongs to a board owned by the authenticated user
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        list: {
          board: {
            userId: mobileUser.userId,
          },
        },
      },
      include: {
        list: true,
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Card not found or access denied" },
        { status: 404 }
      );
    }

    // Verify target list belongs to the same board
    const targetList = await prisma.list.findFirst({
      where: {
        id: listId,
        boardId: card.list.boardId,
      },
    });

    if (!targetList) {
      return NextResponse.json(
        { error: "Target list does not belong to the same board" },
        { status: 400 }
      );
    }

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: {
        listId: targetList.id,
        updatedAt: new Date(),
      },
      include: {
        list: true,
      },
    });

    return NextResponse.json({
      success: true,
      card: {
        id: updatedCard.id,
        title: updatedCard.title,
        listId: updatedCard.listId,
        listTitle: updatedCard.list.title,
        updatedAt: updatedCard.updatedAt,
      },
    });
  } catch (error) {
    console.error("Mobile status update error:", error);
    return NextResponse.json(
      { error: "Failed to update card status" },
      { status: 500 }
    );
  }
}
