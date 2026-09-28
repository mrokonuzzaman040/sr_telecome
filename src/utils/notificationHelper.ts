import { soundService } from "./soundHelper";

/**
 * Web Desktop & Browser Notification Service
 * Works across Chrome, Edge, Safari, Firefox
 */
class NotificationService {
  private hasRequestedPermission = false;

  /**
   * Check if Desktop Notification is supported and enabled
   */
  public isSupported(): boolean {
    return typeof window !== "undefined" && "Notification" in window;
  }

  public getPermission(): NotificationPermission | "unsupported" {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      this.hasRequestedPermission = true;
      return permission === "granted";
    } catch (e) {
      console.error("Error requesting notification permission:", e);
      return false;
    }
  }

  /**
   * Dispatch a native browser notification
   */
  public notify(title: string, options?: NotificationOptions): Notification | null {
    if (!this.isSupported()) return null;

    if (Notification.permission === "granted") {
      try {
        const notif = new Notification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          ...options,
        });

        // Auto close after 6 seconds
        setTimeout(() => {
          try {
            notif.close();
          } catch {}
        }, 6000);

        return notif;
      } catch (err) {
        console.error("Browser notification display error:", err);
      }
    }
    return null;
  }

  /**
   * Trigger sale notification:
   * 1. Cash register celebratory sound chime
   * 2. Browser native desktop alert
   */
  public triggerSaleAlert(data: {
    invoiceNo: string;
    amount: number;
    customerName?: string;
    itemCount: number;
  }) {
    // 1. Play crystal-clear offline Web Audio synthesizer chime
    soundService.playCashRegisterChime();

    // 2. Dispatch Desktop Notification
    const title = `💰 বিক্রয় সম্পন্ন! #${data.invoiceNo}`;
    const body = `${data.customerName ? `ক্রেতা: ${data.customerName}\n` : ""}মোট পরিমাণ: ৳${data.amount.toLocaleString()} (${data.itemCount} টি পণ্য)`;

    this.notify(title, {
      body,
      tag: `sale-${data.invoiceNo}`,
      requireInteraction: false,
    });
  }

  /**
   * Trigger low stock warning
   */
  public triggerLowStockAlert(data: {
    productName: string;
    stockQty: number;
  }) {
    soundService.playAlertSound();

    const title = `⚠️ কম স্টক সতর্কতা!`;
    const body = `"${data.productName}" পণ্যের স্টক শেষ পর্যায়ে (বাকি মাত্র ${data.stockQty} টি)`;

    this.notify(title, {
      body,
      tag: `low-stock-${data.productName}`,
    });
  }
}

export const notificationService = new NotificationService();
