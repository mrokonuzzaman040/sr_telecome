import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query(
      `SELECT id, name, bengali_name as "bengaliName", code, phone, address, 
              logo_url as "logoUrl", notes, 
              default_commission_rate as "defaultCommissionRate",
              item_commissions as "itemCommissions",
              created_at as "createdAt"
       FROM publishers 
       ORDER BY name ASC`
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("Publishers GET Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Publisher name is required" }, { status: 400 });
    }

    const id = body.id || `pub-${Date.now()}`;
    const code = body.code || body.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const now = new Date().toISOString();
    const defaultCommissionRate = body.defaultCommissionRate !== undefined ? Number(body.defaultCommissionRate) : 35;
    const itemCommissions = body.itemCommissions ? JSON.stringify(body.itemCommissions) : null;

    const rows = await query(
      `INSERT INTO publishers (id, name, bengali_name, code, phone, address, logo_url, notes, default_commission_rate, item_commissions, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (name) DO UPDATE 
       SET bengali_name = COALESCE(EXCLUDED.bengali_name, publishers.bengali_name),
           phone = COALESCE(EXCLUDED.phone, publishers.phone),
           address = COALESCE(EXCLUDED.address, publishers.address),
           logo_url = COALESCE(EXCLUDED.logo_url, publishers.logo_url),
           notes = COALESCE(EXCLUDED.notes, publishers.notes),
           default_commission_rate = COALESCE(EXCLUDED.default_commission_rate, publishers.default_commission_rate),
           item_commissions = COALESCE(EXCLUDED.item_commissions, publishers.item_commissions)
       RETURNING id, name, bengali_name as "bengaliName", code, phone, address, 
                 logo_url as "logoUrl", notes, 
                 default_commission_rate as "defaultCommissionRate",
                 item_commissions as "itemCommissions",
                 created_at as "createdAt"`,
      [
        id,
        body.name.trim(),
        body.bengaliName?.trim() || null,
        code,
        body.phone?.trim() || null,
        body.address?.trim() || null,
        body.logoUrl?.trim() || null,
        body.notes?.trim() || null,
        defaultCommissionRate,
        itemCommissions,
        now,
      ]
    );

    return NextResponse.json({ success: true, publisher: rows[0] });
  } catch (err: any) {
    console.error("Publishers POST Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Publisher id required" }, { status: 400 });

    await query(`DELETE FROM publishers WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Publishers DELETE Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
