export function formatBDT(amount: number | string | undefined | null): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (value === undefined || value === null || isNaN(value)) return "৳ 0";
  const num = Math.round((value + Number.EPSILON) * 100) / 100;
  const parts = num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `৳ ${parts}`;
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateOnly(dateString?: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Extract the local date (YYYY-MM-DD) from an ISO timestamp string.
 * This is critical for Bangladesh (UTC+6): a sale at 01:00 local time
 * has a UTC createdAt of the *previous* day, so we must parse in local time.
 */
export function getLocalDateFromISO(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
