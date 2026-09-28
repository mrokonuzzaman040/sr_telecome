import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  try {
    // Very strict rate limiting for Supabase pooler limits
    const ip = getClientIp(req);
    const rateLimitResult = await checkRateLimit(`expenses:${ip}`, 20, 60); // 20 requests per minute with Redis
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateLimitResult.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': rateLimitResult.retryAfterSeconds.toString() } }
      );
    }

    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    const rows = await query(
      `SELECT id, title, category, amount::numeric as "amount", 
              TO_CHAR(date, 'YYYY-MM-DD') as "date", notes, 
              created_at as "createdAt"
       FROM expenses 
       ORDER BY date DESC, created_at DESC`
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("Expenses GET Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    const body = await req.json();
    const id = body.id || `exp-${Date.now()}`;
    const now = new Date().toISOString();

    const rows = await query(
      `INSERT INTO expenses (id, title, category, amount, date, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, category, amount::numeric as "amount", 
                 TO_CHAR(date, 'YYYY-MM-DD') as "date", notes, created_at as "createdAt"`,
      [
        id,
        body.title,
        body.category,
        Number(body.amount) || 0,
        body.date,
        body.notes || null,
        now,
      ]
    );

    return NextResponse.json({ success: true, expense: rows[0] });
  } catch (err: any) {
    console.error("Expenses POST Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req, { requiredRole: "admin" });
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Expense id required" }, { status: 400 });

    await query(`DELETE FROM expenses WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Expenses DELETE Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
