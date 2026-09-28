import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    const rows = await query(
      `SELECT id, type, title, message, metadata, 
              is_read as "read", created_at as "createdAt"
       FROM notifications 
       ORDER BY created_at DESC 
       LIMIT 50`
    );

    return NextResponse.json(rows);
  } catch (err: any) {
    // If table doesn't exist yet, return empty list gracefully
    console.warn("Notifications GET query fallback:", err?.message);
    return NextResponse.json([]);
  }
}

const NOTIFICATION_TYPES = new Set(["sale", "low_stock", "due", "system"]);

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req, { requiredRole: "admin" });
    if (!auth.success) return auth.response;

    const body = await req.json();
    // Server-generated id only - never trust a client-supplied id for a
    // shared, global notification feed.
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { title, message, metadata = {} } = body;
    const type = NOTIFICATION_TYPES.has(body.type) ? body.type : "system";

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    const rows = await query(
      `INSERT INTO notifications (id, type, title, message, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, type, title, message, metadata, is_read as "read", created_at as "createdAt"`,
      [id, type, title, message, JSON.stringify(metadata)]
    );

    return NextResponse.json({ success: true, notification: rows[0] });
  } catch (err: any) {
    console.error("Notifications POST Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    const body = await req.json();
    const { id, all } = body;

    if (all) {
      // Notifications are a shared global feed (no per-user read state yet),
      // so bulk mark-all-read affects every user - restrict it to admins.
      if (auth.user.role !== "admin") {
        return NextResponse.json(
          { error: "Forbidden: admin privileges required." },
          { status: 403 }
        );
      }
      await query(`UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE`);
    } else if (id) {
      await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1`, [id]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Notifications PATCH Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
