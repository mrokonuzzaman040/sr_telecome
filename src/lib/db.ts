import { Pool, types } from "pg";
import { createClient } from "@supabase/supabase-js";

// pg returns NUMERIC/DECIMAL columns as strings by default (to avoid float
// precision loss). This app treats all money/quantity fields as JS numbers
// throughout (types, arithmetic, formatBDT), so parse them as floats here -
// once, at the driver boundary - instead of everywhere they're consumed.
types.setTypeParser(1700, (val: string) => parseFloat(val)); // NUMERIC

// Supabase REST client
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dydgyenjnximmyfjrbcv.supabase.co";
export const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// PostgreSQL connection string
const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

let cleanConnectionString = connectionString
  ? connectionString.replace(/[?&]sslmode=[^&]+/, "")
  : undefined;

// Global Pool instance to prevent connection exhaustion in serverless Next.js
declare global {
  var _pgPool: Pool | undefined;
}

let pool: Pool;

if (cleanConnectionString) {
  if (!global._pgPool) {
    global._pgPool = new Pool({
      connectionString: cleanConnectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  pool = global._pgPool;
} else {
  // Fallback dummy pool if no connection string
  pool = new Pool();
}

export { pool };

/**
 * Direct Parameterized Query Helper
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  try {
    const res = await pool.query(text, params);
    return res.rows as T[];
  } catch (error) {
    console.error("[PostgreSQL Query Error]:", error);
    throw error;
  }
}
