import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json();
    if (!username || !pin) {
      return NextResponse.json(
        { error: "Username and PIN are required" },
        { status: 400 }
      );
    }

    const cleanUser = String(username).trim().toLowerCase();
    const cleanPin = String(pin).trim();

    // Query real Supabase PostgreSQL users table
    const rows = await query(
      `SELECT id, name, username, role 
       FROM users 
       WHERE (LOWER(username) = $1 OR LOWER(role) = $1) AND pin = $2 
       LIMIT 1`,
      [cleanUser, cleanPin]
    );

    if (rows && rows.length > 0) {
      return NextResponse.json({
        success: true,
        user: rows[0],
      });
    }

    return NextResponse.json(
      { error: "Invalid username or PIN code" },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
