import { describe, it, expect } from "vitest";
import { applyOptimisticMove, applyOptimisticListReorder } from "@/lib/dnd-utils";
import type { BoardWithLists } from "@/lib/dnd-utils";

function makeBoard(lists: { id: string; cards: { id: string }[] }[]): BoardWithLists {
  return {
    id: "board-1",
    lists: lists.map((l, li) => ({
      id: l.id,
      title: `List ${li}`,
      order: li,
      boardId: "board-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      cards: l.cards.map((c, ci) => ({
        id: c.id,
        title: `Card ${ci}`,
        order: ci,
        listId: l.id,
        description: null,
        dueDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    })),
  };
}

describe("applyOptimisticMove", () => {
  it("reorders a card within the same list", () => {
    const board = makeBoard([{ id: "l1", cards: [{ id: "c1" }, { id: "c2" }, { id: "c3" }] }]);
    const result = applyOptimisticMove(board, {
      cardId: "c1",
      sourceListId: "l1",
      sourceIndex: 0,
      destListId: "l1",
      destIndex: 2,
    });
    const cards = result.lists[0].cards;
    expect(cards.map((c) => c.id)).toEqual(["c2", "c3", "c1"]);
    expect(cards.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it("moves a card to a different list", () => {
    const board = makeBoard([
      { id: "l1", cards: [{ id: "c1" }, { id: "c2" }] },
      { id: "l2", cards: [{ id: "c3" }] },
    ]);
    const result = applyOptimisticMove(board, {
      cardId: "c1",
      sourceListId: "l1",
      sourceIndex: 0,
      destListId: "l2",
      destIndex: 0,
    });
    const src = result.lists.find((l) => l.id === "l1")!;
    const dst = result.lists.find((l) => l.id === "l2")!;
    expect(src.cards.map((c) => c.id)).toEqual(["c2"]);
    expect(dst.cards.map((c) => c.id)).toEqual(["c1", "c3"]);
    expect(dst.cards[0].listId).toBe("l2");
    expect(dst.cards.map((c) => c.order)).toEqual([0, 1]);
  });

  it("returns original board when source list not found", () => {
    const board = makeBoard([{ id: "l1", cards: [{ id: "c1" }] }]);
    const result = applyOptimisticMove(board, {
      cardId: "c1",
      sourceListId: "nonexistent",
      sourceIndex: 0,
      destListId: "l1",
      destIndex: 0,
    });
    expect(result).toBe(board);
  });

  it("returns original board when card not found at sourceIndex", () => {
    const board = makeBoard([{ id: "l1", cards: [] }]);
    const result = applyOptimisticMove(board, {
      cardId: "c1",
      sourceListId: "l1",
      sourceIndex: 5,
      destListId: "l1",
      destIndex: 0,
    });
    expect(result).toBe(board);
  });

  it("does not mutate the original board", () => {
    const board = makeBoard([{ id: "l1", cards: [{ id: "c1" }, { id: "c2" }] }]);
    const originalIds = board.lists[0].cards.map((c) => c.id);
    applyOptimisticMove(board, {
      cardId: "c1",
      sourceListId: "l1",
      sourceIndex: 0,
      destListId: "l1",
      destIndex: 1,
    });
    expect(board.lists[0].cards.map((c) => c.id)).toEqual(originalIds);
  });
});

describe("applyOptimisticListReorder", () => {
  it("reorders lists by the given id order", () => {
    const board = makeBoard([
      { id: "l1", cards: [] },
      { id: "l2", cards: [] },
      { id: "l3", cards: [] },
    ]);
    const result = applyOptimisticListReorder(board, ["l3", "l1", "l2"]);
    expect(result.lists.map((l) => l.id)).toEqual(["l3", "l1", "l2"]);
    expect(result.lists.map((l) => l.order)).toEqual([0, 1, 2]);
  });

  it("ignores unknown ids gracefully", () => {
    const board = makeBoard([{ id: "l1", cards: [] }]);
    const result = applyOptimisticListReorder(board, ["l1", "unknown"]);
    expect(result.lists.map((l) => l.id)).toEqual(["l1"]);
  });

  it("does not mutate the original board", () => {
    const board = makeBoard([
      { id: "l1", cards: [] },
      { id: "l2", cards: [] },
    ]);
    applyOptimisticListReorder(board, ["l2", "l1"]);
    expect(board.lists[0].id).toBe("l1");
  });
});
