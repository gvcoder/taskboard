# Trello-Lite Taskboard - Current Project Status

**Last Updated:** October 2, 2026

## 1. Project Overview

**Trello-Lite** is a full-stack task creation and tracking application built using Next.js (App Router). Features include self-registration, user login, personal workspaces (boards), workflow columns (lists), drag-and-drop task cards with due dates, labels, **AI-powered task breakdown subtasks**, and a dedicated **Admin Management Console**.

* **Repository Location:** `/home/gvmuthu/code/taskboard/taskboard`
* **App Directory:** `trello-lite`
* **Specifications:** `.kiro/specs/trello-lite/` (`requirements.md`, `design.md`, `tasks.md`)

### Demo Credentials

| Role | Email | Password | Access Level & Behavior |
| :--- | :--- | :--- | :--- |
| **Standard User** | `demo@example.com` | `password123` | Boards, Lists, Cards, AI Subtask Generator (Redirects to `/boards`) |
| **Admin User** | `admin@example.com` | `admin123` | Full Access + Auto-Redirect to Admin Console (`/admin`) + Header Console Link |

---

## 2. Technical Stack

* **Framework:** Next.js `16.1.7` (App Router) + React `19.2.3` + TypeScript
* **Database & ORM:** SQLite via Better-SQLite3 (`^12.8.0`) + Prisma ORM (`7.5.0`)
* **AI Integration:** `@google/genai` SDK with ultra-low-cost `gemini-2.5-flash-lite` model & JSON schema output
* **Authentication & RBAC:** NextAuth.js (`^4.24.13`) with Credentials Provider, JWT Strategy & Role-Based Authorization (`USER` / `ADMIN`)
* **State Management & Data Fetching:** `@tanstack/react-query` (`^5.90.21`)
* **Drag-and-Drop:** `@hello-pangea/dnd` (`^18.0.1`)
* **Styling & Components:** Tailwind CSS `v4`, `@radix-ui/react-*` components, Lucide icons
* **Validation:** Zod (`^4.3.6`)
* **Testing:** Vitest (`^4.1.0`) for unit/integration tests, Playwright (`^1.58.2`) for end-to-end tests

---

## 3. Implementation Status Summary

### Completed Features:

1. **Database Schema & Migrations**
   * `User` model extended with `role` field (`USER` | `ADMIN`, default `USER`).
   * `Subtask` model added (`id`, `title`, `completed`, `order`, `cardId`) with `onDelete: Cascade`.
   * Applied migrations: `20261002122522_add_subtask_model` & `20261002141204_add_user_role`.

2. **Admin Dashboard Console (`app/(app)/admin/page.tsx` & `components/AdminClient.tsx`)**
   * Protected route `/admin` guarded by admin session role check.
   * Automatic login redirect to `/admin` for Admin users.
   * System metrics summary bar (Total Users, Total Boards, Total Cards, Total Subtasks).
   * User management table showing Email, Name, Role badge (`ADMIN` / `USER`), Total Boards count badge, joined date, and actions.
   * Capability to promote/demote user roles and delete user accounts (with cascade deletion of user boards).
   * **Admin Console** button (`Shield` icon) displayed in the header navigation bar for Admin users.

3. **Admin Server Actions (`actions/admin.ts`)**
   * Strict `requireAdminAuth` guard.
   * `getAdminStats`, `getAdminUsers`, `updateUserRole`, `deleteUserByAdmin`.

4. **AI Task Breakdown Engine (`lib/ai.ts` & `actions/ai.ts`)**
   * Built using `@google/genai` targeting cost-efficient Flash-Lite models (`gemini-2.5-flash-lite`, `gemini-3.1-flash-lite`).
   * Configured structured JSON schema generation to produce actionable subtasks and color-coded labels inserted into cards via `CardModal`.

5. **Subtask Checklist & UI Components (`components/CardModal.tsx`, `components/CardItem.tsx`)**
   * **"AI Subtask Breakdown"** button in `CardModal.tsx` with active loading state.
   * Subtask Checklist UI with completion progress bar (`%`), checkboxes, inline deletion, and manual subtask creation.
   * Subtask progress badge (`CheckSquare 2/5`) rendered directly on card tiles in `CardItem.tsx`.

---

## 4. Test Suite & Verification Results

* **Prisma Client:** Generated successfully (`v7.5.0`).
* **Unit & Integration Tests (Vitest):** **64 / 64 tests passed** across 7 test suites.
  * `tests/actions/auth.test.ts`: Passed (5 tests)
  * `tests/actions/board.test.ts`: Passed (11 tests)
  * `tests/actions/card.test.ts`: Passed (22 tests)
  * `tests/actions/list.test.ts`: Passed (9 tests)
  * `tests/actions/subtask.test.ts`: Passed (4 tests)
  * `tests/actions/admin.test.ts`: Passed (5 tests)
  * `tests/dnd-utils.test.ts`: Passed (8 tests)

---

## 5. File & Directory Architecture

```
trello-lite/
├── actions/             # Server Actions (auth, board, list, card, subtask, ai, admin)
├── app/                 # Next.js App Router routes
│   ├── (app)/           # Protected routes (/boards, /boards/[boardId], /admin)
│   ├── (auth)/          # Auth routes (/login, /register)
│   └── api/             # API routes (NextAuth endpoint)
├── components/          # React Components (AdminClient, BoardClient, ListColumn, CardItem, CardModal, etc.)
├── lib/                 # Utilities (prisma, auth, ai, dnd-utils, errors, query-client)
├── prisma/              # Prisma schema, migrations & SQLite DB file (schema.prisma, dev.db)
├── tests/               # Vitest unit and integration test suite
└── e2e/                 # Playwright end-to-end specs
```
