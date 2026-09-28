import { NextRequest, NextResponse } from "next/server";
import { query, pool } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query(
      `SELECT id, invoice_id as "invoiceId", invoice_no as "invoiceNo", 
              customer_id as "customerId", customer_name as "customerName", 
              return_type as "returnType", returned_item as "returnedItem", 
              replacement_item as "replacementItem", reason, 
              price_difference::numeric as "priceDifference", 
              created_at as "createdAt"
       FROM returns 
       ORDER BY created_at DESC`
    );

    const normalized = rows.map((r: any) => {
      let returnedItems = [];
      let returnedItem = r.returnedItem;
      if (Array.isArray(r.returnedItem)) {
        returnedItems = r.returnedItem;
        returnedItem = r.returnedItem[0] || null;
      } else if (r.returnedItem?.items && Array.isArray(r.returnedItem.items)) {
        returnedItems = r.returnedItem.items;
        returnedItem = r.returnedItem.primary || r.returnedItem.items[0];
      } else if (r.returnedItem) {
        returnedItems = [r.returnedItem];
      }

      let replacementItems = [];
      let replacementItem = r.replacementItem;
      if (Array.isArray(r.replacementItem)) {
        replacementItems = r.replacementItem;
        replacementItem = r.replacementItem[0] || null;
      } else if (r.replacementItem?.items && Array.isArray(r.replacementItem.items)) {
        replacementItems = r.replacementItem.items;
        replacementItem = r.replacementItem.primary || r.replacementItem.items[0];
      } else if (r.replacementItem) {
        replacementItems = [r.replacementItem];
      }

      const totalRefundCredit = returnedItems.reduce(
        (sum: number, it: any) => sum + (Number(it.totalRefundValue) || (Number(it.unitPrice) * Number(it.quantity)) || 0),
        0
      );
      const totalReplacementValue = replacementItems.reduce(
        (sum: number, it: any) => sum + (Number(it.totalValue) || (Number(it.unitPrice) * Number(it.quantity)) || 0),
        0
      );

      return {
        ...r,
        returnedItems,
        returnedItem,
        replacementItems,
        replacementItem,
        totalRefundCredit,
        totalReplacementValue,
      };
    });

    return NextResponse.json(normalized);
  } catch (err: any) {
    console.error("Returns GET Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const id = body.id || `ret-${Date.now()}`;
    const now = new Date().toISOString();

    const returnedItems = Array.isArray(body.returnedItems) && body.returnedItems.length > 0
      ? body.returnedItems
      : (body.returnedItem ? [body.returnedItem] : []);

    const replacementItems = Array.isArray(body.replacementItems) && body.replacementItems.length > 0
      ? body.replacementItems
      : (body.replacementItem ? [body.replacementItem] : []);

    const primaryReturnedItem = returnedItems[0] || body.returnedItem || null;
    const primaryReplacementItem = replacementItems[0] || body.replacementItem || null;

    await client.query("BEGIN");

    // 1. Insert into returns - store full items list in JSONB
    const insertRes = await client.query(
      `INSERT INTO returns (
        id, invoice_id, invoice_no, customer_id, customer_name, 
        return_type, returned_item, replacement_item, reason, price_difference, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id,
        body.invoiceId || null,
        body.invoiceNo || null,
        body.customerId && body.customerId !== 'walkin' ? body.customerId : null,
        body.customerName || "Walk-in Retail Customer",
        body.returnType || "exchange",
        JSON.stringify(returnedItems.length > 0 ? returnedItems : primaryReturnedItem),
        replacementItems.length > 0 ? JSON.stringify(replacementItems) : (primaryReplacementItem ? JSON.stringify(primaryReplacementItem) : null),
        body.reason || "General Return",
        Number(body.priceDifference) || 0,
        now,
      ]
    );

    // 2. Restock all returned items
    for (const item of returnedItems) {
      if (item?.productId && Number(item?.quantity) > 0) {
        await client.query(
          `UPDATE products SET stock_qty = stock_qty + $1, updated_at = NOW() WHERE id = $2`,
          [Number(item.quantity), item.productId]
        );
      }
    }

    // 3. Decrement stock for all replacement items
    for (const item of replacementItems) {
      if (item?.productId && Number(item?.quantity) > 0) {
        await client.query(
          `UPDATE products SET stock_qty = GREATEST(0, stock_qty - $1), updated_at = NOW() WHERE id = $2`,
          [Number(item.quantity), item.productId]
        );
      }
    }

    // 4. Update customer due if customer exists and priceDifference is non-zero
    if (body.customerId && body.customerId !== 'walkin' && Number(body.priceDifference) !== 0) {
      await client.query(
        `UPDATE customers SET current_due = GREATEST(0, current_due + $1) WHERE id = $2`,
        [Number(body.priceDifference), body.customerId]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, returnRecord: insertRes.rows[0] });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Returns POST Error:", err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  } finally {
    client.release();
  }
}
