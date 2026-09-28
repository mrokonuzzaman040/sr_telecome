import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * Combined sync endpoint for mobile app
 * Returns all data in a single request to reduce connection pool usage
 * This is the professional solution for mobile apps with limited database connections
 */
export async function GET(req: NextRequest) {
  try {
    // Moderate rate limiting for combined sync endpoint with Redis
    const ip = getClientIp(req);
    const rateLimitResult = await checkRateLimit(`sync:${ip}`, 15, 60); // 15 requests per minute with Redis
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateLimitResult.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': rateLimitResult.retryAfterSeconds.toString() } }
      );
    }

    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    // Fetch all data in parallel but within a single request
    const [products, customers, sales, expenses] = await Promise.all([
      query(
        `SELECT id, name, bengali_name as "bengaliName", category, barcode, sku, publisher, 
                book_class as "bookClass", subject, item_type as "itemType",
                custom_commission_rate::numeric as "customCommissionRate",
                edition_year as "editionYear", 
                image_url as "imageUrl",
                buy_price::numeric as "buyPrice", mrp::numeric as "mrp", 
                stock_qty as "stockQty", min_stock_alert as "minStockAlert", 
                unit, created_at as "createdAt", updated_at as "updatedAt"
         FROM products 
         ORDER BY created_at DESC
         LIMIT 100`
      ),
      query(
        `SELECT id, name, phone, address, type, 
                default_commission_rate::numeric as "defaultCommissionRate", 
                total_purchased::numeric as "totalPurchased", 
                total_paid::numeric as "totalPaid", 
                current_due::numeric as "currentDue", 
                created_at as "createdAt"
         FROM customers 
         ORDER BY created_at DESC
         LIMIT 100`
      ),
      query(
        `SELECT id, invoice_no as "invoiceNo", customer_id as "customerId", 
                customer_name as "customerName", customer_phone as "customerPhone", 
                customer_type as "customerType", items, 
                subtotal::numeric as "subtotal", 
                total_discount::numeric as "totalDiscount", 
                payable_amount::numeric as "payableAmount", 
                paid_amount::numeric as "paidAmount", 
                due_amount::numeric as "dueAmount", 
                payment_method as "paymentMethod", 
                payment_details as "paymentDetails", 
                total_cost::numeric as "totalCost", 
                gross_profit::numeric as "grossProfit", 
                status, notes, 
                COALESCE(is_modified, false) as "isModified",
                modified_at as "modifiedAt",
                modified_reason as "modifiedReason",
                created_at as "createdAt"
         FROM sales 
         ORDER BY created_at DESC
         LIMIT 50`
      ),
      query(
        `SELECT id, title, category, amount::numeric as "amount", 
                TO_CHAR(date, 'YYYY-MM-DD') as "date", notes, 
                created_at as "createdAt"
         FROM expenses 
         ORDER BY date DESC, created_at DESC
         LIMIT 50`
      ),
    ]);

    // Redact cost and profit for staff users
    const sanitizedSales = sales.map((sale: any) => {
      if (auth.user.role !== "admin") {
        return {
          ...sale,
          totalCost: 0,
          grossProfit: 0,
        };
      }
      return sale;
    });

    return NextResponse.json({
      success: true,
      data: {
        products,
        customers,
        sales: sanitizedSales,
        expenses,
        syncedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Sync GET Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
