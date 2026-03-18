import { describe, it, expect, beforeEach } from "vitest";
import { createList, deleteList, reorderLists } from "@/actions/list";
import {
  cleanDb, createTestUser, setSession, clearSession,
  createTestBoard, createTestList,
} from "../helpers";
import prisma from "@/lib/prisma";

beforeEach(cleanDb);

describe("createList", () => {
  it("creates a list appended to the end of a board", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);

    const r1 = await createList({ boardId: board.id, title: "To Do" });
    const r2 = await createList({ boardId: board.id, title: "In Progress" });

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    if (!r1.success || !r2.success) return;
    expect(r1.data.order).toBe(0);
    expect(r2.data.order).toBe(1);
  });

  it("rejects an empty title", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);

    const result = await createList({ boardId: board.id, title: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/required/i);
  });

  it("rejects a title over 100 characters", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);

    const result = await createList({ boardId: board.id, title: "x".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects creating a list in another user's board", async () => {
    const owner = await createTestUser("owner@example.com");
    const other = await createTestUser("other@example.com");
    const board = await createTestBoard(owner.id);

    setSession(other.id, other.email);
    const result = await createList({ boardId: board.id, title: "Sneaky" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });

  it("returns Unauthorized when not logged in", async () => {
    clearSession();
    const result = await createList({ boardId: "any", title: "List" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });
});

describe("deleteList", () => {
  it("deletes a list owned by the user", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);

    const result = await deleteList(list.id);
    expect(result.success).toBe(true);
    expect(await prisma.list.findUnique({ where: { id: list.id } })).toBeNull();
  });

  it("rejects deleting another user's list", async () => {
    const owner = await createTestUser("owner@example.com");
    const other = await createTestUser("other@example.com");
    const board = await createTestBoard(owner.id);
    const list = await createTestList(board.id);

    setSession(other.id, other.email);
    const result = await deleteList(list.id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });
});

describe("reorderLists", () => {
  it("updates order values to match the given sequence", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const l1 = await createTestList(board.id, "L1", 0);
    const l2 = await createTestList(board.id, "L2", 1);
    const l3 = await createTestList(board.id, "L3", 2);

    const result = await reorderLists(board.id, [l3.id, l1.id, l2.id]);
    expect(result.success).toBe(true);

    const lists = await prisma.list.findMany({
      where: { boardId: board.id },
      orderBy: { order: "asc" },
    });
    expect(lists.map((l) => l.id)).toEqual([l3.id, l1.id, l2.id]);
    expect(lists.map((l) => l.order)).toEqual([0, 1, 2]);
  });

  it("rejects reordering lists in another user's board", async () => {
    const owner = await createTestUser("owner@example.com");
    const other = await createTestUser("other@example.com");
    const board = await createTestBoard(owner.id);
    const list = await createTestList(board.id);

    setSession(other.id, other.email);
    const result = await reorderLists(board.id, [list.id]);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });
});
