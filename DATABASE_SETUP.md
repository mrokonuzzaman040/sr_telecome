# SR Telecom & Library - Real Database Setup Guide
## (Neon Postgres & Supabase Integration)

This application is ready to connect directly to **Neon Serverless Postgres** or **Supabase** (both offering 100% free lifetime tiers).

---

### Option 1: Neon Serverless Postgres (Recommended - 100% Free)

1. **Sign Up**: Go to [https://neon.tech](https://neon.tech) and sign up for a free account.
2. **Create Project**: Name your project (e.g. `sr-telecom-library`).
3. **Run SQL Schema**:
   - Go to the **SQL Editor** tab in your Neon console.
   - Open and copy the SQL code from [`src/lib/schema.sql`](file:///Users/rokon-dev/Desktop/sr-telecom_and_library/src/lib/schema.sql).
   - Paste it into the Neon SQL Editor and click **Run**. This will create all 8 tables and insert the initial users, settings, and Bangladeshi catalog.
4. **Copy Connection String**:
   - Copy your connection string from the Neon dashboard (e.g., `postgresql://neondb_owner:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require`).
   - Create a file named `.env.local` in this project directory:
     ```env
     DATABASE_URL="postgresql://neondb_owner:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
     ```

---

### Option 2: Supabase (Alternative - 100% Free)

1. **Sign Up**: Go to [https://supabase.com](https://supabase.com) and create a free project.
2. **Run SQL Schema**:
   - Go to the **SQL Editor** tab in your Supabase dashboard.
   - Paste the contents of [`src/lib/schema.sql`](file:///Users/rokon-dev/Desktop/sr-telecom_and_library/src/lib/schema.sql) and click **Run**.
3. **Copy API Keys**:
   - Go to **Project Settings** -> **API**.
   - Copy Project URL and Anon/Service Role Key into `.env.local`:
     ```env
     NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
     NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
     SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
     ```

---

### Role-Based Access Control (Security System)

| Role | Username | Initial Default PIN | Permissions |
| :--- | :--- | :--- | :--- |
| **Proprietor / Admin (মালিক)** | `admin` | **`1234`** *(Must change in Settings)* | **Full Access**: All financial reports, Net Profit/Loss, Cost prices (COGS), Stock additions, Shop settings, Full JSON backup/restore. |
| **Cashier / Staff (বিক্রয়কর্মী)** | `cashier` | **`5678`** *(Must change in Settings)* | **Sales & POS**: POS billing, Thermal/A4 print, Stock inventory check, Customer due collection, Returns & Exchange.<br>*(Restricted from viewing profit/loss margins and system configuration)* |

> **Production Security Hardening (Going Public)**:
> 1. **Immediate PIN Change**: Prior to sharing the public URL, log in as `admin` and navigate to **Settings** -> **Security & PIN Management** to change both the Admin PIN and the Staff PIN. All PINs are hashed using salted **PBKDF2**.
> 2. **Session Security**: Authenticated sessions are sealed with cryptographic **HMAC-SHA256** session tokens stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies (Web) and Bearer tokens (Mobile).
> 3. **Server-Side RBAC Enforcement**:
>    - `/api/backups`: Restricted exclusively to `admin`.
>    - Product, publisher, and expense deletion: Restricted exclusively to `admin`.
>    - `/api/sales`: Automatically redacts purchase cost and gross profit for staff users.
> 4. **Rate Limiting & Brute-Force Defense**: `/api/auth/login` throttles failed attempts to 5 per 5 minutes per IP.
> 5. **Security Headers**: HSTS, CSP, X-Frame-Options (DENY), and X-Content-Type-Options (nosniff) are enforced via `next.config.ts`.
