const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const envContent = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const match = envContent.match(/POSTGRES_URL_NON_POOLING="([^"]+)"/) ||
              envContent.match(/DATABASE_URL="([^"]+)"/);

const connectionString = match[1].replace(/[?&]sslmode=[^&]+/, "");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log("Connected to Supabase to add commission rate columns...");

  const sql = `
    -- Publishers: default and item-specific commission rates
    ALTER TABLE publishers ADD COLUMN IF NOT EXISTS default_commission_rate NUMERIC(5, 2) DEFAULT 35.00;
    ALTER TABLE publishers ADD COLUMN IF NOT EXISTS item_commissions JSONB;

    -- Products: item type (for per-item publisher commission lookup) and commission override
    ALTER TABLE products ADD COLUMN IF NOT EXISTS item_type VARCHAR(100);
    ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_commission_rate NUMERIC(5, 2);

    -- Customers: default commission rate
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS default_commission_rate NUMERIC(5, 2) DEFAULT 0.00;
  `;

  await client.query(sql);
  console.log("Commission rate columns added successfully!");
  await client.end();
}

run().catch(console.error);
