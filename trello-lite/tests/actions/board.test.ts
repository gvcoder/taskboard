import { describe, it, expect, beforeEach } from "vitest";
import { createBoard, deleteBoard, getBoards } from "@/actions/board";
import { cleanDb, createTestUser, setSession, clearSession, createTestBoard } from "../helpers";
import prisma from "@/lib/prisma";

beforeEach(async () => {
  await cleanDb();
});

describe("createBoard", () => {
  it("creates a board for the authenticated user", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);

    const result = await createBoard({ title: "My Board" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.title).toBe("My Board");
    expect(result.data.userId).toBe(user.id);
    expect(result.data.color).toBe("#0079BF");
  });

  it("stores a custom color", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);

    const result = await createBoard({ title: "Colored", color: "#FF5733" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.color).toBe("#FF5733");
  });

  it("rejects an empty title", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);

    const result = await createBoard({ title: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/required/i);
  });

  it("rejects a title over 100 characters", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);

    const result = await createBoard({ title: "a".repeat(101) });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/100/);
  });

  it("returns Unauthorized when not logged in", async () => {
    clearSession();
    const result = await createBoard({ title: "Board" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });
});

describe("getBoards", () => {
  it("returns only boards owned by the current user", async () => {
    const user1 = await createTestUser("u1@example.com");
    const user2 = await createTestUser("u2@example.com");
    await createTestBoard(user1.id, "Board A");
    await createTestBoard(user2.id, "Board B");

    setSession(user1.id, user1.email);
    const result = await getBoards();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe("Board A");
  });

  it("returns Unauthorized when not logged in", async () => {
    clearSession();
    const result = await getBoards();
    expect(result.success).toBe(false);
  });
});

describe("deleteBoard", () => {
  it("deletes a board owned by the user", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);

    const result = await deleteBoard(board.id);
    expect(result.success).toBe(true);

    const found = await prisma.board.findUnique({ where: { id: board.id } });
    expect(found).toBeNull();
  });

  it("rejects deletion of another user's board", async () => {
    const owner = await createTestUser("owner@example.com");
    const attacker = await createTestUser("attacker@example.com");
    const board = await createTestBoard(owner.id);

    setSession(attacker.id, attacker.email);
    const result = await deleteBoard(board.id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");

    const found = await prisma.board.findUnique({ where: { id: board.id } });
    expect(found).not.toBeNull();
  });

  it("returns error for a non-existent board", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);

    const result = await deleteBoard("nonexistent-id");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/not found/i);
  });

  it("cascades and deletes nested lists and cards", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await prisma.list.create({
      data: { id: "l1", title: "List", boardId: board.id, order: 0 },
    });
    await prisma.card.create({ data: { id: "c1", title: "Card", listId: list.id, order: 0 } });

    await deleteBoard(board.id);

    expect(await prisma.list.findUnique({ where: { id: "l1" } })).toBeNull();
    expect(await prisma.card.findUnique({ where: { id: "c1" } })).toBeNull();
  });
});
