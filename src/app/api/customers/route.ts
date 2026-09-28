import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  try {
    // Strict rate limiting for mobile app data fetching (reduced for Supabase limits)
    const ip = getClientIp(req);
    const rateLimitResult = checkRateLimit(`customers:${ip}`, 30, 60); // 30 requests per minute
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateLimitResult.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': rateLimitResult.retryAfterSeconds.toString() } }
      );
    }

    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

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
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

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

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;
    const body = await req.json();
    const { id, name, phone, address, type, defaultCommissionRate } = body;
    if (!id) return NextResponse.json({ error: "Customer id required" }, { status: 400 });

    const rows = await query(
      `UPDATE customers
       SET name = COALESCE($2, name),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           type = COALESCE($5, type),
           default_commission_rate = COALESCE($6, default_commission_rate)
       WHERE id = $1
       RETURNING id, name, phone, address, type,
                 default_commission_rate::numeric as "defaultCommissionRate",
                 total_purchased::numeric as "totalPurchased",
                 total_paid::numeric as "totalPaid",
                 current_due::numeric as "currentDue",
                 created_at as "createdAt"`,
      [
        id,
        name || null,
        phone || null,
        address || null,
        type || null,
        defaultCommissionRate !== undefined ? Number(defaultCommissionRate) : null,
      ]
    );

    if (!rows[0]) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ success: true, customer: rows[0] });
  } catch (err: any) {
    console.error("Customers PUT Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
