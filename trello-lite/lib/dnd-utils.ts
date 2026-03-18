import type { Card, List } from "@prisma/client";

export type ListWithCards = List & { cards: Card[] };
export type BoardWithLists = { id: string; lists: ListWithCards[] };

export function applyOptimisticMove(
  board: BoardWithLists,
  vars: { cardId: string; destListId: string; destIndex: number; sourceListId: string; sourceIndex: number }
): BoardWithLists {
  const { cardId, destListId, destIndex, sourceListId, sourceIndex } = vars;

  const newLists = board.lists.map((list) => ({ ...list, cards: [...list.cards] }));

  const sourceList = newLists.find((l) => l.id === sourceListId);
  const destList = newLists.find((l) => l.id === destListId);

  if (!sourceList || !destList) return board;

  const [movedCard] = sourceList.cards.splice(sourceIndex, 1);
  if (!movedCard) return board;

  if (sourceListId === destListId) {
    sourceList.cards.splice(destIndex, 0, movedCard);
    sourceList.cards.forEach((c, i) => (c.order = i));
  } else {
    destList.cards.splice(destIndex, 0, { ...movedCard, listId: destListId });
    sourceList.cards.forEach((c, i) => (c.order = i));
    destList.cards.forEach((c, i) => (c.order = i));
  }

  return { ...board, lists: newLists };
}

export function applyOptimisticListReorder(
  board: BoardWithLists,
  orderedListIds: string[]
): BoardWithLists {
  const listMap = new Map(board.lists.map((l) => [l.id, l]));
  const newLists = orderedListIds
    .map((id, index) => {
      const list = listMap.get(id);
      return list ? { ...list, order: index } : null;
    })
    .filter(Boolean) as ListWithCards[];
  return { ...board, lists: newLists };
}
