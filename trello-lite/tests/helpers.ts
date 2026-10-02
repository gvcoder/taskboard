import { vi } from "vitest";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const mockGetServerSession = getServerSession as ReturnType<typeof vi.fn>;

/** Seed a user and return it */
export async function createTestUser(email = "test@example.com", password = "password123") {
  const hashed = await bcrypt.hash(password, 1); // cost 1 for speed in tests
  return prisma.user.create({ data: { id: `user-${Date.now()}`, email, password: hashed } });
}

/** Set the mocked session to act as a given user */
export function setSession(userId: string, email = "test@example.com", role = "USER") {
  mockGetServerSession.mockResolvedValue({
    user: { id: userId, email, role },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });
}

/** Clear the mocked session (unauthenticated) */
export function clearSession() {
  mockGetServerSession.mockResolvedValue(null);
}

/** Seed a board owned by userId */
export async function createTestBoard(userId: string, title = "Test Board") {
  return prisma.board.create({
    data: { id: `board-${Date.now()}-${Math.random()}`, title, userId },
  });
}

/** Seed a list inside a board */
export async function createTestList(boardId: string, title = "Test List", order = 0) {
  return prisma.list.create({
    data: { id: `list-${Date.now()}-${Math.random()}`, title, boardId, order },
  });
}

/** Seed a card inside a list */
export async function createTestCard(listId: string, title = "Test Card", order = 0) {
  return prisma.card.create({
    data: { id: `card-${Date.now()}-${Math.random()}`, title, listId, order },
  });
}

/** Clean all tables between tests */
export async function cleanDb() {
  await prisma.subtask.deleteMany();
  await prisma.label.deleteMany();
  await prisma.card.deleteMany();
  await prisma.list.deleteMany();
  await prisma.board.deleteMany();
  await prisma.user.deleteMany();
}
