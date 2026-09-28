const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const envContent = fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8");
const match = envContent.match(/POSTGRES_URL_NON_POOLING="([^"]+)"/) || 
              envContent.match(/DATABASE_URL="([^"]+)"/);

const connectionString = match ? match[1] : null;

if (!connectionString) {
  console.log("No connection string found in .env.local - skipping direct migration.");
  process.exit(0);
}

const cleanConnectionString = connectionString.replace(/[?&]sslmode=[^&]+/, "");

const client = new Client({
  connectionString: cleanConnectionString,
  ssl: { rejectUnauthorized: true }
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL database.");

    await client.query(`
      CREATE TABLE IF NOT EXISTS device_tokens (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          token TEXT UNIQUE NOT NULL,
          device_name VARCHAR(150),
          platform VARCHAR(30) DEFAULT 'android',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(64) PRIMARY KEY,
          type VARCHAR(30) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          metadata JSONB,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("device_tokens and notifications tables created successfully!");
    await client.end();
  } catch (err) {
    console.warn("Migration warning:", err.message);
    process.exit(0);
  }
}

run();
