# Implementation Plan: Trello-Lite

## Overview

Incremental implementation of the Trello-Lite Next.js app. Each task builds on the previous, starting with project scaffolding and ending with a fully wired drag-and-drop board. The stack is Next.js 14 (App Router), Prisma + SQLite, NextAuth.js, React Query, @hello-pangea/dnd, Tailwind CSS, shadcn/ui, Zod, and bcryptjs.

## Tasks

- [x] 1. Project scaffolding and database setup
  - Initialize Next.js 14 app with App Router, Tailwind CSS, and TypeScript
  - Install all dependencies: `prisma`, `@prisma/client`, `next-auth`, `@tanstack/react-query`, `@hello-pangea/dnd`, `shadcn/ui`, `zod`, `bcryptjs`, `@types/bcryptjs`
  - Create `prisma/schema.prisma` with User, Board, List, Card, and Label models exactly as specified in the design
  - Run `prisma migrate dev --name init` to generate the SQLite database
  - Configure `lib/prisma.ts` singleton client
  - _Requirements: 9.1, 9.4, 9.5, 9.6_

- [x] 2. Authentication
  - [x] 2.1 Implement NextAuth.js credentials provider
    - Create `app/api/auth/[...nextauth]/route.ts` with CredentialsProvider
    - Implement `authorize` callback: find user by email, `bcrypt.compare` password, return user or null
    - Configure JWT session strategy with HTTP-only cookie
    - Create `lib/auth.ts` exporting `authOptions` and `getServerSession` wrapper
    - _Requirements: 2.2, 2.3, 2.4, 8.1, 8.5_
  - [x] 2.2 Build registration server action and page
    - Create `actions/auth.ts` with `registerUser` action: Zod validation (email format, non-empty password), check email uniqueness, `bcrypt.hash` with cost 12, `db.user.create`
    - Create `app/(auth)/register/page.tsx` with email + password form wired to `registerUser`; show field-level errors; redirect to `/boards` on success
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 2.3 Build login page and logout
    - Create `app/(auth)/login/page.tsx` with email + password form calling `signIn("credentials", ...)`; display generic error on failure (do not reveal which field is wrong)
    - Add logout button calling `signOut()` that redirects to login page
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  - [ ]* 2.4 Write property test for authorization rejection (Property 8)
    - **Property 8: Authorization rejection**
    - **Validates: Requirements 3.5, 4.4, 5.4, 8.1, 8.2**
    - Use fast-check to generate arbitrary server action calls without a valid session and assert each returns an Unauthorized error with no DB mutation
  - [ ]* 2.5 Write property test for validation rejection (Property 9)
    - **Property 9: Validation rejects invalid input**
    - **Validates: Requirements 3.6, 4.5, 5.5, 7.5, 8.3, 8.4**
    - Use fast-check to generate inputs that fail Zod schemas and assert no DB operation is performed

- [x] 3. Checkpoint — auth baseline
  - Ensure registration, login, logout, and session-protected route redirect all work. Ask the user if questions arise.

- [x] 4. Board server actions and dashboard
  - [x] 4.1 Implement board server actions
    - Create `actions/board.ts` with `createBoard`, `deleteBoard`, and `getBoards`
    - Each action: call `getServerSession()`, throw `UnauthorizedError` if no session, validate input with Zod (title non-empty, max 100 chars), perform DB operation
    - `deleteBoard` verifies `board.userId === session.user.id` before deleting
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ]* 4.2 Write property test for board ownership integrity (Property 1)
    - **Property 1: Board ownership integrity**
    - **Validates: Requirements 9.1**
    - Use fast-check to create arbitrary boards and assert every Board in the DB has a `userId` referencing an existing User
  - [x] 4.3 Build boards dashboard page
    - Create `app/(app)/boards/page.tsx` as a React Server Component fetching boards for the current user
    - Render a grid of `<BoardCard>` components (title, color swatch, delete button)
    - Add "Create Board" button that opens a shadcn Dialog with title + color inputs wired to `createBoard`
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 4.4 Write unit tests for board validation
    - Test `createBoard` rejects empty title and title > 100 chars
    - Test `deleteBoard` rejects when board belongs to a different user
    - _Requirements: 3.5, 3.6_

