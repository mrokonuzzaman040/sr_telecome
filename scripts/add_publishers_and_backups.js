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
  console.log("Connected to Supabase to add publishers and daily_backups tables...");

  const sql = `
    -- Add image_url to products if not exists
    ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

    -- Publishers Table
    CREATE TABLE IF NOT EXISTS publishers (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      bengali_name VARCHAR(200),
      code VARCHAR(50) UNIQUE,
      logo_url TEXT,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Daily Backups Table
    CREATE TABLE IF NOT EXISTS daily_backups (
      id VARCHAR(64) PRIMARY KEY,
      backup_date DATE NOT NULL,
      backup_type VARCHAR(30) DEFAULT 'auto_daily',
      total_products INTEGER,
      total_customers INTEGER,
      total_sales INTEGER,
      total_sales_amount NUMERIC(12, 2),
      total_due_amount NUMERIC(12, 2),
      backup_json JSONB,
      summary JSONB,
      notes TEXT,
      data_snapshot JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Seed authentic Bangladeshi Publishers with brand logos
    INSERT INTO publishers (id, name, bengali_name, code, logo_url, description)
    VALUES
      ('pub-panjeree', 'Panjeree Publications', 'পাঞ্জেরী পাবলিকেশন্স', 'PANJEREE', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=100&h=100&fit=crop&crop=faces&q=80', 'Bangladesh leading guide and creative textbook publisher'),
      ('pub-lecture', 'Lecture Publications', 'লেকচার পাবলিকেশন্স', 'LECTURE', 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=100&h=100&fit=crop&crop=faces&q=80', 'Renowned educational guidebooks for primary, secondary and higher secondary'),
      ('pub-anupam', 'Anupam Prakashani', 'অনুপম প্রকাশনী', 'ANUPAM', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=100&h=100&fit=crop&crop=faces&q=80', 'English and science model tests & test papers'),
      ('pub-jupiter', 'Jupiter Publications', 'জুপিটার পাবলিকেশন্স', 'JUPITER', 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=100&h=100&fit=crop&crop=faces&q=80', 'Commerce, Arts and Science guides for HSC'),
      ('pub-nctb', 'NCTB (Board)', 'জাতীয় শিক্ষাক্রম ও পাঠ্যপুস্তক বোর্ড', 'NCTB', 'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?w=100&h=100&fit=crop&crop=faces&q=80', 'Official government board curriculum textbooks'),
      ('pub-nobodut', 'Nobodut Prokashoni', 'নবদূত প্রকাশনী', 'NOBODUT', 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=100&h=100&fit=crop&crop=faces&q=80', 'Secondary and higher secondary exam preparation books'),
      ('pub-royal', 'Royal Scientific Publications', 'রয়্যাল সায়েন্টিফিক', 'ROYAL', 'https://images.unsplash.com/photo-1507842229451-7f01be837453?w=100&h=100&fit=crop&crop=faces&q=80', 'Physics, Chemistry and Higher Math practical laboratory books'),
      ('pub-popy', 'Popy Library', 'পপি লাইব্রেরি', 'POPY', 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=100&h=100&fit=crop&crop=faces&q=80', 'Dictionaries, general knowledge and children literature')
    ON CONFLICT (id) DO NOTHING;
  `;

  await client.query(sql);
  console.log("Publishers table and Daily Backups table created and seeded successfully on Supabase!");
  await client.end();
}

run().catch(console.error);
