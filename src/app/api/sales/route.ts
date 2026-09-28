import { NextRequest, NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { SaleItem } from "@/types";
import { verifyAuth } from "@/lib/auth";
import { sendSalePushNotification } from "@/lib/fcm";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

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
              status, notes, created_at as "createdAt"
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