- [x] 5. List server actions
  - [x] 5.1 Implement list server actions
    - Create `actions/list.ts` with `createList`, `deleteList`, and `reorderLists`
    - `createList`: auth guard, ownership check, Zod validation (title non-empty, max 100 chars), `order = await db.list.count({ where: { boardId } })`
    - `reorderLists`: auth guard, ownership check, batch-update each list's `order` to its index in `orderedListIds` inside a `$transaction`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]* 5.2 Write property test for list order contiguity (Property 2)
    - **Property 2: List order contiguity**
    - **Validates: Requirements 4.1, 4.2, 9.2**
    - Use fast-check to generate sequences of create/reorder operations and assert list `order` values always equal `[0, 1, …, n-1]`
  - [ ]* 5.3 Write property test for list reorder is a permutation (Property 3)
    - **Property 3: List reorder is a permutation**
    - **Validates: Requirements 4.3**
    - Use fast-check to generate reorder inputs and assert the set of list ids is unchanged before and after

- [x] 6. Card server actions
  - [x] 6.1 Implement card CRUD server actions
    - Create `actions/card.ts` with `createCard`, `updateCard`, `deleteCard`
    - `createCard`: auth guard, ownership chain (card → list → board), Zod validation (title non-empty, max 255 chars), `order = await db.card.count({ where: { listId } })`
    - `updateCard`: auth guard, ownership check, Zod partial schema for title/description/dueDate
    - `deleteCard`: auth guard, ownership check, `db.card.delete`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 6.2 Write property test for card creation appends to end (Property 5)
    - **Property 5: Card creation appends to end**
    - **Validates: Requirements 5.1**
    - Use fast-check to generate lists with k existing cards, create a new card, and assert `newCard.order === k`
  - [ ]* 6.3 Write property test for card update round-trip (Property 10)
    - **Property 10: Card update round-trip**
    - **Validates: Requirements 5.2**
    - Use fast-check to generate valid update payloads, call `updateCard`, fetch the card, and assert all updated fields match
  - [x] 6.4 Implement `moveCard` server action
    - Add `moveCard({ cardId, destListId, destIndex })` to `actions/card.ts`
    - Auth guard + ownership check for both source and destination lists
    - Fetch source and destination card arrays, splice card out of source, insert at `destIndex` in destination, batch-update all `order` values in a `$transaction`, update `card.listId`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 6.5 Write property test for card order contiguity (Property 4)
    - **Property 4: Card order contiguity**
    - **Validates: Requirements 5.1, 6.1, 6.2, 6.3, 9.3**
    - Use fast-check to generate arbitrary create/move/reorder sequences and assert card `order` values always equal `[0, 1, …, m-1]`
  - [ ]* 6.6 Write property test for cross-list move uniqueness (Property 6)
    - **Property 6: Cross-list move uniqueness**
    - **Validates: Requirements 6.2, 6.4**
    - Use fast-check to generate cross-list moves and assert the moved card appears in exactly one list after the operation
  - [ ]* 6.7 Write property test for no duplicate order values (Property 7)
    - **Property 7: No duplicate order values after reorder**
    - **Validates: Requirements 6.3**
    - Use fast-check to generate reorder/move operations and assert no two cards in the same list share an `order` value

- [x] 7. Checkpoint — server actions complete
  - Ensure all server actions pass their unit and property tests. Ask the user if questions arise.

- [x] 8. React Query setup and data-fetching hooks
  - Create `lib/query-client.ts` and wrap the app in `<QueryClientProvider>` in `app/layout.tsx`
  - Create `queries/boards.ts` with `useBoards()` and `useBoard(boardId)` hooks using React Query `useQuery`
  - Create `queries/cards.ts` with `useCard(cardId)` hook (lazy, fetched only when CardModal opens)
  - All queries invalidate on relevant mutation success; stale-while-revalidate strategy
  - _Requirements: 6.5_

