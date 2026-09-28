import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query(
      `SELECT id, backup_date as "backupDate", backup_type as "backupType", 
              summary, notes, created_at as "createdAt"
       FROM daily_backups 
       ORDER BY backup_date DESC, created_at DESC
       LIMIT 30`
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("Backups GET Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const backupType = body.backupType || "manual";
    const notes = body.notes || (backupType === "auto_daily" ? "Automated Daily Database Snapshot" : "Manual On-Demand Backup Snapshot");
    const today = new Date().toISOString().split("T")[0];

    // Check if auto_daily already created today unless forced
    if (backupType === "auto_daily" && !body.force) {
      const existing = await query(
        `SELECT id FROM daily_backups WHERE backup_date = $1 AND backup_type = 'auto_daily'`,
        [today]
      );
      if (existing.length > 0) {
        return NextResponse.json({ success: true, message: "Today's daily backup already exists", id: existing[0].id });
      }
    }

    // Gather live data snapshots from all tables
    const [products, customers, sales, returns, duePayments, expenses, publishers, settings] = await Promise.all([
      query(`SELECT * FROM products`),
      query(`SELECT * FROM customers`),
      query(`SELECT * FROM sales ORDER BY created_at DESC LIMIT 500`),
      query(`SELECT * FROM returns ORDER BY created_at DESC LIMIT 200`),
      query(`SELECT * FROM due_payments ORDER BY created_at DESC LIMIT 200`),
      query(`SELECT * FROM expenses ORDER BY created_at DESC LIMIT 200`),
      query(`SELECT * FROM publishers`),
      query(`SELECT * FROM shop_settings LIMIT 1`),
    ]);

    const totalProducts = products.length;
    const totalCustomers = customers.length;
    const totalSales = sales.length;
    const totalSalesAmount = sales.reduce((acc: number, s: any) => acc + Number(s.payable_amount || 0), 0);
    const totalStockValue = products.reduce((acc: number, p: any) => acc + (Number(p.buy_price || 0) * Number(p.stock_qty || 0)), 0);
    const totalDue = customers.reduce((acc: number, c: any) => acc + Number(c.current_due || 0), 0);

    const summary = {
      totalProducts,
      totalCustomers,
      totalSales,
      totalSalesAmount,
      totalReturns: returns.length,
      totalStockValue,
      totalDue,
      savedAt: new Date().toISOString(),
    };

    const snapshot = {
      products,
      customers,
      sales,
      returns,
      duePayments,
      expenses,
      publishers,
      settings: settings[0] || null,
    };

    const id = `bkp-${Date.now()}`;
    const rows = await query(
      `INSERT INTO daily_backups (
         id, backup_date, backup_type, data_snapshot, summary, notes,
         total_products, total_customers, total_sales, total_sales_amount, total_due_amount, backup_json, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING id, backup_date as "backupDate", backup_type as "backupType", summary, notes, created_at as "createdAt"`,
      [
        id,
        today,
        backupType,
        JSON.stringify(snapshot),
        JSON.stringify(summary),
        notes,
        totalProducts,
        totalCustomers,
        totalSales,
        totalSalesAmount,
        totalDue,
        JSON.stringify(snapshot),
      ]
    );

    return NextResponse.json({ success: true, backup: rows[0] });
  } catch (err: any) {
    console.error("Backups POST Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
