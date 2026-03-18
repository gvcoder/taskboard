import { describe, it, expect, beforeEach } from "vitest";
import {
  createCard, updateCard, deleteCard, moveCard,
  addLabel, deleteLabel, getCardWithLabels,
} from "@/actions/card";
import {
  cleanDb, createTestUser, setSession, clearSession,
  createTestBoard, createTestList, createTestCard,
} from "../helpers";
import prisma from "@/lib/prisma";

beforeEach(cleanDb);

// ─── createCard ──────────────────────────────────────────────────────────────

describe("createCard", () => {
  it("creates a card appended to the end of a list", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);

    const r1 = await createCard({ listId: list.id, title: "Card 1" });
    const r2 = await createCard({ listId: list.id, title: "Card 2" });

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
    const list = await createTestList(board.id);

    const result = await createCard({ listId: list.id, title: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/required/i);
  });

  it("rejects a title over 255 characters", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);

    const result = await createCard({ listId: list.id, title: "x".repeat(256) });
    expect(result.success).toBe(false);
  });

  it("rejects creating a card in another user's list", async () => {
    const owner = await createTestUser("owner@example.com");
    const other = await createTestUser("other@example.com");
    const board = await createTestBoard(owner.id);
    const list = await createTestList(board.id);

    setSession(other.id, other.email);
    const result = await createCard({ listId: list.id, title: "Sneaky" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });

  it("returns Unauthorized when not logged in", async () => {
    clearSession();
    const result = await createCard({ listId: "any", title: "Card" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });
});

// ─── updateCard ──────────────────────────────────────────────────────────────

describe("updateCard", () => {
  it("updates title, description, and dueDate", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    const result = await updateCard(card.id, {
      title: "Updated Title",
      description: "Some description",
      dueDate: "2026-12-31",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.title).toBe("Updated Title");
    expect(result.data.description).toBe("Some description");
    expect(result.data.dueDate).not.toBeNull();
  });

  it("clears dueDate when null is passed", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    await updateCard(card.id, { dueDate: "2026-01-01" });
    const result = await updateCard(card.id, { dueDate: null });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.dueDate).toBeNull();
  });

  it("rejects updating another user's card", async () => {
    const owner = await createTestUser("owner@example.com");
    const other = await createTestUser("other@example.com");
    const board = await createTestBoard(owner.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    setSession(other.id, other.email);
    const result = await updateCard(card.id, { title: "Hacked" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });
});

// ─── deleteCard ──────────────────────────────────────────────────────────────

describe("deleteCard", () => {
  it("deletes a card owned by the user", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    const result = await deleteCard(card.id);
    expect(result.success).toBe(true);
    expect(await prisma.card.findUnique({ where: { id: card.id } })).toBeNull();
  });

  it("cascades and deletes labels when card is deleted", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);
    const label = await prisma.label.create({
      data: { id: "lbl1", name: "Bug", color: "#FF0000", cardId: card.id },
    });

    await deleteCard(card.id);
    expect(await prisma.label.findUnique({ where: { id: label.id } })).toBeNull();
  });

  it("rejects deleting another user's card", async () => {
    const owner = await createTestUser("owner@example.com");
    const other = await createTestUser("other@example.com");
    const board = await createTestBoard(owner.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    setSession(other.id, other.email);
    const result = await deleteCard(card.id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });
});

// ─── moveCard ─────────────────────────────────────────────────────────────────

describe("moveCard", () => {
  it("reorders a card within the same list", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const c1 = await createTestCard(list.id, "C1", 0);
    const c2 = await createTestCard(list.id, "C2", 1);
    const c3 = await createTestCard(list.id, "C3", 2);

    // Move c1 to position 2
    const result = await moveCard({ cardId: c1.id, destListId: list.id, destIndex: 2 });
    expect(result.success).toBe(true);

    const cards = await prisma.card.findMany({
      where: { listId: list.id },
      orderBy: { order: "asc" },
    });
    expect(cards.map((c) => c.id)).toEqual([c2.id, c3.id, c1.id]);
    expect(cards.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it("moves a card to a different list", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list1 = await createTestList(board.id, "L1", 0);
    const list2 = await createTestList(board.id, "L2", 1);
    const c1 = await createTestCard(list1.id, "C1", 0);
    const c2 = await createTestCard(list1.id, "C2", 1);
    const c3 = await createTestCard(list2.id, "C3", 0);

    const result = await moveCard({ cardId: c1.id, destListId: list2.id, destIndex: 0 });
    expect(result.success).toBe(true);

    const movedCard = await prisma.card.findUnique({ where: { id: c1.id } });
    expect(movedCard!.listId).toBe(list2.id);

    const srcCards = await prisma.card.findMany({ where: { listId: list1.id }, orderBy: { order: "asc" } });
    expect(srcCards.map((c) => c.id)).toEqual([c2.id]);
    expect(srcCards[0].order).toBe(0);

    const dstCards = await prisma.card.findMany({ where: { listId: list2.id }, orderBy: { order: "asc" } });
    expect(dstCards.map((c) => c.id)).toEqual([c1.id, c3.id]);
    expect(dstCards.map((c) => c.order)).toEqual([0, 1]);
  });

  it("ensures no duplicate order values after move", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const cards = await Promise.all([
      createTestCard(list.id, "C1", 0),
      createTestCard(list.id, "C2", 1),
      createTestCard(list.id, "C3", 2),
      createTestCard(list.id, "C4", 3),
    ]);

    await moveCard({ cardId: cards[3].id, destListId: list.id, destIndex: 0 });

    const result = await prisma.card.findMany({ where: { listId: list.id }, orderBy: { order: "asc" } });
    const orders = result.map((c) => c.order);
    expect(new Set(orders).size).toBe(orders.length); // no duplicates
    expect(orders).toEqual([0, 1, 2, 3]);
  });

  it("rejects moving a card to another user's list", async () => {
    const owner = await createTestUser("owner@example.com");
    const other = await createTestUser("other@example.com");
    const ownerBoard = await createTestBoard(owner.id);
    const otherBoard = await createTestBoard(other.id);
    const ownerList = await createTestList(ownerBoard.id);
    const otherList = await createTestList(otherBoard.id);
    const card = await createTestCard(ownerList.id);

    setSession(owner.id, owner.email);
    const result = await moveCard({ cardId: card.id, destListId: otherList.id, destIndex: 0 });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });
});

// ─── labels ──────────────────────────────────────────────────────────────────

describe("addLabel", () => {
  it("adds a label to a card", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    const result = await addLabel({ cardId: card.id, name: "Bug", color: "#FF0000" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.name).toBe("Bug");
    expect(result.data.color).toBe("#FF0000");
    expect(result.data.cardId).toBe(card.id);
  });

  it("rejects an invalid hex color", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    const result = await addLabel({ cardId: card.id, name: "Bug", color: "red" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/hex/i);
  });

  it("rejects an empty label name", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    const result = await addLabel({ cardId: card.id, name: "", color: "#FF0000" });
    expect(result.success).toBe(false);
  });
});

describe("deleteLabel", () => {
  it("deletes a label from a card", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);
    const label = await prisma.label.create({
      data: { id: "lbl-del", name: "Feature", color: "#00FF00", cardId: card.id },
    });

    const result = await deleteLabel(label.id);
    expect(result.success).toBe(true);
    expect(await prisma.label.findUnique({ where: { id: label.id } })).toBeNull();
  });

  it("rejects deleting a label from another user's card", async () => {
    const owner = await createTestUser("owner@example.com");
    const other = await createTestUser("other@example.com");
    const board = await createTestBoard(owner.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);
    const label = await prisma.label.create({
      data: { id: "lbl-sec", name: "Sec", color: "#0000FF", cardId: card.id },
    });

    setSession(other.id, other.email);
    const result = await deleteLabel(label.id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });
});

describe("getCardWithLabels", () => {
  it("returns a card with its labels", async () => {
    const user = await createTestUser();
    setSession(user.id, user.email);
    const board = await createTestBoard(user.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id, "Detailed Card");
    await prisma.label.create({ data: { id: "lbl-g1", name: "P1", color: "#AABBCC", cardId: card.id } });

    const result = await getCardWithLabels(card.id);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.title).toBe("Detailed Card");
    expect(result.data.labels).toHaveLength(1);
    expect(result.data.labels[0].name).toBe("P1");
  });

  it("rejects fetching another user's card", async () => {
    const owner = await createTestUser("owner@example.com");
    const other = await createTestUser("other@example.com");
    const board = await createTestBoard(owner.id);
    const list = await createTestList(board.id);
    const card = await createTestCard(list.id);

    setSession(other.id, other.email);
    const result = await getCardWithLabels(card.id);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe("Unauthorized");
  });
});
