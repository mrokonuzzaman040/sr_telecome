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
  console.log("Connected to Supabase to fix daily_backups table...");

  const sql = `
    -- Drop NOT NULL constraints on legacy summary columns
    ALTER TABLE daily_backups ALTER COLUMN total_products DROP NOT NULL;
    ALTER TABLE daily_backups ALTER COLUMN total_customers DROP NOT NULL;
    ALTER TABLE daily_backups ALTER COLUMN total_sales DROP NOT NULL;
    ALTER TABLE daily_backups ALTER COLUMN total_sales_amount DROP NOT NULL;
    ALTER TABLE daily_backups ALTER COLUMN total_due_amount DROP NOT NULL;
    ALTER TABLE daily_backups ALTER COLUMN backup_json DROP NOT NULL;

    -- Drop restrictive UNIQUE (backup_date) so multiple backups (or auto + manual) don't clash on the same day
    ALTER TABLE daily_backups DROP CONSTRAINT IF EXISTS daily_backups_backup_date_key;

    -- Ensure modern columns exist
    ALTER TABLE daily_backups ADD COLUMN IF NOT EXISTS backup_type VARCHAR(30) DEFAULT 'auto_daily';
    ALTER TABLE daily_backups ADD COLUMN IF NOT EXISTS summary JSONB;
    ALTER TABLE daily_backups ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE daily_backups ADD COLUMN IF NOT EXISTS data_snapshot JSONB;
  `;

  await client.query(sql);
  console.log("daily_backups table schema migrated successfully!");

  // Verify updated column nullability and constraints
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'daily_backups' 
    ORDER BY ordinal_position;
  `);
  console.log("Updated daily_backups columns:", res.rows);

  const constr = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'daily_backups'::regclass;
  `);
  console.log("Updated daily_backups constraints:", constr.rows);

  await client.end();
}

run().catch(console.error);
