import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyAuth } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  try {
    // Rate limiting for mobile app data fetching
    const ip = getClientIp(req);
    const rateLimitResult = checkRateLimit(`products:${ip}`, 60, 60); // 60 requests per minute
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests", retryAfter: rateLimitResult.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': rateLimitResult.retryAfterSeconds.toString() } }
      );
    }

    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    const rows = await query(
      `SELECT id, name, bengali_name as "bengaliName", category, barcode, sku, publisher, 
              book_class as "bookClass", subject, item_type as "itemType",
              custom_commission_rate::numeric as "customCommissionRate",
              edition_year as "editionYear", 
              image_url as "imageUrl",
              buy_price::numeric as "buyPrice", mrp::numeric as "mrp", 
              stock_qty as "stockQty", min_stock_alert as "minStockAlert", 
              unit, created_at as "createdAt", updated_at as "updatedAt"
       FROM products 
       ORDER BY created_at DESC`
    );
    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("Products GET Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;
    const body = await req.json();

    // Check if bulk insert
    if (body.bulk && Array.isArray(body.bulk)) {
      const inserted: any[] = [];
      for (const item of body.bulk) {
        const id = item.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const now = new Date().toISOString();
        const rows = await query(
          `INSERT INTO products (
            id, name, bengali_name, category, barcode, sku, publisher, book_class, 
            subject, item_type, custom_commission_rate, edition_year, image_url, buy_price, mrp, stock_qty, min_stock_alert, unit, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (barcode) DO UPDATE 
          SET stock_qty = products.stock_qty + EXCLUDED.stock_qty,
              buy_price = EXCLUDED.buy_price,
              mrp = EXCLUDED.mrp,
              item_type = COALESCE(EXCLUDED.item_type, products.item_type),
              custom_commission_rate = COALESCE(EXCLUDED.custom_commission_rate, products.custom_commission_rate),
              updated_at = NOW()
          RETURNING id, name, bengali_name as "bengaliName", category, barcode, sku, 
                    publisher, book_class as "bookClass", subject, item_type as "itemType",
                    custom_commission_rate::numeric as "customCommissionRate",
                    edition_year as "editionYear", 
                    image_url as "imageUrl",
                    buy_price::numeric as "buyPrice", mrp::numeric as "mrp", 
                    stock_qty as "stockQty", min_stock_alert as "minStockAlert", unit, 
                    created_at as "createdAt", updated_at as "updatedAt"`,
          [
            id,
            item.name,
            item.bengaliName || null,
            item.category || "book",
            item.barcode || `BC-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
            item.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
            item.publisher || null,
            item.bookClass || null,
            item.subject || null,
            item.itemType || null,
            item.customCommissionRate !== undefined ? Number(item.customCommissionRate) : null,
            item.editionYear || "2026",
            item.imageUrl || null,
            Number(item.buyPrice) || 0,
            Number(item.mrp) || 0,
            Number(item.stockQty) || 0,
            Number(item.minStockAlert) || 5,
            item.unit || "Piece",
            now,
            now,
          ]
        );
        if (rows[0]) inserted.push(rows[0]);
      }
      return NextResponse.json({ success: true, count: inserted.length, products: inserted });
    }

    const id = body.id || `prod-${Date.now()}`;
    const now = new Date().toISOString();

    const rows = await query(
      `INSERT INTO products (
        id, name, bengali_name, category, barcode, sku, publisher, book_class, 
        subject, item_type, custom_commission_rate, edition_year, image_url, buy_price, mrp, stock_qty, min_stock_alert, unit, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id, name, bengali_name as "bengaliName", category, barcode, sku, 
                publisher, book_class as "bookClass", subject, item_type as "itemType",
                custom_commission_rate::numeric as "customCommissionRate",
                edition_year as "editionYear", 
                image_url as "imageUrl",
                buy_price::numeric as "buyPrice", mrp::numeric as "mrp", 
                stock_qty as "stockQty", min_stock_alert as "minStockAlert", unit, 
                created_at as "createdAt", updated_at as "updatedAt"`,
      [
        id,
        body.name,
        body.bengaliName || null,
        body.category,
        body.barcode,
        body.sku,
        body.publisher || null,
        body.bookClass || null,
        body.subject || null,
        body.itemType || null,
        body.customCommissionRate !== undefined ? Number(body.customCommissionRate) : null,
        body.editionYear || "2026",
        body.imageUrl || null,
        Number(body.buyPrice) || 0,
        Number(body.mrp) || 0,
        Number(body.stockQty) || 0,
        Number(body.minStockAlert) || 5,
        body.unit || "Piece",
        now,
        now,
      ]
    );

    return NextResponse.json({ success: true, product: rows[0] });
  } catch (err: any) {
    console.error("Products POST Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.success) return auth.response;

    const body = await req.json();
    const { id, stockQty, buyPrice, mrp, name, bengaliName, publisher, bookClass, subject, itemType, customCommissionRate, minStockAlert, imageUrl } = body;
    if (!id) return NextResponse.json({ error: "Product id required" }, { status: 400 });

    const rows = await query(
      `UPDATE products 
       SET stock_qty = COALESCE($2, stock_qty),
           buy_price = COALESCE($3, buy_price),
           mrp = COALESCE($4, mrp),
           name = COALESCE($5, name),
           bengali_name = COALESCE($6, bengali_name),
           publisher = COALESCE($7, publisher),
           book_class = COALESCE($8, book_class),
           subject = COALESCE($9, subject),
           item_type = COALESCE($10, item_type),
           custom_commission_rate = COALESCE($11, custom_commission_rate),
           min_stock_alert = COALESCE($12, min_stock_alert),
           image_url = COALESCE($13, image_url),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, bengali_name as "bengaliName", category, barcode, sku, 
                 publisher, book_class as "bookClass", subject, item_type as "itemType",
                 custom_commission_rate::numeric as "customCommissionRate",
                 edition_year as "editionYear", 
                 image_url as "imageUrl",
                 buy_price::numeric as "buyPrice", mrp::numeric as "mrp", 
                 stock_qty as "stockQty", min_stock_alert as "minStockAlert", unit, 
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [
        id,
        stockQty !== undefined ? Number(stockQty) : null,
        buyPrice !== undefined ? Number(buyPrice) : null,
        mrp !== undefined ? Number(mrp) : null,
        name || null,
        bengaliName || null,
        publisher || null,
        bookClass || null,
        subject || null,
        itemType || null,
        customCommissionRate !== undefined ? Number(customCommissionRate) : null,
        minStockAlert !== undefined ? Number(minStockAlert) : null,
        imageUrl || null,
      ]
    );

    return NextResponse.json({ success: true, product: rows[0] });
  } catch (err: any) {
    console.error("Products PUT Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req, { requiredRole: "admin" });
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Product id required" }, { status: 400 });

    await query(`DELETE FROM products WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Products DELETE Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
