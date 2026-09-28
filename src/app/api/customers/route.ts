import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query(
      `SELECT id, name, phone, address, type, 
              default_commission_rate::numeric as "defaultCommissionRate", 
              total_purchased::numeric as "totalPurchased", 
              total_paid::numeric as "totalPaid", 
              current_due::numeric as "currentDue", 
              created_at as "createdAt"
       FROM customers 
       ORDER BY created_at DESC`
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("Customers GET Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = body.id || `cust-${Date.now()}`;
    const now = new Date().toISOString();

    const rows = await query(
      `INSERT INTO customers (
        id, name, phone, address, type, default_commission_rate, 
        total_purchased, total_paid, current_due, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, name, phone, address, type, 
                default_commission_rate::numeric as "defaultCommissionRate", 
                total_purchased::numeric as "totalPurchased", 
                total_paid::numeric as "totalPaid", 
                current_due::numeric as "currentDue", 
                created_at as "createdAt"`,
      [
        id,
        body.name,
        body.phone,
        body.address || null,
        body.type || "single",
        Number(body.defaultCommissionRate) || 0,
        Number(body.totalPurchased) || 0,
        Number(body.totalPaid) || 0,
        Number(body.currentDue) || 0,
        now,
      ]
    );

    return NextResponse.json({ success: true, customer: rows[0] });
  } catch (err: any) {
    console.error("Customers POST Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
