import { NextRequest, NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    const rows = await query(
      `SELECT id, customer_id as "customerId", customer_name as "customerName", 
              amount::numeric as "amount", payment_method as "paymentMethod", 
              trx_id as "trxId", previous_due::numeric as "previousDue", 
              remaining_due::numeric as "remainingDue", notes, 
              created_at as "createdAt"
       FROM due_payments 
       ORDER BY created_at DESC`
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("Due Payments GET Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    const body = await req.json();
    const id = body.id || `pay-${Date.now()}`;
    const now = new Date().toISOString();
    const amount = Number(body.amount) || 0;

    await client.query("BEGIN");

    // Fetch customer current due
    const custRes = await client.query(`SELECT current_due FROM customers WHERE id = $1`, [body.customerId]);
    if (custRes.rows.length === 0) {
      throw new Error("Customer not found");
    }

    const previousDue = Number(custRes.rows[0].current_due) || 0;
    const remainingDue = Math.max(0, previousDue - amount);

    // 1. Insert into due_payments
    const insertRes = await client.query(
      `INSERT INTO due_payments (
        id, customer_id, customer_name, amount, payment_method, trx_id, 
        previous_due, remaining_due, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        body.customerId,
        body.customerName,
        amount,
        body.paymentMethod,
        body.trxId || null,
        previousDue,
        remainingDue,
        body.notes || null,
        now,
      ]
    );

    // 2. Update customer record
    await client.query(
      `UPDATE customers 
       SET total_paid = total_paid + $1,
           current_due = $2
       WHERE id = $3`,
      [amount, remainingDue, body.customerId]
    );

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      duePayment: {
        id,
        customerId: body.customerId,
        customerName: body.customerName,
        amount,
        paymentMethod: body.paymentMethod,
        trxId: body.trxId,
        previousDue,
        remainingDue,
        notes: body.notes,
        createdAt: now,
      },
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Due Payments POST Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  } finally {
    client.release();
  }
}
