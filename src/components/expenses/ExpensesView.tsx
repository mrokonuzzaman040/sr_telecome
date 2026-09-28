"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { Expense } from "@/types";
import { formatBDT, formatDateOnly, getTodayDateString } from "@/utils/formatters";
import {
  Receipt,
  PlusCircle,
  Search,
  Trash2,
  Printer,
  PieChart,
  Building,
  Zap,
  Users,
  Truck,
  Coffee,
  Package,
  MoreHorizontal,
  X,
} from "lucide-react";

const EXPENSE_CATEGORIES: {
  key: Expense["category"];
  label: string;
  bengali: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { key: "rent", label: "Shop Rent", bengali: "দোকান ভাড়া", icon: Building, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { key: "electricity", label: "Electricity / Utility", bengali: "বিদ্যুৎ ও বিল", icon: Zap, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { key: "staff", label: "Staff Salary / Wage", bengali: "কর্মচারী বেতন", icon: Users, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { key: "transport", label: "Transport & Carrying", bengali: "পরিবহন খরচ", icon: Truck, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { key: "entertainment", label: "Tea & Snacks", bengali: "আপ্যায়ন ও নাস্তা", icon: Coffee, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { key: "stationery_use", label: "Packaging & Bag", bengali: "প্যাকিং ও খাতা", icon: Package, color: "text-teal-600 bg-teal-50 border-teal-200" },
  { key: "other", label: "Other Expenses", bengali: "বিবিধ খরচ", icon: MoreHorizontal, color: "text-slate-600 bg-slate-50 border-slate-200" },
];

export function ExpensesView() {
  const { expenses, addExpense, deleteExpense, settings, selectedDate, currentUser, showAlert, showConfirm } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "selected" | "month">("selected");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [voucherToPrint, setVoucherToPrint] = useState<Expense | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<Expense["category"]>("entertainment");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(selectedDate || getTodayDateString());
  const [formNotes, setFormNotes] = useState("");

  const activeDate = selectedDate || getTodayDateString();
  const currentMonthPrefix = getTodayDateString().slice(0, 7); // "YYYY-MM"

  // Quick preset shortcuts for fast Bengali entry
  const quickPresets = [
    { title: "দোকানের চা ও নাস্তা", category: "entertainment" as const, amount: 50 },
    { title: "গ্রাহক আপ্যায়ন", category: "entertainment" as const, amount: 120 },
    { title: "বই পরিবহন রিকশা ভাড়া", category: "transport" as const, amount: 80 },
    { title: "প্যাকিং পলি ও স্কচটেপ", category: "stationery_use" as const, amount: 150 },
    { title: "দোকান ঝাড়ু ও পরিচ্ছন্নতা", category: "other" as const, amount: 100 },
  ];

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Date range filter
      if (dateFilter === "today" && item.date !== getTodayDateString()) {
        return false;
      }
      if (dateFilter === "selected" && item.date !== activeDate) {
        return false;
      }
      if (dateFilter === "month" && !item.date.startsWith(currentMonthPrefix)) {
        return false;
      }

      // Search query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesNotes = item.notes?.toLowerCase().includes(q) ?? false;
        return matchesTitle || matchesNotes;
      }

      return true;
    });
  }, [expenses, selectedCategory, dateFilter, activeDate, currentMonthPrefix, searchQuery]);

  // Aggregate Metrics
  const activeDateExpensesTotal = useMemo(() => {
    return expenses
      .filter((e) => e.date === activeDate)
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses, activeDate]);

  const monthExpensesTotal = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(currentMonthPrefix))
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses, currentMonthPrefix]);

  const filteredTotal = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Category breakdown for filtered expenses
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return map;
  }, [filteredExpenses]);

  // Add Expense Submission
  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formAmount);
    if (!formTitle.trim()) {
      showAlert("অনুগ্রহ করে খরচের বিবরণ দিন", {
        title: "বিবরণ আবশ্যক",
        type: "warning",
      });
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showAlert("অনুগ্রহ করে সঠিক খরচের পরিমাণ (টাকা) লিখুন", {
        title: "সঠিক টাকার পরিমাণ দিন",
        type: "warning",
      });
      return;
    }

    addExpense({
      title: formTitle.trim(),
      category: formCategory,
      amount: parsedAmount,
      date: formDate || activeDate,
      notes: formNotes.trim() || undefined,
    });

    // Reset and close
    setFormTitle("");
    setFormAmount("");
    setFormNotes("");
    setIsAddModalOpen(false);
  };

  const handleApplyPreset = (preset: typeof quickPresets[0]) => {
    setFormTitle(preset.title);
    setFormCategory(preset.category);
    setFormAmount(String(preset.amount));
  };

  const handleDeleteExpense = async (id: string, title: string) => {
    const confirmed = await showConfirm(`আপনি কি "${title}" খরচের হিসাবটি মুছে ফেলতে চান?`, {
      title: "খরচ মুছে ফেলুন",
      confirmText: "মুছে ফেলুন",
      cancelText: "বাতিল",
      isDestructive: true,
      type: "warning",
    });
    if (confirmed) {
      deleteExpense(id);
    }
  };

  const getCategoryMeta = (catKey: Expense["category"]) => {
    return (
      EXPENSE_CATEGORIES.find((c) => c.key === catKey) || {
        key: "other",
        label: "Other",
        bengali: "বিবিধ",
        icon: MoreHorizontal,
        color: "text-slate-600 bg-slate-50 border-slate-200",
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Page Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">
            দৈনন্দিন খরচ খাতা (Daily Expenses Ledger)
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            দোকানের দৈনন্দিন খরচ, বেতন, চা-নাস্তা, পরিবহন ও বিদ্যুৎ বিল হিসাব এবং ভাউচার তৈরি
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormDate(activeDate);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition font-medium text-xs shadow-2xs shrink-0"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>নতুন খরচ যোগ করুন</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            {activeDate === getTodayDateString() ? "আজকের খরচ (Today)" : `তারিখের খরচ (${formatDateOnly(activeDate)})`}
          </span>
          <span className="font-bold text-lg font-mono text-rose-700 mt-1 block">
            {formatBDT(activeDateExpensesTotal)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            চলতি মাসের মোট খরচ (Monthly)
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {formatBDT(monthExpensesTotal)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            ফিল্টারকৃত মোট খরচ (Filtered)
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {formatBDT(filteredTotal)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            মোট খরচের ভাউচার সংখ্যা
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {filteredExpenses.length} টি
          </span>
        </div>
      </div>

      {/* Category Pills Breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 mb-2.5 text-xs font-bold text-slate-700">
            <PieChart className="w-3.5 h-3.5 text-rose-500" />
            <span>খাতওয়ারী খরচের সারসংক্ষেপ (Category Breakdown)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((cat) => {
              const amount = categoryBreakdown[cat.key] || 0;
              if (amount === 0) return null;
              const Icon = cat.icon;
              return (
                <div
                  key={cat.key}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] ${cat.color}`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="font-semibold">{cat.bengali}:</span>
                  <span className="font-mono font-bold">{formatBDT(amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Expenses Table & Filter Controls */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="খরচের বিবরণ বা নোট দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:bg-white"
            />
          </div>

          {/* Right filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Date filter pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setDateFilter("selected")}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  dateFilter === "selected"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                নির্বাচিত দিন ({activeDate === getTodayDateString() ? "আজ" : activeDate})
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("month")}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  dateFilter === "month"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                চলতি মাস
              </button>
              <button
                type="button"
                onClick={() => setDateFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  dateFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                সব সময়
              </button>
            </div>

            {/* Category dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-lg border border-slate-300 text-slate-700 bg-slate-50"
            >
              <option value="all">সব খাত (All Categories)</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.bengali} ({cat.label})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Expenses List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">তারিখ (Date)</th>
                <th className="py-2.5 px-3">খরচের খাত (Category)</th>
                <th className="py-2.5 px-3">বিবরণ (Title)</th>
                <th className="py-2.5 px-3">নোট / মন্তব্য</th>
                <th className="py-2.5 px-3 text-right">পরিমাণ (Amount)</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-1" />
                    <p className="font-medium">কোনো খরচের হিসাব পাওয়া যায়নি</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      নতুন খরচ যোগ করুন বাটনে ক্লিক করে খরচ লিপিবদ্ধ করুন
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const catMeta = getCategoryMeta(exp.category);
                  const Icon = catMeta.icon;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatDateOnly(exp.date)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium border ${catMeta.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{catMeta.bengali}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {exp.title}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                        {exp.notes || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono text-rose-700 whitespace-nowrap">
                        {formatBDT(exp.amount)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setVoucherToPrint(exp)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                            title="Print Expense Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id, exp.title)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot className="bg-slate-50/90 font-bold border-t border-slate-200 text-slate-800">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 text-right">
                    মোট খরচ (Total Expenses):
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                    {formatBDT(filteredTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal: Add New Expense */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
                  <Receipt className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base text-slate-800">
                  নতুন খরচ লিপিবদ্ধ করুন (Add Expense)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Bengali Presets */}
            <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                দ্রুত যুক্ত করার তালিকা (Quick Presets):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickPresets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50 transition"
                  >
                    {p.title} (৳{p.amount})
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  খরচের বিবরণ (Title / Purpose) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: দোকানের বিদ্যুৎ বিল, কর্মচারীর নাস্তা"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    খরচের খাত (Category) *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as Expense["category"])}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-rose-500 bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.bengali} ({c.label})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    খরচের পরিমাণ (Amount ৳) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 focus:outline-rose-500 text-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  খরচের তারিখ (Date) *
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  মন্তব্য / ভাউচার রেফারেন্স (Optional Note)
                </label>
                <textarea
                  rows={2}
                  placeholder="অতিরিক্ত কোনো তথ্য বা বিলের রেফারেন্স লিখুন..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition cursor-pointer"
                >
                  সংরক্ষণ করুন (Save Expense)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Expense Voucher Modal */}
      {voucherToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-xs text-slate-700">খরচের ভাউচার (Expense Slip)</span>
              <button
                type="button"
                onClick={() => setVoucherToPrint(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Voucher Body (Printable) */}
            <div id="printable-voucher" className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
              <div className="text-center border-b pb-2">
                <h3 className="font-bold text-sm text-slate-900">{settings.shopName}</h3>
                <p className="text-[10px] text-slate-500">{settings.bengaliShopName}</p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                  VOUCHER #{settings.expensePrefix || "EXP"}-{voucherToPrint.id.slice(-6).toUpperCase()}
                </p>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">তারিখ:</span>
                  <span className="font-mono font-medium">{formatDateOnly(voucherToPrint.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">খাত:</span>
                  <span className="font-medium">{getCategoryMeta(voucherToPrint.category).bengali}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">বিবরণ:</span>
                  <span className="font-semibold text-slate-900">{voucherToPrint.title}</span>
                </div>
                {voucherToPrint.notes && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">মন্তব্য:</span>
                    <span className="text-slate-700">{voucherToPrint.notes}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-2 flex justify-between items-center text-sm font-bold text-slate-900">
                <span>প্রদত্ত টাকা:</span>
                <span className="font-mono text-rose-600">{formatBDT(voucherToPrint.amount)}</span>
              </div>

              <div className="pt-6 flex justify-between text-[9px] text-slate-400 border-t border-dashed">
                <div className="text-center">
                  <div className="w-20 border-t border-slate-300 mb-0.5"></div>
                  <span>গ্রহীতার স্বাক্ষর</span>
                </div>
                <div className="text-center">
                  <div className="w-20 border-t border-slate-300 mb-0.5"></div>
                  <span>মালিক/ক্যাশিয়ার</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVoucherToPrint(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                বন্ধ করুন
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