- [x] 9. Board view and list UI
  - [x] 9.1 Build `BoardView` component
    - Create `app/(app)/boards/[boardId]/page.tsx` fetching board with nested lists and cards (ordered by `order`)
    - Render `<DragDropContext>` from `@hello-pangea/dnd` wrapping a horizontal `<Droppable>` for lists
    - Wire `onDragEnd` to call `reorderLists` (type === "list") or `moveCard` (type === "card")
    - _Requirements: 4.2, 6.1, 6.2, 6.5, 6.6, 6.7_
  - [x] 9.2 Build `ListColumn` component
    - Create `components/ListColumn.tsx` with inline-editable title, `<Droppable>` card zone, and "Add a card" inline form
    - Inline form calls `createCard` on submit; clears on success
    - _Requirements: 4.1, 5.1_
  - [x] 9.3 Build `CardItem` component
    - Create `components/CardItem.tsx` as a `<Draggable>` item showing title, label color chips, and due date badge
    - On click, set selected card id in state to open `<CardModal>`
    - _Requirements: 6.5, 7.1_

- [x] 10. Optimistic drag-and-drop
  - Implement optimistic update in `useMutation` for `moveCard`: snapshot cache with `cancelQueries`, apply `applyOptimisticMove` helper to local state, rollback via `onError`
  - Implement `applyOptimisticMove(boardData, vars)` pure utility in `lib/dnd-utils.ts`
  - Handle `type === "list"` optimistic reorder similarly for `reorderLists`
  - _Requirements: 6.5, 6.6, 6.7_

- [x] 11. Card modal and labels
  - [x] 11.1 Build `CardModal` component
    - Create `components/CardModal.tsx` using shadcn Dialog
    - Fetch card detail via `useCard(cardId)` on open
    - Render editable title, description (textarea), due date (date input), and label list
    - Save button calls `updateCard`; delete button calls `deleteCard` then closes modal
    - _Requirements: 7.1, 7.2, 5.2, 5.3_
  - [x] 11.2 Implement label server actions
    - Add `addLabel({ cardId, name, color })` and `deleteLabel(labelId)` to `actions/card.ts`
    - Zod validation: `color` must match `/^#[0-9A-Fa-f]{6}$/`; `name` non-empty
    - Auth guard + ownership check via card → list → board chain
    - _Requirements: 7.3, 7.4, 7.5_
  - [ ]* 11.3 Write property test for label association round-trip (Property 11)
    - **Property 11: Label association round-trip**
    - **Validates: Requirements 7.3, 7.4**
    - Use fast-check to generate valid label inputs, add then fetch the card, assert label present; delete then fetch, assert label absent
  - [x] 11.4 Wire label UI in CardModal
    - Add "Add Label" form (name + color picker) calling `addLabel`; render each label with a delete button calling `deleteLabel`
    - Invalidate `useCard` query on add/delete success
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 12. Cascade delete and data integrity
  - Verify Prisma schema has `onDelete: Cascade` on all foreign keys (Board→User, List→Board, Card→List, Label→Card)
  - Write integration test: create board → lists → cards → labels, delete board, assert all nested records are gone
  - Write integration test: delete card, assert its labels are removed
  - _Requirements: 9.4, 9.5, 9.6_
  - [ ]* 12.1 Write property test for cascade delete completeness (Property 12)
    - **Property 12: Cascade delete completeness**
    - **Validates: Requirements 3.4, 9.4, 9.5, 9.6**
    - Use fast-check to generate boards with arbitrary nested lists/cards/labels, delete the board, and assert no orphaned records remain

- [x] 13. Error handling and toast notifications
  - Add a global toast provider (shadcn Toaster) in `app/layout.tsx`
  - In all `useMutation` `onError` callbacks, call `toast({ variant: "destructive", ... })` with the error message
  - Handle `NotFoundError` in board/list/card pages: redirect to `/boards` or render an error state component
  - _Requirements: 6.6_

- [x] 14. Final checkpoint — full integration
  - Ensure all tests pass (unit, property, integration). Verify drag-and-drop reorder, cross-list move, optimistic rollback, auth guard, and cascade delete all work end-to-end. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check; unit/integration tests use Vitest + Prisma test client against in-memory SQLite
- Checkpoints ensure incremental validation before moving to the next phase
