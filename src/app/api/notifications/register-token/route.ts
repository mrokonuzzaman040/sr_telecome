import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    const body = await req.json();
    const { token, deviceName, platform = "android" } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Valid FCM device token is required" },
        { status: 400 }
      );
    }

    const id = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const userId = auth.user.id;

    // Upsert into device_tokens table
    await query(
      `INSERT INTO device_tokens (id, user_id, token, device_name, platform, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (token) 
       DO UPDATE SET 
         user_id = EXCLUDED.user_id,
         device_name = EXCLUDED.device_name,
         platform = EXCLUDED.platform,
         updated_at = NOW()`,
      [id, userId, token, deviceName || "Android Device", platform]
    );

    return NextResponse.json({
      success: true,
      message: "Device push token registered successfully",
    });
  } catch (err: any) {
    console.error("Device token register error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
