import crypto from "crypto";

const SECRET = process.env.NEXTAUTH_SECRET || "mobile-default-secret-key-fallback";

export interface MobileTokenPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

export function signMobileToken(payload: Omit<MobileTokenPayload, "exp">, expiresInDays = 30): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  const fullPayload: MobileTokenPayload = { ...payload, exp };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyMobileToken(token: string): MobileTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(encodedPayload)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const payload: MobileTokenPayload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf-8")
    );

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getMobileUserFromRequest(request: Request): MobileTokenPayload | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;

  return verifyMobileToken(parts[1]);
}
