import { query } from "@/lib/db";

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Fetch all active Android/Mobile device tokens registered with the store
 */
export async function getRegisteredDeviceTokens(): Promise<string[]> {
  try {
    const rows = await query<{ token: string }>(
      `SELECT token FROM device_tokens ORDER BY updated_at DESC`
    );
    return rows.map((r) => r.token).filter(Boolean);
  } catch (err) {
    console.warn("Could not query device_tokens table (table may not exist yet):", err);
    return [];
  }
}

/**
 * Send push notification to all registered Android mobile devices
 */
export async function broadcastPushNotification(payload: PushPayload): Promise<{
  successCount: number;
  failureCount: number;
  status: string;
}> {
  const fcmKey = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;
  const tokens = await getRegisteredDeviceTokens();

  if (tokens.length === 0) {
    return {
      successCount: 0,
      failureCount: 0,
      status: "no_registered_devices",
    };
  }

  if (!fcmKey) {
    console.log(
      `[FCM] Notification skipped (${tokens.length} devices): FCM_SERVER_KEY is not configured in .env.local`
    );
    return {
      successCount: 0,
      failureCount: tokens.length,
      status: "missing_fcm_key",
    };
  }

  let successCount = 0;
  let failureCount = 0;

  // Dispatch via FCM Legacy HTTP API (supported across all Firebase Android SDK projects)
  for (const token of tokens) {
    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${fcmKey}`,
        },
        body: JSON.stringify({
          to: token,
          priority: "high",
          notification: {
            title: payload.title,
            body: payload.body,
            sound: "default",
            badge: "1",
            android_channel_id: "sr_pos_sales_channel",
          },
          data: {
            ...payload.data,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        }),
      });

      if (res.ok) {
        successCount++;
      } else {
        failureCount++;
        const errorText = await res.text();
        console.warn(`[FCM] Delivery failed for token:`, errorText);
      }
    } catch (err) {
      failureCount++;
      console.error(`[FCM] Delivery network error:`, err);
    }
  }

  return { successCount, failureCount, status: "completed" };
}

/**
 * High-level helper to trigger push notification for every new sale
 */
export async function sendSalePushNotification(sale: {
  invoiceNo: string;
  payableAmount: number;
  paidAmount: number;
  dueAmount: number;
  customerName?: string;
  itemCount?: number;
}) {
  const title = `💰 নতুন বিক্রয় #${sale.invoiceNo}`;
  const body = `${sale.customerName ? `ক্রেতা: ${sale.customerName} | ` : ""}পরিমাণ: ৳${sale.payableAmount.toLocaleString()}${
    sale.dueAmount > 0 ? ` (বাকি: ৳${sale.dueAmount})` : " (পরিশোধিত)"
  }`;

  return broadcastPushNotification({
    title,
    body,
    data: {
      type: "sale",
      invoiceNo: sale.invoiceNo,
      amount: String(sale.payableAmount),
      paid: String(sale.paidAmount),
      due: String(sale.dueAmount),
      customerName: sale.customerName || "খুচরা ক্রেতা",
    },
  });
}
