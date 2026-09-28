"use client";

import React, { useState, useMemo } from "react";
import { Sale } from "@/types";
import { useStore } from "@/context/StoreContext";
import { formatBDT, formatDateTime } from "@/utils/formatters";
import {
  Search,
  FileText,
  Printer,
  Smartphone,
  Eye,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowUpDown,
} from "lucide-react";

interface InvoicesListViewProps {
  onSelectInvoice: (sale: Sale, mode: "thermal" | "a4") => void;
}

export function InvoicesListView({ onSelectInvoice }: InvoicesListViewProps) {
  const { sales } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "agent" | "single">("all");
  const [dueFilter, setDueFilter] = useState<"all" | "has_due" | "paid">("all");

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Customer type filter
      if (filterType !== "all" && sale.customerType !== filterType) {
        return false;
      }
      // Due filter
      if (dueFilter === "has_due" && sale.dueAmount <= 0) return false;
      if (dueFilter === "paid" && sale.dueAmount > 0) return false;

      // Search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesInvoice = sale.invoiceNo.toLowerCase().includes(query);
        const matchesName = sale.customerName.toLowerCase().includes(query);
        const matchesPhone = sale.customerPhone?.toLowerCase().includes(query) ?? false;
        return matchesInvoice || matchesName || matchesPhone;
      }
      return true;
    });
  }, [sales, filterType, dueFilter, searchQuery]);

  // Aggregate stats
  const totalBilled = filteredSales.reduce((acc, s) => acc + s.payableAmount, 0);
  const totalPaid = filteredSales.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalDue = filteredSales.reduce((acc, s) => acc + s.dueAmount, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Top Header & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Total Invoices (মোট চালান)
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {filteredSales.length}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Total Invoiced Amount (মোট বিল)
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {formatBDT(totalBilled)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold block">
            Total Collected (মোট জমা)
          </span>
          <span className="font-bold text-lg font-mono text-emerald-700 mt-1 block">
            {formatBDT(totalPaid)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-rose-600 uppercase tracking-wider font-semibold block">
            Unpaid Due (চালানের বাকি)
          </span>
          <span className="font-bold text-lg font-mono text-rose-700 mt-1 block">
            {formatBDT(totalDue)}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice No, Customer Name, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-700 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Customer Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="all">All Customers (সকল গ্রাহক)</option>
            <option value="agent">Agents Only (বই এজেন্ট)</option>
            <option value="single">Retail Single (খুচরা ক্রেতা)</option>
          </select>

          {/* Due Status Filter */}
          <select
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="all">All Payment Status</option>
            <option value="paid">Fully Paid (পরিশোধিত)</option>
            <option value="has_due">Has Due (বাকি আছে)</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Invoice No</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">MRP Subtotal</th>
                <th className="py-2.5 px-3 text-right">Discount/Comm</th>
                <th className="py-2.5 px-3 text-right">Net Payable</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-right">Due</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-sans">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No sales invoices found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{sale.invoiceNo}</span>
                        {sale.isModified && (
                          <span
                            className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200 rounded font-normal font-sans"
                            title={sale.modifiedReason || "Invoice modified"}
                          >
                            Modified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-sans text-[11px]">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-semibold text-slate-900">{sale.customerName}</div>
                      {sale.customerPhone && (
                        <div className="text-[10px] text-slate-400">{sale.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                          sale.customerType === "agent"
                            ? "bg-indigo-100 text-indigo-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {sale.customerType === "agent" ? "Agent" : "Retail"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500">
                      {formatBDT(sale.subtotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {sale.totalDiscount > 0 ? `- ${formatBDT(sale.totalDiscount)}` : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatBDT(sale.payableAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">
                      {formatBDT(sale.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {sale.dueAmount > 0 ? (
                        <span className="text-rose-700 font-bold">{formatBDT(sale.dueAmount)}</span>
                      ) : (
                        <span className="text-slate-400 font-sans text-[10px]">Paid</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Thermal Print */}
                        <button
                          onClick={() => onSelectInvoice(sale, "thermal")}
                          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition"
                          title="Print 58mm Thermal Slip (Mobile Mini Printer)"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        </button>

                        {/* A4 Print */}
                        <button
                          onClick={() => onSelectInvoice(sale, "a4")}
                          className="p-1.5 rounded hover:bg-slate-200 text-slate-700 transition"
                          title="Print A4 Paper Invoice (Desktop)"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
