"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { UnauthorizedError, NotFoundError, type ActionResult } from "@/lib/errors";

async function requireAdminAuth() {
  const session = await getServerSession();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new UnauthorizedError("Admin access required");
  }
  return session.user;
}

export interface AdminStats {
  totalUsers: number;
  totalBoards: number;
  totalCards: number;
  totalSubtasks: number;
  totalAdmins: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  boardCount: number;
}

export async function getAdminStats(): Promise<ActionResult<AdminStats>> {
  try {
    await requireAdminAuth();

    const [totalUsers, totalBoards, totalCards, totalSubtasks, totalAdmins] = await Promise.all([
      prisma.user.count(),
      prisma.board.count(),
      prisma.card.count(),
      prisma.subtask.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
    ]);

    return {
      success: true,
      data: {
        totalUsers,
        totalBoards,
        totalCards,
        totalSubtasks,
        totalAdmins,
      },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    return { success: false, error: "Failed to fetch admin stats" };
  }
}

export async function getAdminUsers(): Promise<ActionResult<AdminUserItem[]>> {
  try {
    await requireAdminAuth();

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: { boards: true },
        },
      },
    });

    const formatted: AdminUserItem[] = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      boardCount: u._count.boards,
    }));

    return { success: true, data: formatted };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    return { success: false, error: "Failed to fetch users" };
  }
}

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["USER", "ADMIN"]),
});

export async function updateUserRole(data: unknown): Promise<ActionResult<void>> {
  try {
    const adminUser = await requireAdminAuth();
    const parsed = updateRoleSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
    }

    const { userId, role } = parsed.data;

    // Prevent last admin from demoting themselves
    if (adminUser.id === userId && role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return { success: false, error: "Cannot demote the only remaining Admin account." };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    return { success: false, error: "Failed to update user role" };
  }
}

export async function deleteUserByAdmin(userId: string): Promise<ActionResult<void>> {
  try {
    const adminUser = await requireAdminAuth();

    if (adminUser.id === userId) {
      return { success: false, error: "You cannot delete your own active Admin account." };
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new NotFoundError("User not found");

    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (error instanceof NotFoundError) return { success: false, error: "User not found" };
    return { success: false, error: "Failed to delete user" };
  }
}
