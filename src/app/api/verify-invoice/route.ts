import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Public, unauthenticated lookup used by the /verify page. Only returns the
// fields needed to prove an invoice is genuine - no cost/profit or full
// customer ledger data, unlike the internal /api/sales endpoint.
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateCheck = await checkRateLimit(`verify:${ip}`, 60, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many verification requests. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(rateCheck.retryAfterSeconds) } }
      );
    }

    const invoiceNo = req.nextUrl.searchParams.get("invoiceNo")?.trim();
    if (!invoiceNo) {
      return NextResponse.json({ error: "invoiceNo is required" }, { status: 400 });
    }

    const rows = await query(
      `SELECT invoice_no as "invoiceNo", customer_name as "customerName",
              customer_type as "customerType", items,
              subtotal::numeric as "subtotal",
              total_discount::numeric as "totalDiscount",
              payable_amount::numeric as "payableAmount",
              paid_amount::numeric as "paidAmount",
              due_amount::numeric as "dueAmount",
              payment_method as "paymentMethod",
              status, created_at as "createdAt"
       FROM sales
       WHERE LOWER(invoice_no) = LOWER($1)
       LIMIT 1`,
      [invoiceNo]
    );

    if (rows.length === 0) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    const sale = rows[0] as any;
    // Strip cost-basis fields if the items JSON happens to carry them.
    const sanitizedItems = Array.isArray(sale.items)
      ? sale.items.map((it: any) => ({
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice) || 0,
          total: Number(it.total) || 0,
        }))
      : [];

    let shop: any = null;
    try {
      const shopRows = await query(
        `SELECT shop_name as "shopName", bengali_shop_name as "bengaliShopName",
                phone, address
         FROM shop_settings WHERE id = 'default' LIMIT 1`
      );
      shop = shopRows[0] || null;
    } catch {
      shop = null;
    }

    return NextResponse.json({
      found: true,
      sale: { ...sale, items: sanitizedItems },
      shop,
    });
  } catch (err: any) {
    console.error("Verify Invoice Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
