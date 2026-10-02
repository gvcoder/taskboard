import { describe, it, expect, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { createSubtask, toggleSubtask, deleteSubtask } from "@/actions/subtask";
import {
  cleanDb,
  createTestUser,
  createTestBoard,
  createTestList,
  createTestCard,
  setSession,
  clearSession,
} from "../helpers";

describe("Subtask Server Actions", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  it("creates a subtask for a card owned by the user", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    const res = await createSubtask({ cardId: card.id, title: "Initial subtask" });
    expect(res.success).toBe(true);
    if (!res.success) return;
    expect(res.data.title).toBe("Initial subtask");
    expect(res.data.completed).toBe(false);
    expect(res.data.order).toBe(0);
  });

  it("toggles subtask completion status", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    const sub = await prisma.subtask.create({
      data: { cardId: card.id, title: "Test item", order: 0, completed: false },
    });

    const toggleRes = await toggleSubtask(sub.id);
    expect(toggleRes.success).toBe(true);
    if (!toggleRes.success) return;
    expect(toggleRes.data.completed).toBe(true);
  });

  it("deletes a subtask owned by the user", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    const sub = await prisma.subtask.create({
      data: { cardId: card.id, title: "Delete me", order: 0 },
    });

    const delRes = await deleteSubtask(sub.id);
    expect(delRes.success).toBe(true);

    const check = await prisma.subtask.findUnique({ where: { id: sub.id } });
    expect(check).toBeNull();
  });

  it("rejects operations when not authenticated", async () => {
    clearSession();
    const res = await createSubtask({ cardId: "any-id", title: "Subtask" });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toBe("Unauthorized");
  });
});
