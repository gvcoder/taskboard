import { describe, it, expect, beforeEach } from "vitest";
import { registerUser } from "@/actions/auth";
import { cleanDb } from "../helpers";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

beforeEach(cleanDb);

describe("registerUser", () => {
  it("creates a user with a hashed password", async () => {
    const result = await registerUser({ email: "alice@example.com", password: "secret123" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.email).toBe("alice@example.com");

    const user = await prisma.user.findUnique({ where: { email: "alice@example.com" } });
    expect(user).not.toBeNull();
    expect(user!.password).not.toBe("secret123");
    const match = await bcrypt.compare("secret123", user!.password);
    expect(match).toBe(true);
  });

  it("rejects an invalid email format", async () => {
    const result = await registerUser({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/email/i);
  });

  it("rejects an empty password", async () => {
    const result = await registerUser({ email: "bob@example.com", password: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/password/i);
  });

  it("rejects a duplicate email", async () => {
    await registerUser({ email: "dup@example.com", password: "pass1" });
    const result = await registerUser({ email: "dup@example.com", password: "pass2" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/taken/i);
  });

  it("rejects missing fields", async () => {
    const result = await registerUser({});
    expect(result.success).toBe(false);
  });
});
