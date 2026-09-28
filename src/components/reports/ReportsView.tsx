"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { formatBDT, formatDateOnly, formatDateTime, getTodayDateString } from "@/utils/formatters";
import { Sale } from "@/types";
import {
  TrendingUp,
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  PieChart,
  Printer,
  FileText,
  ExternalLink,
} from "lucide-react";

interface ReportsViewProps {
  onSelectInvoice?: (sale: Sale, mode: "thermal" | "a4") => void;
}

export function ReportsView({ onSelectInvoice }: ReportsViewProps) {
  const {
    sales,
    expenses,
    duePayments,
    addExpense,
    deleteExpense,
    settings,
    selectedDate: storeSelectedDate,
    setSelectedDate: setStoreSelectedDate,
    showAlert,
  } = useStore();

  const [timeframe, setTimeframe] = useState<"daily" | "monthly" | "yearly" | "custom">("daily");
  const [selectedDate, setSelectedDate] = useState<string>(storeSelectedDate || getTodayDateString());
  const [selectedMonth, setSelectedMonth] = useState<string>((storeSelectedDate || getTodayDateString()).substring(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [customStart, setCustomStart] = useState<string>(storeSelectedDate || getTodayDateString());
  const [customEnd, setCustomEnd] = useState<string>(storeSelectedDate || getTodayDateString());

  // Add Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "other" as any,
    amount: 0,
    date: getTodayDateString(),
    notes: "",
  });

  // Filter Sales based on active timeframe
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const saleDate = sale.createdAt.substring(0, 10);
      if (timeframe === "daily") {
        return saleDate === selectedDate;
      }
      if (timeframe === "monthly") {
        return saleDate.startsWith(selectedMonth);
      }
      if (timeframe === "yearly") {
        return saleDate.startsWith(selectedYear);
      }
      if (timeframe === "custom") {
        return saleDate >= customStart && saleDate <= customEnd;
      }
      return true;
    });
  }, [sales, timeframe, selectedDate, selectedMonth, selectedYear, customStart, customEnd]);

  // Filter Expenses based on active timeframe
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (timeframe === "daily") {
        return exp.date === selectedDate;
      }
      if (timeframe === "monthly") {
        return exp.date.startsWith(selectedMonth);
      }
      if (timeframe === "yearly") {
        return exp.date.startsWith(selectedYear);
      }
      if (timeframe === "custom") {
        return exp.date >= customStart && exp.date <= customEnd;
      }
      return true;
    });
  }, [expenses, timeframe, selectedDate, selectedMonth, selectedYear, customStart, customEnd]);

  // Financial Calculations
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + s.payableAmount, 0);
  const totalCostOfGoods = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
  const grossProfit = Math.max(0, totalSalesRevenue - totalCostOfGoods);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const profitMarginPercent =
    totalSalesRevenue > 0 ? Math.round((netProfit / totalSalesRevenue) * 100) : 0;

  // Cash Inflow / Drawer Breakdown
  const cashSalesPaid = filteredSales.reduce((acc, s) => {
    return acc + (s.paymentMethod === "cash" ? s.paidAmount : 0);
  }, 0);

  const mfsSalesPaid = filteredSales.reduce((acc, s) => {
    return acc + (["bkash", "nagad", "rocket"].includes(s.paymentMethod) ? s.paidAmount : 0);
  }, 0);

  const newDuesGiven = filteredSales.reduce((acc, s) => acc + s.dueAmount, 0);

  const filteredDueRecoveries = duePayments.filter((dp) => {
    const dpDate = dp.createdAt.substring(0, 10);
    if (timeframe === "daily") return dpDate === selectedDate;
    if (timeframe === "monthly") return dpDate.startsWith(selectedMonth);
    if (timeframe === "yearly") return dpDate.startsWith(selectedYear);
    if (timeframe === "custom") return dpDate >= customStart && dpDate <= customEnd;
    return true;
  });

  const dueRecoveredAmount = filteredDueRecoveries.reduce((acc, dp) => acc + dp.amount, 0);
  const totalCashCollected = cashSalesPaid + dueRecoveredAmount;

  // Invoices issued in the filtered period, newest first
  const invoicesIssued = useMemo(() => {
    return [...filteredSales].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [filteredSales]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || expenseForm.amount <= 0) {
      showAlert("Please provide valid expense title and amount.", {
        title: "Invalid Expense Entry",
        type: "warning",
      });
      return;
    }
    addExpense(expenseForm);
    setIsExpenseModalOpen(false);
    setExpenseForm({
      title: "",
      category: "other",
      amount: 0,
      date: getTodayDateString(),
      notes: "",
    });
  };

  const periodLabel =
    timeframe === "daily"
      ? formatDateOnly(selectedDate)
      : timeframe === "monthly"
      ? new Date(`${selectedMonth}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : timeframe === "yearly"
      ? `Year ${selectedYear}`
      : `${formatDateOnly(customStart)} — ${formatDateOnly(customEnd)}`;

  // Expense breakdown by category, for the formal statement's itemized expense lines
  const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
    rent: "Shop Rent (দোকান ভাড়া)",
    electricity: "Electricity / Utility (বিদ্যুৎ বিল)",
    staff: "Staff Salary / Wage (কর্মচারী বেতন)",
    transport: "Transport & Carrying (পরিবহন)",
    entertainment: "Tea & Entertainment (আপ্যায়ন)",
    stationery_use: "Packaging / Stationery (প্যাকিং)",
    other: "Other Expenses (বিবিধ)",
  };

  const expenseLineItems = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([key, amount]) => ({ label: EXPENSE_CATEGORY_LABELS[key] || key, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4 print:px-0 print:py-0 print:space-y-2 print:max-w-none">
      {/* Print-Only Letterhead (visible only when printing) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-2 mb-2">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-950">{settings.shopName}</h1>
            <p className="text-sm font-semibold text-slate-800">{settings.bengaliShopName}</p>
            <p className="text-xs text-slate-600 mt-1">{settings.address}</p>
            <p className="text-xs text-slate-700 font-mono mt-0.5">
              মোবাইল: {settings.phone} {settings.secondaryPhone && `• ${settings.secondaryPhone}`}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-semibold tracking-wider uppercase">
              Profit &amp; Loss Statement (লাভ-ক্ষতির প্রতিবেদন)
            </span>
            <div className="text-xs font-mono text-slate-600 mt-2 space-y-0.5">
              <p>
                Period: <span className="font-bold text-slate-900">{periodLabel}</span>
              </p>
              <p>
                Total Invoices: <span className="font-bold text-slate-900">{invoicesIssued.length}</span>
              </p>
              <p>Generated: {formatDateOnly(getTodayDateString())} {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print-Only Formal P&L Statement */}
      <div className="hidden print:block text-slate-900">
        <h2 className="text-center font-bold text-sm uppercase tracking-widest border-b border-slate-900 pb-1.5 mb-3">
          Profit &amp; Loss Statement — {periodLabel}
        </h2>

        <table className="w-full text-xs font-mono border-collapse mb-4">
          <tbody>
            <tr>
              <td colSpan={2} className="py-1 font-bold uppercase tracking-wider text-[11px] border-b border-slate-400">
                Income
              </td>
            </tr>
            <tr>
              <td className="py-1 pl-3">Total Sales Revenue (মোট বিক্রয়)</td>
              <td className="py-1 text-right">{formatBDT(totalSalesRevenue)}</td>
            </tr>
            <tr>
              <td className="py-1 pl-3">Less: Cost of Goods Sold (ক্রয় মূল্য)</td>
              <td className="py-1 text-right">({formatBDT(totalCostOfGoods)})</td>
            </tr>
            <tr className="border-t border-slate-400">
              <td className="py-1.5 font-bold">Gross Profit (মোট লাভ)</td>
              <td className="py-1.5 text-right font-bold">{formatBDT(grossProfit)}</td>
            </tr>

            <tr>
              <td colSpan={2} className="pt-4 pb-1 font-bold uppercase tracking-wider text-[11px] border-b border-slate-400">
                Operating Expenses (দোকান খরচ)
              </td>
            </tr>
            {expenseLineItems.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-1 pl-3 text-slate-500">No expenses recorded this period.</td>
              </tr>
            ) : (
              expenseLineItems.map((line) => (
                <tr key={line.label}>
                  <td className="py-1 pl-3">{line.label}</td>
                  <td className="py-1 text-right">{formatBDT(line.amount)}</td>
                </tr>
              ))
            )}
            <tr className="border-t border-slate-400">
              <td className="py-1.5 font-bold">Total Operating Expenses</td>
              <td className="py-1.5 text-right font-bold">({formatBDT(totalExpenses)})</td>
            </tr>

            <tr className="border-t-2 border-double border-slate-900">
              <td className="py-2 font-bold text-sm">
                Net {netProfit >= 0 ? "Profit" : "Loss"} (প্রকৃত নিট লাভ)
              </td>
              <td className="py-2 text-right font-bold text-sm">{formatBDT(netProfit)}</td>
            </tr>
            <tr>
              <td className="py-0.5 text-slate-500">Net Profit Margin</td>
              <td className="py-0.5 text-right text-slate-500">{profitMarginPercent}%</td>
            </tr>
          </tbody>
        </table>

        <h3 className="font-bold text-[11px] uppercase tracking-widest border-b border-slate-900 pb-1 mb-1.5">
          Cash Drawer &amp; Collections Reconciliation
        </h3>
        <table className="w-full text-xs font-mono border-collapse mb-4">
          <tbody>
            <tr>
              <td className="py-1 pl-3">Cash Sales (নগদ বিক্রয়)</td>
              <td className="py-1 text-right">{formatBDT(cashSalesPaid)}</td>
            </tr>
            <tr>
              <td className="py-1 pl-3">MFS Collections — bKash / Nagad / Rocket</td>
              <td className="py-1 text-right">{formatBDT(mfsSalesPaid)}</td>
            </tr>
            <tr>
              <td className="py-1 pl-3">Previous Due Recovered (বাকি আদায়)</td>
              <td className="py-1 text-right">{formatBDT(dueRecoveredAmount)}</td>
            </tr>
            <tr>
              <td className="py-1 pl-3">New Dues Given (নতুন বাকি)</td>
              <td className="py-1 text-right">({formatBDT(newDuesGiven)})</td>
            </tr>
            <tr className="border-t-2 border-double border-slate-900">
              <td className="py-1.5 font-bold">Total Physical Cash in Drawer</td>
              <td className="py-1.5 text-right font-bold">{formatBDT(totalCashCollected)}</td>
            </tr>
          </tbody>
        </table>

        <h3 className="font-bold text-[11px] uppercase tracking-widest border-b border-slate-900 pb-1 mb-1.5 flex items-center justify-between">
          <span>Invoices Issued This Period</span>
          <span className="normal-case tracking-normal font-mono text-[10px] text-slate-600">
            {invoicesIssued.length} invoice{invoicesIssued.length === 1 ? "" : "s"}
          </span>
        </h3>
        {invoicesIssued.length === 0 ? (
          <p className="text-xs text-slate-500 pl-3 mb-4">No invoices generated this period.</p>
        ) : (
          <table className="w-full text-xs font-mono border-collapse mb-4">
            <thead>
              <tr className="border-b border-slate-400">
                <th className="py-1 text-left font-semibold w-8">#</th>
                <th className="py-1 text-left font-semibold">Invoice No</th>
                <th className="py-1 text-left font-semibold">Date &amp; Time</th>
                <th className="py-1 text-left font-semibold">Customer</th>
                <th className="py-1 text-left font-semibold">Type</th>
                <th className="py-1 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoicesIssued.map((sale, idx) => (
                <tr key={sale.id} className={idx % 2 === 1 ? "bg-slate-50" : undefined}>
                  <td className="py-1 pl-3 text-slate-500">{idx + 1}</td>
                  <td className="py-1 font-bold text-slate-900">{sale.invoiceNo}</td>
                  <td className="py-1 text-slate-600">{formatDateTime(sale.createdAt)}</td>
                  <td className="py-1 text-slate-800">{sale.customerName}</td>
                  <td className="py-1 uppercase text-[10px] text-slate-500">{sale.customerType}</td>
                  <td className="py-1 text-right font-semibold text-slate-900">{formatBDT(sale.payableAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-double border-slate-900">
                <td colSpan={5} className="py-1.5 font-bold">Total ({invoicesIssued.length} invoices)</td>
                <td className="py-1.5 text-right font-bold">{formatBDT(totalSalesRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {/* Signatures */}
        <div className="pt-6 mt-2 border-t border-slate-300">
          <div className="flex justify-between items-end text-xs text-slate-600">
            <div className="text-center">
              <div className="w-40 border-t border-slate-400 mb-1"></div>
              <p>Prepared By (প্রস্তুতকারী)</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-t border-slate-400 mb-1"></div>
              <p>Approved By (অনুমোদনকারী)</p>
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-3">
            {settings.shopName} — System Generated Statement — Printed on {formatDateOnly(getTodayDateString())} {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Timeframe & Controls Header */}
      <div className="no-print bg-white p-4 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Timeframe Tabs */}
        <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-100 text-xs">
          <button
            onClick={() => setTimeframe("daily")}
            className={`px-3.5 py-1.5 rounded font-medium transition ${
              timeframe === "daily" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600"
            }`}
          >
            দৈনিক হিসাব (Daily)
          </button>
          <button
            onClick={() => setTimeframe("monthly")}
            className={`px-3.5 py-1.5 rounded font-medium transition ${
              timeframe === "monthly" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600"
            }`}
          >
            মাসিক হিসাব (Monthly)
          </button>
          <button
            onClick={() => setTimeframe("yearly")}
            className={`px-3.5 py-1.5 rounded font-medium transition ${
              timeframe === "yearly" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600"
            }`}
          >
            বাৎসরিক হিসাব (Yearly)
          </button>
          <button
            onClick={() => setTimeframe("custom")}
            className={`px-3.5 py-1.5 rounded font-medium transition ${
              timeframe === "custom" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600"
            }`}
          >
            কাস্টম (Custom)
          </button>
        </div>

        {/* Date Selector based on active timeframe */}
        <div className="flex items-center gap-2">
          {timeframe === "daily" && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 font-mono focus:outline-none"
              />
            </div>
          )}

          {timeframe === "monthly" && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 font-mono focus:outline-none"
              />
            </div>
          )}

          {timeframe === "yearly" && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 font-mono focus:outline-none"
              >
                <option value="2025">Year 2025</option>
                <option value="2026">Year 2026</option>
                <option value="2027">Year 2027</option>
              </select>
            </div>
          )}

          {timeframe === "custom" && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 font-mono focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 font-mono focus:outline-none"
              />
            </div>
          )}

          {/* Add Expense Button */}
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Shop Expense</span>
          </button>

          <button
            onClick={() => window.print()}
            className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 text-slate-700"
            title="Print Report"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="print:hidden space-y-4">
      {/* Main KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 print:grid-cols-5 print:gap-2">
        {/* Total Sales */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Total Sales (মোট বিক্রয়)
          </span>
          <span className="font-bold text-xl font-mono text-slate-900 mt-1 block">
            {formatBDT(totalSalesRevenue)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {filteredSales.length} Invoices generated
          </span>
        </div>

        {/* Cost of Goods */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Cost of Goods (ক্রয় মূল্য)
          </span>
          <span className="font-bold text-xl font-mono text-slate-700 mt-1 block">
            {formatBDT(totalCostOfGoods)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Original stock purchase cost</span>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold block">
            Gross Profit (মোট লাভ)
          </span>
          <span className="font-bold text-xl font-mono text-emerald-700 mt-1 block">
            {formatBDT(grossProfit)}
          </span>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Sales - Purchase Cost</span>
        </div>

        {/* Shop Expenses */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-rose-600 uppercase tracking-wider font-semibold block">
            Shop Expenses (দোকান খরচ)
          </span>
          <span className="font-bold text-xl font-mono text-rose-700 mt-1 block">
            {formatBDT(totalExpenses)}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {filteredExpenses.length} Expense entries
          </span>
        </div>

        {/* Net Profit */}
        <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-800 shadow-2xs">
          <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold block">
            Net Profit (প্রকৃত নিট লাভ)
          </span>
          <span
            className={`font-bold text-xl font-mono mt-1 block ${
              netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatBDT(netProfit)}
          </span>
          <span className="text-[11px] text-slate-300 mt-0.5 block font-mono">
            Margin: {profitMarginPercent}%
          </span>
        </div>
      </div>

      {/* Cash Flow Drawer & Top Selling Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cash Inflow & Drawer Summary (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
            Cash Drawer & Collections Breakdown (নগদ ক্যাশ ও আদায়)
          </h3>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
              <span className="text-slate-600 font-sans">Cash Sales (নগদ বিক্রয় জমা):</span>
              <span className="font-bold text-slate-900">{formatBDT(cashSalesPaid)}</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between">
              <span className="text-slate-600 font-sans">
                MFS Collections (বিকাশ / নগদ / রকেট):
              </span>
              <span className="font-bold text-indigo-700">{formatBDT(mfsSalesPaid)}</span>
            </div>

            <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 flex justify-between">
              <span className="text-emerald-800 font-sans">
                Previous Due Recovered (বাকি আদায়):
              </span>
              <span className="font-bold text-emerald-800">{formatBDT(dueRecoveredAmount)}</span>
            </div>

            <div className="p-2.5 bg-rose-50 rounded border border-rose-200 flex justify-between">
              <span className="text-rose-800 font-sans">New Dues Given (নতুন বাকি দেওয়া):</span>
              <span className="font-bold text-rose-800">{formatBDT(newDuesGiven)}</span>
            </div>

            <div className="p-3 bg-slate-900 text-white rounded flex justify-between text-sm font-bold pt-2 mt-2">
              <span className="font-sans">Total Physical Cash in Drawer:</span>
              <span className="text-emerald-400">{formatBDT(totalCashCollected)}</span>
            </div>
          </div>
        </div>

        {/* Invoices Issued This Period (6 Cols) */}
        <div className="lg:col-span-6 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 flex items-center justify-between">
            <span>Invoices Issued (তৈরিকৃত চালান)</span>
            <span className="normal-case tracking-normal text-slate-400 font-mono">
              {invoicesIssued.length}
            </span>
          </h3>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {invoicesIssued.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-sans">
                No invoices generated in this time period yet.
              </div>
            ) : (
              invoicesIssued.map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => onSelectInvoice?.(sale, "thermal")}
                  disabled={!onSelectInvoice}
                  className="w-full py-2 flex items-center justify-between text-xs text-left group disabled:cursor-default"
                  title={onSelectInvoice ? "Click to view invoice" : undefined}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 rounded-full bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition shrink-0">
                      <FileText className="w-3 h-3" />
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 group-hover:underline flex items-center gap-1">
                        {sale.invoiceNo}
                        {onSelectInvoice && (
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {sale.customerName} • {formatDateTime(sale.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono shrink-0 pl-2">
                    <span className="font-bold text-slate-900 block">{formatBDT(sale.payableAmount)}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{sale.customerType}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Expenses Log Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Recorded Shop Expenses ({filteredExpenses.length})
          </h3>
          <span className="text-xs font-mono font-bold text-rose-700">
            Total Expenses: {formatBDT(totalExpenses)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Expense Title / বিবরণ</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Notes</th>
                <th className="py-2 px-3 text-right">Amount (৳)</th>
                <th className="py-2 px-3 text-center print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-sans">
                    No expense records in this selected period.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-500 font-sans">{formatDateOnly(exp.date)}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 font-sans">{exp.title}</td>
                    <td className="py-2 px-3 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] uppercase text-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-sans">{exp.notes || "-"}</td>
                    <td className="py-2 px-3 text-right font-bold text-rose-700">
                      {formatBDT(exp.amount)}
                    </td>
                    <td className="py-2 px-3 text-center font-sans print:hidden">
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      </div>

      {/* ================= ADD EXPENSE MODAL ================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-semibold text-sm text-slate-900">Add Shop Expense (দোকানের খরচ)</h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Expense Title / বিবরণ:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. দোকানের বিদ্যুৎ বিল or কর্মচারীর চা-নাস্তা"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Category (খরচের খাত):</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value as any }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="electricity">Electricity Bill (বিদ্যুৎ বিল)</option>
                  <option value="rent">Shop Rent (দোকান ভাড়া)</option>
                  <option value="staff">Staff Wages (কর্মচারীর বেতন)</option>
                  <option value="transport">Transport / ভ্যান ভাড়া</option>
                  <option value="entertainment">Tea & Snacks (চা-নাস্তা / আপ্যায়ন)</option>
                  <option value="stationery_use">Internal Stationery Use (দোকানের খাতা-কলম)</option>
                  <option value="other">Other Expenses (অন্যান্য)</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Amount / টাকা (৳):</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-center text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Date:</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Notes (ঐচ্ছিক):</label>
                <input
                  type="text"
                  placeholder="মন্তব্য..."
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-2xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
