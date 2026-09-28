import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  signSessionToken,
  setSessionCookie,
  verifyPin,
  hashPin,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limiting: Maximum 5 attempts per 5 minutes per IP to block brute-force attacks
    const rateCheck = checkRateLimit(`login:${ip}`, 5, 300);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many login attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateCheck.retryAfterSeconds) },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { username, pin } = body;

    if (!username || !pin) {
      return NextResponse.json(
        { error: "Username and PIN are required." },
        { status: 400 }
      );
    }

    const cleanUser = String(username).trim().toLowerCase();
    const cleanPin = String(pin).trim();

    // Query real Supabase PostgreSQL users table
    const rows = await query(
      `SELECT id, name, username, role, pin 
       FROM users 
       WHERE LOWER(username) = $1 OR LOWER(role) = $1 
       LIMIT 1`,
      [cleanUser]
    );

    if (rows && rows.length > 0) {
      const dbUser = rows[0];
      const isMatch = verifyPin(cleanPin, dbUser.pin);

      if (isMatch) {
        // Transparently upgrade legacy plaintext PIN to cryptographically hashed PBKDF2
        if (!dbUser.pin.startsWith("pbkdf2$")) {
          query(`UPDATE users SET pin = $1 WHERE id = $2`, [
            hashPin(cleanPin),
            dbUser.id,
          ]).catch((err) => {
            console.error("Non-blocking PIN upgrade error:", err);
          });
        }

        const safeUser = {
          id: dbUser.id,
          name: dbUser.name,
          username: dbUser.username,
          role: dbUser.role as "admin" | "staff",
        };

        const token = signSessionToken(safeUser, 7);
        const response = NextResponse.json({
          success: true,
          user: safeUser,
          token,
        });

        // Set HttpOnly cookie for Web browser sessions
        setSessionCookie(response, token, 7);

        return response;
      }
    }

    return NextResponse.json(
      { error: "Invalid username or PIN code." },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "Internal authentication error." },
      { status: 500 }
    );
  }
}
