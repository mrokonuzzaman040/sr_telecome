const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Read connection string from .env.local
const envContent = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const match = envContent.match(/POSTGRES_URL_NON_POOLING="([^"]+)"/) || 
              envContent.match(/DATABASE_URL="([^"]+)"/);

const connectionString = match ? match[1] : null;

if (!connectionString) {
  console.error("Missing database connection string in .env.local");
  process.exit(1);
}

let cleanConnectionString = connectionString.replace(/[?&]sslmode=[^&]+/, "");

console.log("Connecting to Supabase PostgreSQL database...");

const client = new Client({
  connectionString: cleanConnectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    await client.connect();
    console.log("Connected successfully to Supabase PostgreSQL!");

    const schemaPath = path.join(__dirname, "../src/lib/schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");

    console.log("Executing schema.sql on Supabase...");
    await client.query(sql);
    console.log("Database tables created & seed records inserted successfully!");

    // Verify tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log("Active Tables in Supabase:", res.rows.map(r => r.table_name));

    await client.end();
    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

runMigration();
