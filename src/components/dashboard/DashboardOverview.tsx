"use client";

import React, { useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { formatBDT, formatDateTime, formatDateOnly, getTodayDateString } from "@/utils/formatters";
import { DashboardTab } from "@/components/Sidebar";
import { Sale } from "@/types";
import {
  TrendingUp,
  BookOpen,
  Users,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  Coins,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Clock,
  Calendar,
  RotateCcw,
  Receipt,
  Store,
  Printer,
  PlusCircle,
  CreditCard,
  Building2,
  FileSpreadsheet,
  Layers,
  Barcode,
} from "lucide-react";

interface DashboardOverviewProps {
  onNavigate: (tab: DashboardTab) => void;
  onSelectInvoice: (sale: Sale, mode: "thermal" | "a4") => void;
}

export function DashboardOverview({
  onNavigate,
  onSelectInvoice,
}: DashboardOverviewProps) {
  const {
    sales,
    products,
    customers,
    expenses,
    duePayments,
    currentUser,
    settings,
    selectedDate,
    resetSelectedDate,
  } = useStore();

  const isAdmin = currentUser?.role === "admin";
  const activeDateStr = selectedDate || getTodayDateString();
  const isToday = activeDateStr === getTodayDateString();

  // Selected Date Sales
  const todaySales = useMemo(() => {
    return sales.filter((s) => s.createdAt.startsWith(activeDateStr));
  }, [sales, activeDateStr]);

  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.payableAmount, 0);
  const todayGrossProfit = todaySales.reduce((acc, s) => acc + s.grossProfit, 0);

  // Selected Date Expenses
  const todayExpenses = useMemo(() => {
    return expenses.filter((e) => e.date === activeDateStr);
  }, [expenses, activeDateStr]);

  const todayExpensesTotal = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
  const todayNetProfit = todayGrossProfit - todayExpensesTotal;

  // Dues & Ledger
  const totalOutstandingDue = customers.reduce((acc, c) => acc + c.currentDue, 0);
  const totalDueCollectedToday = duePayments
    .filter((d) => d.createdAt.startsWith(activeDateStr))
    .reduce((acc, d) => acc + d.amount, 0);

  // Physical Cash in Drawer
  const todayCashSales = todaySales.reduce(
    (acc, s) => acc + (s.paymentMethod === "cash" ? s.paidAmount : 0),
    0
  );
  const todayPhysicalCashInDrawer = todayCashSales + totalDueCollectedToday;

  // Inventory Metrics
  const totalStockUnits = products.reduce((acc, p) => acc + p.stockQty, 0);
  const totalStockValuationMRP = products.reduce(
    (acc, p) => acc + p.stockQty * p.mrp,
    0
  );
  const lowStockItems = products.filter((p) => p.stockQty <= p.minStockAlert);

  // Average order value
  const averageOrderValue =
    todaySales.length > 0 ? Math.round(todaySalesTotal / todaySales.length) : 0;

  // Payment Breakdown for Today
  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let mfs = 0;
    let due = 0;

    todaySales.forEach((s) => {
      due += s.dueAmount;
      if (s.paymentMethod === "cash") {
        cash += s.paidAmount;
      } else if (["bkash", "nagad", "rocket"].includes(s.paymentMethod)) {
        mfs += s.paidAmount;
      } else if (s.paymentMethod === "due") {
        // already added to due
      } else {
        cash += s.paidAmount;
      }
    });

    const grandTotal = cash + mfs + due || 1;
    return {
      cash,
      mfs,
      due,
      cashPercent: Math.round((cash / grandTotal) * 100),
      mfsPercent: Math.round((mfs / grandTotal) * 100),
      duePercent: Math.round((due / grandTotal) * 100),
    };
  }, [todaySales]);

  // Recent 8 Sales
  const recentSales = sales.slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 space-y-4 sm:space-y-6 select-none">
      {/* Compact Shop Header & Quick Action Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Row 1: Branding & Session Info */}
        <div className="flex items-center gap-3 p-3.5 sm:p-4">
          <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
            <Store className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h1 className="text-base font-bold tracking-tight text-slate-900 leading-none">
                {settings.shopName}
              </h1>
              <span className="text-xs font-medium text-slate-500">
                {settings.bengaliShopName}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                  isAdmin
                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                    : "bg-slate-50 text-slate-500 border border-slate-200"
                }`}
              >
                {isAdmin ? "মালিক" : "ক্যাশিয়ার"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
              <span>
                <strong className="font-semibold text-slate-700">{currentUser?.name}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Terminal Ready
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Action Toolbar */}
        <div className="flex items-center gap-1.5 px-3.5 sm:px-4 pb-3.5 sm:pb-4 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => onNavigate("pos")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition active:scale-[0.98] shrink-0"
            title="Open POS Billing Terminal"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>New Sale</span>
          </button>

          <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />

          <button
            type="button"
            onClick={() => onNavigate("customers")}
            className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium transition shrink-0"
            title="Customer & Agent Ledger"
          >
            <Coins className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>বাকি আদায়</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("inventory")}
            className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium transition shrink-0"
            title="View Stock Catalog & Add Products"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>স্টক ও বই</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("publishers")}
            className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium transition shrink-0"
            title="Publishers and Brand Catalog"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>প্রকাশনী</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("expenses")}
            className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium transition shrink-0"
            title="Daily Expenses Ledger"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>দৈনন্দিন খরচ</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("barcodes")}
            className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium transition shrink-0"
            title="Barcode & Price Tag Generator"
          >
            <Barcode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>বারকোড প্রিন্ট</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate("reports")}
              className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg text-xs font-medium transition shrink-0"
              title="View Profit & Loss Reports"
            >
              <TrendingUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>লাভ-ক্ষতি</span>
            </button>
          )}
        </div>
      </div>

      {/* Historical / Filtered Date Notice Banner */}
      {!isToday && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-amber-900 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Showing dashboard metrics and sales for: <strong>{formatDateOnly(activeDateStr)}</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={resetSelectedDate}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-md font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Today</span>
          </button>
        </div>
      )}

      {/* Primary KPI Metrics Deck (Compact 2x2 on Mobile, 4 Cols on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Gross Sales */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                {isToday ? "Today's Gross Sales" : `Gross Sales (${formatDateOnly(activeDateStr)})`}
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <Receipt className="w-4 h-4 text-slate-700" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
              {formatBDT(todaySalesTotal)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{todaySales.length} Invoices</span>
            <span className="font-mono text-slate-700 font-medium">
              Avg: {formatBDT(averageOrderValue)}
            </span>
          </div>
        </div>

        {/* Card 2: Cash in Drawer */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                {isToday ? "Cash in Drawer (নগদ)" : `Cash Collected (${formatDateOnly(activeDateStr)})`}
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <Coins className="w-4 h-4 text-slate-700" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
              {formatBDT(todayPhysicalCashInDrawer)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Cash Sales: {formatBDT(todayCashSales)}</span>
            <span className="font-mono text-slate-700 font-medium">
              +{formatBDT(totalDueCollectedToday)} Due
            </span>
          </div>
        </div>

        {/* Card 3: Total Outstanding Due */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                Total Outstanding Due
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <CreditCard className="w-4 h-4 text-slate-700" />
              </div>
            </div>
            <p className="text-2xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
              {formatBDT(totalOutstandingDue)}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Across all party ledgers</span>
            <span className="font-mono text-slate-700 font-medium">
              {customers.filter((c) => c.currentDue > 0).length} debtors
            </span>
          </div>
        </div>

        {/* Card 4: Net Profit (Admin) or Total Inventory (Staff) */}
        {isAdmin ? (
          <div className="bg-slate-900 text-white p-4.5 rounded-xl border border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  {isToday ? "Today's Net Profit (নিট লাভ)" : `Net Profit (${formatDateOnly(activeDateStr)})`}
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <p
                className={`text-2xl font-bold font-mono mt-2 tracking-tight ${
                  todayNetProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatBDT(todayNetProfit)}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Gross: {formatBDT(todayGrossProfit)}</span>
              <span>Exp: {formatBDT(todayExpensesTotal)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  Total Stock Units (মজুদ বই)
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <BookOpen className="w-4 h-4 text-slate-700" />
                </div>
              </div>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-2 tracking-tight">
                {totalStockUnits} Units
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>MRP Valuation</span>
              <span className="font-mono text-slate-700 font-medium">
                {formatBDT(totalStockValuationMRP)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Operational Summary Ribbon (4 Furnished Micro-Indicators) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
          <Layers className="w-4 h-4 text-slate-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
              Catalog Items
            </span>
            <span className="font-bold font-mono text-slate-800">
              {products.length} Titles
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
          <Coins className="w-4 h-4 text-slate-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
              Due Collected Today
            </span>
            <span className="font-bold font-mono text-slate-800">
              {formatBDT(totalDueCollectedToday)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("expenses")}
          className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition cursor-pointer"
          title="Go to Daily Expenses"
        >
          <Receipt className="w-4 h-4 text-rose-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
              Today&apos;s Expenses
            </span>
            <span className="font-bold font-mono text-slate-800">
              {formatBDT(todayExpensesTotal)}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("inventory")}
          className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition cursor-pointer"
          title="Go to Low Stock Inventory"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
              Low Stock Watch
            </span>
            <span className="font-bold font-mono text-amber-800">
              {lowStockItems.length} Products
            </span>
          </div>
        </button>
      </div>

      {/* Main Two-Column Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Recent Sales Invoices Table (7 Columns) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-slate-700 shrink-0" />
              <h2 className="font-semibold text-sm text-slate-900">
                Recent Sales Transactions (সর্বশেষ চালান)
              </h2>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("invoices")}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 transition"
            >
              <span>View All Invoices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            {recentSales.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-medium text-slate-600">No sales transactions recorded yet.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click &quot;New Sale&quot; to begin your first billing session.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3.5">Invoice</th>
                    <th className="py-2.5 px-3.5">Customer</th>
                    <th className="py-2.5 px-3.5">Type</th>
                    <th className="py-2.5 px-3.5">Items</th>
                    <th className="py-2.5 px-3.5 text-right">Amount</th>
                    <th className="py-2.5 px-3.5 text-center">Status</th>
                    <th className="py-2.5 px-3.5 text-center">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {sale.invoiceNo}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <p className="font-medium text-slate-800 truncate max-w-[130px]">
                          {sale.customerName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {formatDateTime(sale.createdAt).split(" ")[1] || ""}
                        </p>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase ${
                            sale.customerType === "agent"
                              ? "bg-slate-100 text-slate-800 border border-slate-300"
                              : "bg-slate-50 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {sale.customerType === "agent" ? "Agent" : "Retail"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-500 font-mono whitespace-nowrap">
                        {sale.items.length} {sale.items.length === 1 ? "item" : "items"}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatBDT(sale.payableAmount)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        {sale.dueAmount > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono font-semibold">
                            Due: {formatBDT(sale.dueAmount)}
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                            Paid
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectInvoice(sale, "thermal")}
                            className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                            title="Print 58/80mm Thermal Receipt"
                            aria-label="Print Thermal Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectInvoice(sale, "a4")}
                            className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                            title="View A4 Invoice"
                            aria-label="View A4 Invoice"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Low Stock Alerts & Payment Channel Split (5 Columns) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Card A: Low Stock & Reorder Alert Desk */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <h3 className="font-semibold text-sm text-slate-900">
                  Low Stock Alerts (কম স্টক সতর্কতা)
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onNavigate("inventory")}
                className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1 transition"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {lowStockItems.length === 0 ? (
                <div className="py-7 text-center text-slate-500 text-xs">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
                  <p className="font-semibold text-slate-800">All books &amp; stationery are in stock!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    No items currently require immediate reordering.
                  </p>
                </div>
              ) : (
                lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {item.publisher || item.category} • Class: {item.bookClass || "General"}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 font-mono font-bold text-xs block">
                        {item.stockQty} {item.unit} left
                      </span>
                      <span className="text-[9px] text-slate-500 block mt-0.5">
                        Min limit: {item.minStockAlert}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card B: Today's Collection & Payment Method Split */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                  ৳
                </span>
                <h3 className="font-semibold text-sm text-slate-900">
                  Payment Channels ({isToday ? "আজকের লেনদেন" : formatDateOnly(activeDateStr)})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Total: {formatBDT(todaySalesTotal)}
              </span>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              {/* Cash Channel */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-800" />
                    Cash (নগদ বিক্রয়)
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatBDT(paymentBreakdown.cash)}{" "}
                    <span className="text-slate-400 font-normal">
                      ({paymentBreakdown.cashPercent}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-slate-800 h-1.5 rounded-full"
                    style={{ width: `${paymentBreakdown.cashPercent}%` }}
                  />
                </div>
              </div>

              {/* Digital MFS Channel */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Digital MFS (bKash / Nagad)
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatBDT(paymentBreakdown.mfs)}{" "}
                    <span className="text-slate-400 font-normal">
                      ({paymentBreakdown.mfsPercent}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full"
                    style={{ width: `${paymentBreakdown.mfsPercent}%` }}
                  />
                </div>
              </div>

              {/* Credit / Due Added */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    Customer Credit (বাকি বিক্রি)
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatBDT(paymentBreakdown.due)}{" "}
                    <span className="text-slate-400 font-normal">
                      ({paymentBreakdown.duePercent}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-rose-600 h-1.5 rounded-full"
                    style={{ width: `${paymentBreakdown.duePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
