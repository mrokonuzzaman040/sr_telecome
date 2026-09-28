import { NextRequest, NextResponse } from "next/server";
import { query, pool, ensureInvoiceEnhancements } from "@/lib/db";
import { SaleItem } from "@/types";
import { verifyAuth } from "@/lib/auth";
import { sendSalePushNotification } from "@/lib/fcm";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  try {
    // Strict rate limiting for mobile app data fetching (reduced for Supabase limits)
    const ip = getClientIp(req);
    const rateLimitResult = checkRateLimit(`sales:${ip}`, 30, 60); // 30 requests per minute
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateLimitResult.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': rateLimitResult.retryAfterSeconds.toString() } }
      );
    }

    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    await ensureInvoiceEnhancements();

    const rows = await query(
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
       ORDER BY created_at DESC`
    );

    // If role is staff, redact cost and profit margins
    const sanitized = rows.map((sale: any) => {
      if (auth.user.role !== "admin") {
        return {
          ...sale,
          totalCost: 0,
          grossProfit: 0,
        };
      }
      return sale;
    });

    return NextResponse.json(sanitized);
  } catch (err: any) {
    console.error("Sales GET Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    const body = await req.json();
    const id = body.id || `sale-${Date.now()}`;
    const invoiceNo = body.invoiceNo;
    const now = new Date().toISOString();

    await client.query("BEGIN");

    // 1. Insert into sales
    const insertRes = await client.query(
      `INSERT INTO sales (
        id, invoice_no, customer_id, customer_name, customer_phone, customer_type, 
        items, subtotal, total_discount, payable_amount, paid_amount, due_amount, 
        payment_method, payment_details, total_cost, gross_profit, status, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        id,
        invoiceNo,
        body.customerId || null,
        body.customerName,
        body.customerPhone || null,
        body.customerType,
        JSON.stringify(body.items),
        Number(body.subtotal) || 0,
        Number(body.totalDiscount) || 0,
        Number(body.payableAmount) || 0,
        Number(body.paidAmount) || 0,
        Number(body.dueAmount) || 0,
        body.paymentMethod,
        JSON.stringify(body.paymentDetails || {}),
        Number(body.totalCost) || 0,
        Number(body.grossProfit) || 0,
        body.status || "completed",
        body.notes || null,
        now,
      ]
    );

    // 2. Decrement stock for each item in products
    if (Array.isArray(body.items)) {
      for (const item of body.items as SaleItem[]) {
        await client.query(
          `UPDATE products 
           SET stock_qty = GREATEST(0, stock_qty - $1), updated_at = NOW() 
           WHERE id = $2`,
          [item.quantity, item.productId]
        );
      }
    }

    // 3. Update customer ledger if linked
    if (body.customerId) {
      await client.query(
        `UPDATE customers 
         SET total_purchased = total_purchased + $1,
             total_paid = total_paid + $2,
             current_due = current_due + $3
         WHERE id = $4`,
        [
          Number(body.payableAmount) || 0,
          Number(body.paidAmount) || 0,
          Number(body.dueAmount) || 0,
          body.customerId,
        ]
      );
    }

    // 4. Log to persistent notifications table
    try {
      const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const notifTitle = `নতুন বিক্রয় সম্পন্ন (#${invoiceNo})`;
      const notifMessage = `${body.customerName ? `${body.customerName} - ` : ""}মোট ৳${(Number(body.payableAmount) || 0).toLocaleString()} পরিশোধ: ৳${Number(body.paidAmount) || 0}${Number(body.dueAmount) > 0 ? ` | বাকি: ৳${Number(body.dueAmount)}` : ""}`;
      
      await client.query(
        `INSERT INTO notifications (id, type, title, message, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          notifId,
          "sale",
          notifTitle,
          notifMessage,
          JSON.stringify({
            saleId: id,
            invoiceNo,
            amount: Number(body.payableAmount) || 0,
            customerName: body.customerName,
          }),
        ]
      );
    } catch (notifErr) {
      console.warn("Could not insert sale notification log:", notifErr);
    }

    await client.query("COMMIT");

    // 5. Asynchronously broadcast push notification to all registered Android mobile devices
    sendSalePushNotification({
      invoiceNo,
      payableAmount: Number(body.payableAmount) || 0,
      paidAmount: Number(body.paidAmount) || 0,
      dueAmount: Number(body.dueAmount) || 0,
      customerName: body.customerName,
      itemCount: Array.isArray(body.items) ? body.items.length : 1,
    }).catch((pushErr) => {
      console.warn("FCM push broadcast non-blocking error:", pushErr);
    });

    return NextResponse.json({ success: true, sale: insertRes.rows[0] });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Sales POST Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    await ensureInvoiceEnhancements();

    const body = await req.json();
    const { id, invoiceNo, ...updates } = body;

    if (!id && !invoiceNo) {
      return NextResponse.json({ error: "Missing sale id or invoiceNo" }, { status: 400 });
    }

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.paidAmount !== undefined) {
      setClauses.push(`paid_amount = $${idx++}`);
      values.push(Number(updates.paidAmount) || 0);
    }
    if (updates.dueAmount !== undefined) {
      setClauses.push(`due_amount = $${idx++}`);
      values.push(Number(updates.dueAmount) || 0);
    }
    if (updates.notes !== undefined) {
      setClauses.push(`notes = $${idx++}`);
      values.push(updates.notes);
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.isModified !== undefined) {
      setClauses.push(`is_modified = $${idx++}`);
      values.push(Boolean(updates.isModified));
    }
    if (updates.modifiedReason !== undefined) {
      setClauses.push(`modified_reason = $${idx++}`);
      values.push(updates.modifiedReason);
    }
    // Always update modified_at when patched
    setClauses.push(`modified_at = NOW()`);

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    let whereClause = "";
    if (id) {
      whereClause = `WHERE id = $${idx}`;
      values.push(id);
    } else {
      whereClause = `WHERE invoice_no = $${idx}`;
      values.push(invoiceNo);
    }

    const queryStr = `UPDATE sales SET ${setClauses.join(", ")} ${whereClause} RETURNING *`;
    const res = await query(queryStr, values);

    if (res.length === 0) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, sale: res[0] });
  } catch (err: any) {
    console.error("Sales PATCH Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

