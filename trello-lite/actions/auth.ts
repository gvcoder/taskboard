"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import type { ActionResult } from "@/lib/errors";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function registerUser(
  data: unknown
): Promise<ActionResult<{ email: string }>> {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Validation error",
    };
  }

  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "Email is already taken" };
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, password: hashed } });

  return { success: true, data: { email } };
}
