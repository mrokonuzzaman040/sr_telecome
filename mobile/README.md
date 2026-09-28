# SR Telecom & Library - Flutter Mobile Application

A cross-platform POS, Stock & Ledger mobile application for **SR Telecom & Library (এস.আর টেলিকম & লাইব্রেরী)** built with Flutter.

---

## 📱 Features

- **High-Speed Mobile POS**:
  - Live **Camera Barcode Scanner** (`mobile_scanner`) with flash and camera flip.
  - Quick-add cart with category filters (Books, Stationery, Telecom).
  - **Agent vs Retail Pricing**: Automatic agent commission calculation (30%, 35%, 40% for guides/grammars).
  - Split and flexible payments: **Cash, bKash, Nagad, Rocket, or Due (বাকি)**.
  - Automated invoice generation matching desktop rules.

- **Role-Based Security & PIN Access**:
  - **Proprietor / Admin (মালিক)** PIN: `1234` (Full access to COGS, cost prices, gross & net profit, settings).
  - **Cashier / Staff (বিক্রয়কর্মী)** PIN: `5678` (Billing, POS, due collection; restricted from profit/loss margins).
  - **Admin PIN Unlock Modal**: Allows the shop owner to inspect profit reports on a staff's device without logging out.

- **Customer Due Ledger (বাকির খাতা)**:
  - Outstanding due balances overview.
  - **One-tap Phone Calling** and **WhatsApp Reminder message** directly to the customer.
  - Partial or full due collection with instant ledger update.

- **Inventory & Stock Management**:
  - Search by Bengali name, English name, publisher, class, or barcode.
  - Low stock warning badges.
  - Purchase cost price (COGS) visibility strictly restricted to Admin.

- **Financial Analytics & Reports**:
  - Today's sales and cash collection summary.
  - Gross Profit & Net Profit calculation (`Gross Profit - Shop Expenses`).

---

## 🚀 Running the App

### 1. Start the Next.js Backend
Ensure your Next.js server is running on your network:
```bash
npm run dev
```

### 2. Configure the API Server Address
When launching the mobile app:
- On the PIN login screen or in **Settings**, tap the **Settings icon** ⚙️.
- For **Android Emulator**: use `http://10.0.2.2:3000`
- For **Physical Android Phone / iPhone** connected to the same Wi-Fi: use your Mac's LAN IP, e.g.:
  `http://192.168.0.105:3000`
- For **Production**: use your deployed Vercel domain, e.g.:
  `https://your-domain.vercel.app`

### 3. Run Flutter
```bash
cd mobile
flutter run
```
