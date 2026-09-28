# SR Telecom & Library — POS & Inventory Management System

A full-featured **Point of Sale, Inventory, and Accounting system** built for a book & stationery shop in Bangladesh. Handles billing, stock, publishers, customer/agent ledgers, daily expenses, returns, barcode/price-tag printing, and Profit & Loss reporting — with Bengali-first UI throughout.

Built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, and **PostgreSQL** (Neon or Supabase).

## Features

### Sales & Orders
- **POS Billing** — fast checkout terminal for retail & agent (wholesale) sales, with barcode scanning, per-item discounts/commission, cash/bKash/Nagad/Rocket/bank payment methods, and partial due (baki) support.
- **Invoices Log** — searchable history of all sales, reprint any invoice in thermal (58mm) or A4 mode.
- **Returns & Exchange** — process customer returns/exchanges against an original invoice, with automatic stock and ledger reversal.

### Stock & Catalog
- **Inventory & Books** — full product catalog (books + stationery) with stock levels, low-stock alerts, restock flow, CSV bulk upload, and cover images.
- **Publishers & Brands** — dedicated page per publisher (not a modal) showing profile info, contact details, logo, default/item-type commission rates, and every book linked to that publisher, with inline add/edit of books.
- **Barcode & Price Tag Generator** — generate scannable Code-128 barcodes and printable price-tag sheets (shelf tag, compact thermal sticker, or A4 grid) for any product.

### Accounts & Ledger
- **Customer & Agent Ledger** — list of all customers/agents with outstanding due; clicking one opens a dedicated **customer page** (no modals) showing full profile (editable inline), every sales invoice (hyperlinked to view/print), due-payment history, total due, total paid, and total profit generated — plus an inline "Collect Due" form that produces a printable money receipt.
- **Daily Expenses Ledger** — log shop expenses by category (rent, electricity, staff, transport, entertainment, packaging, other), with daily/monthly/all-time filters, category breakdown, and a printable expense voucher per entry.

### Reports & Analytics
- **P&L Reports** — daily / monthly / yearly Profit & Loss dashboard (sales, cost of goods, gross profit, expenses, net profit, cash-drawer reconciliation, top-selling items). Printing produces a proper accounting-style statement (Income → COGS → Gross Profit → itemized Expenses → Net Profit, with signature lines) instead of a dashboard screenshot.

### System & Settings
- **Shop Settings & Data Management** — dedicated settings page (not a modal) for shop profile, invoice footer, default commission/discount rates, daily database snapshots (Supabase/Neon Postgres), and offline JSON export/import/reset.
- **Role-based access** — `admin` and `staff` (cashier) roles; sensitive areas (Reports, Settings) are admin-only.
- **Mobile-first / PWA** — collapsible sidebar on desktop, dedicated bottom navigation on mobile, installable as a PWA.
- **Public invoice verification** (`/verify`) — unauthenticated page + API where anyone can confirm an invoice number is genuine (customer name, items, totals) without exposing cost/profit or ledger data.

## Tech Stack

| Layer      | Choice |
|------------|--------|
| Framework  | Next.js 16 (App Router, Webpack) |
| UI         | React 19, Tailwind CSS 4, lucide-react icons |
| Database   | PostgreSQL — [Neon](https://neon.tech) or [Supabase](https://supabase.com) |
| DB clients | `pg` (direct SQL) and `@supabase/supabase-js` / `@neondatabase/serverless` |
| State      | React Context (`StoreContext`, `ModalContext`) — no external state library |
| Language   | TypeScript |

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure the database
Copy `.env.example` to `.env.local` and set **one** of:
- `DATABASE_URL` — a Neon Postgres connection string, **or**
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` — Supabase project credentials.

### 3. Run the schema migration
Creates all tables and seeds demo users/data:
```bash
node scripts/migrate.js
```
Other one-off scripts under `scripts/` (`seed_demo_data.js`, `add_publishers_and_backups.js`, `add_commission_rates.js`, `fix_daily_backups.js`) add optional seed/patch data — run only if needed.

### 4. Start the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

### Default login (seeded by `migrate.js`)
| Username | PIN  | Role  |
|----------|------|-------|
| `admin`  | 1234 | Admin |
| `cashier`| 5678 | Staff |

## Project Structure

```
src/
  app/
    api/                # REST route handlers (auth, products, customers, sales,
                         #   returns, expenses, publishers, due-payments, backups, health)
    page.tsx            # Single-page app shell — tab-based routing (no client router)
  components/
    auth/                # Login screen, access-restricted guard
    pos/                 # POS billing terminal
    invoice/              # Invoice list + printable invoice modal
    inventory/            # Product catalog, bulk upload
    publishers/           # Publishers list + per-publisher detail page
    barcodes/             # Barcode/price-tag generator
    customers/            # Customer/agent ledger + per-customer detail page
    expenses/             # Daily expenses ledger
    returns/              # Returns & exchange
    reports/              # P&L reports (screen dashboard + print statement)
    settings/             # Shop settings & data management page
    dashboard/            # Home dashboard overview
  context/
    StoreContext.tsx      # All app data + actions (products, sales, customers, etc.)
    ModalContext.tsx       # Global alert/confirm dialogs
  lib/
    schema.sql            # Full Postgres schema + seed data
  types/index.ts           # Shared TypeScript types
scripts/                  # DB migration & one-off data scripts
```

### Navigation model
This app is a **single-page shell** (`src/app/page.tsx`) — sections are switched via local component state (`activeTab`), not Next.js routes. Detail views (a publisher, a customer) are rendered as full pages that replace the list in place, rather than modals — click into an item, "Back" returns to the list.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Webpack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Deployment

Deploys to [Vercel](https://vercel.com). Set the same environment variables (`DATABASE_URL` or Supabase keys) in the Vercel project settings, then push to the linked Git branch or run:
```bash
vercel
```

## AGENTS.md notice

This repository's Next.js install auto-generates an `AGENTS.md` file (via `next dev`) advising AI coding agents to check `node_modules/next/dist/docs/` for this Next.js version's specific conventions before making changes — keep that file committed as-is.
