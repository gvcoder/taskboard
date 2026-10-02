import { describe, it, expect, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import {
  getAdminStats,
  getAdminUsers,
  updateUserRole,
  deleteUserByAdmin,
} from "@/actions/admin";
import {
  cleanDb,
  createTestUser,
  createTestBoard,
  setSession,
} from "../helpers";

describe("Admin Server Actions", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  it("rejects admin actions for non-admin standard users", async () => {
    const user = await createTestUser("user@example.com");
    setSession(user.id, user.email, "USER");

    const statsRes = await getAdminStats();
    expect(statsRes.success).toBe(false);
    if (statsRes.success) return;
    expect(statsRes.error).toBe("Unauthorized");

    const usersRes = await getAdminUsers();
    expect(usersRes.success).toBe(false);
  });

  it("allows admin users to fetch stats and user directory with board counts", async () => {
    const admin = await prisma.user.create({
      data: {
        id: `admin-${Date.now()}`,
        email: "admin@example.com",
        password: "hash",
        role: "ADMIN",
      },
    });
    const standardUser = await createTestUser("member@example.com");
    await createTestBoard(standardUser.id, "Member Board 1");
    await createTestBoard(standardUser.id, "Member Board 2");

    setSession(admin.id, admin.email, "ADMIN");

    const statsRes = await getAdminStats();
    expect(statsRes.success).toBe(true);
    if (!statsRes.success) return;
    expect(statsRes.data.totalUsers).toBe(2);
    expect(statsRes.data.totalBoards).toBe(2);
    expect(statsRes.data.totalAdmins).toBe(1);

    const usersRes = await getAdminUsers();
    expect(usersRes.success).toBe(true);
    if (!usersRes.success) return;
    expect(usersRes.data).toHaveLength(2);

    const memberItem = usersRes.data.find((u) => u.email === "member@example.com");
    expect(memberItem).toBeDefined();
    expect(memberItem?.boardCount).toBe(2);
  });

  it("allows admin to promote user to ADMIN and demote back to USER", async () => {
    const admin = await prisma.user.create({
      data: {
        id: `admin-${Date.now()}`,
        email: "admin@example.com",
        password: "hash",
        role: "ADMIN",
      },
    });
    const target = await createTestUser("target@example.com");
    setSession(admin.id, admin.email, "ADMIN");

    // Promote target
    const promoteRes = await updateUserRole({ userId: target.id, role: "ADMIN" });
    expect(promoteRes.success).toBe(true);

    const updated = await prisma.user.findUnique({ where: { id: target.id } });
    expect(updated?.role).toBe("ADMIN");

    // Demote target
    const demoteRes = await updateUserRole({ userId: target.id, role: "USER" });
    expect(demoteRes.success).toBe(true);

    const demoted = await prisma.user.findUnique({ where: { id: target.id } });
    expect(demoted?.role).toBe("USER");
  });

  it("allows admin to delete another user account and cascade delete their boards", async () => {
    const admin = await prisma.user.create({
      data: {
        id: `admin-${Date.now()}`,
        email: "admin@example.com",
        password: "hash",
        role: "ADMIN",
      },
    });
    const target = await createTestUser("victim@example.com");
    const targetBoard = await createTestBoard(target.id, "Target Board");

    setSession(admin.id, admin.email, "ADMIN");

    const delRes = await deleteUserByAdmin(target.id);
    expect(delRes.success).toBe(true);

    const checkUser = await prisma.user.findUnique({ where: { id: target.id } });
    expect(checkUser).toBeNull();

    const checkBoard = await prisma.board.findUnique({ where: { id: targetBoard.id } });
    expect(checkBoard).toBeNull();
  });

  it("prevents an admin from deleting their own active account", async () => {
    const admin = await prisma.user.create({
      data: {
        id: `admin-${Date.now()}`,
        email: "admin@example.com",
        password: "hash",
        role: "ADMIN",
      },
    });
    setSession(admin.id, admin.email, "ADMIN");

    const delRes = await deleteUserByAdmin(admin.id);
    expect(delRes.success).toBe(false);
    if (delRes.success) return;
    expect(delRes.error).toBe("You cannot delete your own active Admin account.");
  });
});
