-- ==========================================================
-- SR Telecom & Library - PostgreSQL Schema for Supabase or Neon
-- ==========================================================

-- 1. App Users (Admin / Proprietor & Staff / Cashier)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    username VARCHAR(80) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'staff', -- 'admin' | 'staff'
    pin VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Shop Settings
CREATE TABLE IF NOT EXISTS shop_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
    shop_name VARCHAR(150) NOT NULL,
    bengali_shop_name VARCHAR(200) NOT NULL,
    tagline TEXT,
    proprietor VARCHAR(100),
    phone VARCHAR(30) NOT NULL,
    secondary_phone VARCHAR(30),
    address TEXT,
    vat_registration_no VARCHAR(50),
    default_agent_commission NUMERIC(5, 2) DEFAULT 30.00,
    default_retail_discount NUMERIC(5, 2) DEFAULT 10.00,
    invoice_footer_message TEXT,
    invoice_paper_default VARCHAR(20) DEFAULT 'thermal_58mm',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Catalog (Books & Stationery)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bengali_name VARCHAR(255),
    category VARCHAR(30) NOT NULL, -- 'book' | 'stationery'
    barcode VARCHAR(64) UNIQUE NOT NULL,
    sku VARCHAR(64) UNIQUE NOT NULL,
    publisher VARCHAR(100),
    book_class VARCHAR(64),
    subject VARCHAR(100),
    item_type VARCHAR(100),
    custom_commission_rate NUMERIC(5, 2),
    edition_year VARCHAR(20) DEFAULT '2026',
    buy_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    stock_qty INTEGER NOT NULL DEFAULT 0,
    min_stock_alert INTEGER NOT NULL DEFAULT 5,
    unit VARCHAR(30) NOT NULL DEFAULT 'Piece',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Customers & Agents Ledger
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    address TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'single', -- 'agent' | 'single'
    default_commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    total_purchased NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Sales & Invoices
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(64) PRIMARY KEY,
    invoice_no VARCHAR(64) UNIQUE NOT NULL,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30),
    customer_type VARCHAR(20) NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    total_discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payable_amount NUMERIC(12, 2) NOT NULL,
    paid_amount NUMERIC(12, 2) NOT NULL,
    due_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(30) NOT NULL, -- 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'due'
    payment_details JSONB,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    notes TEXT,
    is_modified BOOLEAN DEFAULT FALSE,
    modified_at TIMESTAMP WITH TIME ZONE,
    modified_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Returns & Exchanges
CREATE TABLE IF NOT EXISTS returns (
    id VARCHAR(64) PRIMARY KEY,
    invoice_id VARCHAR(64),
    invoice_no VARCHAR(64),
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    return_type VARCHAR(30) NOT NULL, -- 'exchange' | 'replacement'
    returned_item JSONB NOT NULL,
    replacement_item JSONB,
    reason TEXT NOT NULL,
    price_difference NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Customer Due Payments (Money Receipts)
CREATE TABLE IF NOT EXISTS due_payments (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(150) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    trx_id VARCHAR(100),
    previous_due NUMERIC(12, 2) NOT NULL,
    remaining_due NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    invoice_no VARCHAR(64),
    invoice_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Shop Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- Initial Seed Data
-- ==========================================================

-- Default Users (Admin: PIN 1234, Cashier: PIN 5678)
INSERT INTO users (id, name, username, role, pin)
VALUES 
    ('usr-admin', 'মো: রোকনুজ্জামান (মালিক / Admin)', 'admin', 'admin', '1234'),
    ('usr-staff', 'বিক্রয়কর্মী (Cashier / Staff)', 'cashier', 'staff', '5678')
ON CONFLICT (username) DO NOTHING;

-- Default Shop Settings
INSERT INTO shop_settings (id, shop_name, bengali_shop_name, tagline, proprietor, phone, secondary_phone, address, vat_registration_no, default_agent_commission, default_retail_discount, invoice_footer_message)
VALUES (
    'default',
    'SR Telecom & Library',
    'এস. আর. টেলিকম এন্ড লাইব্রেরি',
    'সকল শ্রেণীর পাঠ্যবই, গাইড ও উন্নতমানের স্টেশনারি সামগ্রী',
    'মো: রোকনুজ্জামান',
    '01712-345678',
    '01812-987654',
    'মেইন রোড, সোনালী ব্যাংক মোড়, থানা সদর',
    'BIN-192837465-2026',
    30.00,
    10.00,
    'বই জ্ঞানের আলো ছড়ায় • আমাদের সাথে থাকার জন্য ধন্যবাদ'
)
ON CONFLICT (id) DO NOTHING;

-- Default Agents and Customers
INSERT INTO customers (id, name, phone, address, type, default_commission_rate, total_purchased, total_paid, current_due)
VALUES
    ('cust-agent-01', 'Anowar Book House (Agent)', '01711-223344', 'বাজারঘাট মোড়, ইউনিয়ন বাজার', 'agent', 32.00, 45200.00, 35000.00, 10200.00),
    ('cust-agent-02', 'Sonargaon Academy Sub-Agent', '01912-334455', 'স্কুল গেট, সোনারগাঁও হাই স্কুল', 'agent', 28.00, 28400.00, 24000.00, 4400.00),
    ('cust-single-01', 'Rafiqul Islam (Retail / Guardian)', '01819-887766', 'উত্তর পাড়া, নিজ গ্রাম', 'single', 0.00, 3600.00, 3100.00, 500.00)
ON CONFLICT (id) DO NOTHING;

-- 9. Book Publishers
CREATE TABLE IF NOT EXISTS publishers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    bengali_name VARCHAR(200),
    code VARCHAR(50) UNIQUE,
    logo_url TEXT,
    description TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    default_commission_rate NUMERIC(5, 2) DEFAULT 35.00,
    item_commissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Daily Backups Table
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

-- 11. Mobile FCM Device Push Tokens (Android & Mobile)
CREATE TABLE IF NOT EXISTS device_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    token TEXT UNIQUE NOT NULL,
    device_name VARCHAR(150),
    platform VARCHAR(30) DEFAULT 'android',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Persistent Notification Log
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(30) NOT NULL, -- 'sale' | 'low_stock' | 'due' | 'system'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

