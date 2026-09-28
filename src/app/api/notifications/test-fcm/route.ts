import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { getRegisteredDeviceTokens, broadcastPushNotification } from "@/lib/fcm";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    const tokens = await getRegisteredDeviceTokens();
    const fcmKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;

    return NextResponse.json({
      connected: true,
      projectId: process.env.FIREBASE_PROJECT_ID || "boighor-pos",
      fcmConfigured: Boolean(fcmKey),
      registeredDevicesCount: tokens.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req, { requiredRole: "admin" });
    if (!auth.success) return auth.response;

    const result = await broadcastPushNotification({
      title: "🔔 SR Telecom & Library - Firebase Test Alert",
      body: "Firebase Cloud Messaging পুশ নোটিফিকেশন সফলভাবে যুক্ত হয়েছে!",
      data: {
        type: "system_test",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      result,
      message: "Test push notification dispatched",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
