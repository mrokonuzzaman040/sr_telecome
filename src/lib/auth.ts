import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export interface SessionPayload {
  id: string;
  name: string;
  username: string;
  role: "admin" | "staff";
  exp: number; // Unix timestamp in seconds
}

export const SESSION_COOKIE_NAME = "sr_session_token";

// Secret key for HMAC token signing. Must be set explicitly per environment;
// there is no hardcoded fallback since that would let anyone forge session
// tokens by reading this file.
const _rawAuthSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

if (!_rawAuthSecret || _rawAuthSecret.length < 32) {
  throw new Error(
    "AUTH_SECRET (or NEXTAUTH_SECRET) env var must be set to a random value of at least 32 characters. Generate one with: openssl rand -base64 48"
  );
}

const AUTH_SECRET: string = _rawAuthSecret;

/**
 * Signs a tamper-proof session token.
 */
export function signSessionToken(
  user: { id: string; name: string; username: string; role: "admin" | "staff" },
  expiresInDays = 7
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");

  const payloadData: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60,
  };

  const payload = Buffer.from(JSON.stringify(payloadData)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Validates and decodes a signed session token.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    // Timing-safe comparison to prevent timing attacks
    if (
      signature.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    ) as SessionPayload;

    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Checks authentication on incoming Next.js API requests.
 * Accepts either:
 *  1. `sr_session_token` HTTP cookie (web browser)
 *  2. `Authorization: Bearer <token>` header (mobile Flutter app / external client)
 */
export async function verifyAuth(
  req: NextRequest,
  options?: { requiredRole?: "admin" | "staff" }
): Promise<
  | { success: true; user: SessionPayload }
  | { success: false; response: NextResponse }
> {
  let token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      ),
    };
  }

  const user = verifySessionToken(token);
  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Session expired or invalid. Please log in again." },
        { status: 401 }
      ),
    };
  }

  if (options?.requiredRole && user.role !== options.requiredRole) {
    return {
      success: false,
      response: NextResponse.json(
        { error: `Forbidden: '${options.requiredRole}' privileges required.` },
        { status: 403 }
      ),
    };
  }

  return { success: true, user };
}

/**
 * Sets an HttpOnly, SameSite, Secure cookie for authenticated session.
 */
export function setSessionCookie(
  res: NextResponse,
  token: string,
  rememberDays = 7
) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: rememberDays * 24 * 60 * 60,
  });
}

/**
 * Clears the session cookie on logout.
 */
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Hashes a PIN using PBKDF2 with a cryptographic salt.
 */
const PBKDF2_ITERATIONS = 600_000; // OWASP-recommended minimum for PBKDF2-SHA256

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(pin, salt, PBKDF2_ITERATIONS, 32, "sha256")
    .toString("hex");
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verifies a PIN against stored value (supports both PBKDF2 hash and legacy plaintext).
 */
export function verifyPin(inputPin: string, storedPin: string): boolean {
  if (!inputPin || !storedPin) return false;

  if (storedPin.startsWith("pbkdf2$")) {
    const parts = storedPin.split("$");
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const expectedHash = parts[3];
      const computedHash = crypto
        .pbkdf2Sync(inputPin, salt, iterations, 32, "sha256")
        .toString("hex");

      if (computedHash.length !== expectedHash.length) return false;
      return crypto.timingSafeEqual(
        Buffer.from(computedHash),
        Buffer.from(expectedHash)
      );
    }
  }

  // Backwards compatibility with initial seed plaintext PINs
  return inputPin === storedPin;
}
