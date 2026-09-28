import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyAuth, hashPin, verifyPin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) {
      return auth.response;
    }

    const body = await req.json().catch(() => ({}));
    const { currentPin, newPin, targetUserId } = body;

    if (!newPin || typeof newPin !== "string" || !/^\d{4,6}$/.test(newPin.trim())) {
      return NextResponse.json(
        { error: "New PIN must be 4 to 6 digits." },
        { status: 400 }
      );
    }

    const cleanNewPin = newPin.trim();

    // Case 1: Admin resetting another user's PIN
    if (targetUserId && targetUserId !== auth.user.id) {
      if (auth.user.role !== "admin") {
        return NextResponse.json(
          { error: "Only admin can reset another user's PIN." },
          { status: 403 }
        );
      }

      const rows = await query(`SELECT id FROM users WHERE id = $1`, [targetUserId]);
      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: "Target user not found." }, { status: 404 });
      }

      await query(`UPDATE users SET pin = $1 WHERE id = $2`, [
        hashPin(cleanNewPin),
        targetUserId,
      ]);

      return NextResponse.json({
        success: true,
        message: "User PIN updated successfully.",
      });
    }

    // Case 2: User changing their own PIN (requires verifying currentPin)
    if (!currentPin) {
      return NextResponse.json(
        { error: "Current PIN is required." },
        { status: 400 }
      );
    }

    const rows = await query(`SELECT id, pin FROM users WHERE id = $1`, [
      auth.user.id,
    ]);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const isCurrentValid = verifyPin(String(currentPin).trim(), rows[0].pin);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Current PIN is incorrect." },
        { status: 400 }
      );
    }

    await query(`UPDATE users SET pin = $1 WHERE id = $2`, [
      hashPin(cleanNewPin),
      auth.user.id,
    ]);

    return NextResponse.json({
      success: true,
      message: "PIN updated successfully.",
    });
  } catch (error: any) {
    console.error("Change PIN Error:", error);
    return NextResponse.json(
      { error: "Failed to update PIN." },
      { status: 500 }
    );
  }
}
