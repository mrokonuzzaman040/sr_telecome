"use client";

import React, { useState, useMemo } from "react";
import { Customer, DuePayment, Sale } from "@/types";
import { useStore } from "@/context/StoreContext";
import { formatBDT, formatDateTime } from "@/utils/formatters";
import {
  Users,
  Search,
  UserPlus,
  Coins,
  FileText,
  Printer,
  X,
  Building2,
  User,
  History,
  CheckCircle,
  Phone,
  MapPin,
} from "lucide-react";

export function CustomersView() {
  const { customers, sales, duePayments, recordDuePayment, addCustomer, updateCustomer, settings, showAlert } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "agent" | "single">("all");
  const [dueOnlyFilter, setDueOnlyFilter] = useState(false);

  // Due Collection Modal
  const [collectingCustomer, setCollectingCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bkash" | "nagad" | "bank">("cash");
  const [paymentTrxId, setPaymentTrxId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState<DuePayment | null>(null);

  // Customer Ledger Statement Drawer
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  // New Customer Modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
    type: "agent" as "agent" | "single",
    defaultCommissionRate: 30,
  });

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      if (typeFilter !== "all" && cust.type !== typeFilter) return false;
      if (dueOnlyFilter && cust.currentDue <= 0) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesName = cust.name.toLowerCase().includes(q);
        const matchesPhone = cust.phone.toLowerCase().includes(q);
        const matchesAddress = cust.address?.toLowerCase().includes(q) ?? false;
        return matchesName || matchesPhone || matchesAddress;
      }
      return true;
    });
  }, [customers, typeFilter, dueOnlyFilter, searchQuery]);

  // Aggregate metrics
  const totalDueOutstanding = customers.reduce((acc, c) => acc + c.currentDue, 0);
  const totalAgentDue = customers.filter((c) => c.type === "agent").reduce((acc, c) => acc + c.currentDue, 0);
  const totalRetailDue = customers.filter((c) => c.type === "single").reduce((acc, c) => acc + c.currentDue, 0);

  // Open Due Payment modal
  const handleOpenCollectDue = (customer: Customer) => {
    setCollectingCustomer(customer);
    setPaymentAmount(customer.currentDue);
    setPaymentMethod("cash");
    setPaymentTrxId("");
    setPaymentNote("");
  };

  const handleConfirmDuePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectingCustomer) return;
    if (paymentAmount <= 0) {
      showAlert("Please enter a valid payment amount greater than zero.", {
        title: "Invalid Payment Amount",
        type: "warning",
      });
      return;
    }

    const receipt = recordDuePayment(
      collectingCustomer.id,
      paymentAmount,
      paymentMethod,
      paymentTrxId,
      paymentNote
    );

    setLastPaymentReceipt(receipt);
    setCollectingCustomer(null);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.name.trim() || !customerForm.phone.trim()) {
      showAlert("Please enter both customer name and phone.", {
        title: "Missing Information",
        type: "warning",
      });
      return;
    }

    addCustomer({
      name: customerForm.name,
      phone: customerForm.phone,
      address: customerForm.address,
      type: customerForm.type,
      defaultCommissionRate: customerForm.type === "agent" ? customerForm.defaultCommissionRate : 0,
    });

    setIsAddCustomerOpen(false);
    setCustomerForm({
      name: "",
      phone: "",
      address: "",
      type: "agent",
      defaultCommissionRate: 30,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Total Customers (মোট গ্রাহক)
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {customers.length} ({customers.filter((c) => c.type === "agent").length} Agents)
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-rose-600 uppercase tracking-wider font-semibold block">
            Total Outstanding Due (মোট বকেয়া)
          </span>
          <span className="font-bold text-lg font-mono text-rose-700 mt-1 block">
            {formatBDT(totalDueOutstanding)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-indigo-600 uppercase tracking-wider font-semibold block">
            Agent Due (এজেন্টদের বকেয়া)
          </span>
          <span className="font-bold text-lg font-mono text-indigo-800 mt-1 block">
            {formatBDT(totalAgentDue)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold block">
            Retail Customers Due (খুচরা বাকি)
          </span>
          <span className="font-bold text-lg font-mono text-slate-800 mt-1 block">
            {formatBDT(totalRetailDue)}
          </span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-700 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="all">All Accounts (সকল একাউন্ট)</option>
            <option value="agent">Agents Only (বই এজেন্ট)</option>
            <option value="single">Retail Customers (খুচরা গ্রাহক)</option>
          </select>

          <label className="flex items-center gap-1.5 cursor-pointer bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700">
            <input
              type="checkbox"
              checked={dueOnlyFilter}
              onChange={(e) => setDueOnlyFilter(e.target.checked)}
              className="rounded text-slate-900 focus:ring-0"
            />
            <span>Has Due Only (বাকি আছে)</span>
          </label>

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-2xs transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Customer / Agent</span>
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Customer / Shop Name</th>
                <th className="py-2.5 px-3">Contact & Address</th>
                <th className="py-2.5 px-3">Account Type</th>
                <th className="py-2.5 px-3 text-center">Commission Rate</th>
                <th className="py-2.5 px-3 text-right">Total Purchased</th>
                <th className="py-2.5 px-3 text-right">Total Paid</th>
                <th className="py-2.5 px-3 text-right">Current Due (বাকি)</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No customer accounts found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const hasDue = cust.currentDue > 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {cust.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="font-mono text-slate-700">{cust.phone}</div>
                        {cust.address && (
                          <div className="text-[11px] text-slate-400">{cust.address}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            cust.type === "agent"
                              ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {cust.type === "agent" ? "Agent (পাইকারি)" : "Retail"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-slate-600">
                        {cust.type === "agent" ? `${cust.defaultCommissionRate ?? 30}%` : "-"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatBDT(cust.totalPurchased)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        {formatBDT(cust.totalPaid)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span
                          className={`font-bold px-2 py-0.5 rounded ${
                            hasDue
                              ? "bg-rose-100 text-rose-800"
                              : "text-slate-400 font-normal"
                          }`}
                        >
                          {formatBDT(cust.currentDue)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => hasDue && handleOpenCollectDue(cust)}
                            disabled={!hasDue}
                            className={`p-1.5 rounded-md transition ${
                              hasDue
                                ? "text-emerald-700 hover:bg-emerald-50"
                                : "text-slate-300 cursor-not-allowed"
                            }`}
                            title={hasDue ? "Collect Due Payment (বাকি আদায়)" : "No due outstanding"}
                          >
                            <Coins className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setStatementCustomer(cust)}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                            title="View Customer Ledger & Statement (খতিয়ান)"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= DUE PAYMENT COLLECTION MODAL ================= */}
      {collectingCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-700" />
                <h3 className="font-semibold text-sm text-slate-900">
                  Collect Due Payment (বাকি আদায়)
                </h3>
              </div>
              <button
                onClick={() => setCollectingCustomer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between font-semibold text-slate-900">
                <span>Customer:</span>
                <span>{collectingCustomer.name}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-mono">
                <span>Phone:</span>
                <span>{collectingCustomer.phone}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-700 font-mono pt-1 border-t border-slate-200">
                <span>Current Total Due:</span>
                <span>{formatBDT(collectingCustomer.currentDue)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmDuePayment} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Received Amount / আদায়ের পরিমাণ (৳):
                </label>
                <input
                  type="number"
                  min="1"
                  max={collectingCustomer.currentDue}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 font-mono font-bold text-base text-emerald-800 text-center focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Payment Method (পদ্ধতি):
                </label>
                <div className="grid grid-cols-4 gap-1 text-[11px] font-medium">
                  {(["cash", "bkash", "nagad", "bank"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-1.5 rounded border text-center transition ${
                        paymentMethod === method
                          ? "bg-slate-900 text-white border-slate-900 font-bold"
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      {method.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {["bkash", "nagad", "bank"].includes(paymentMethod) && (
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Transaction ID / Trx ID (ঐচ্ছিক):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9J283HDK8"
                    value={paymentTrxId}
                    onChange={(e) => setPaymentTrxId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:outline-none focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="font-medium text-slate-700 block mb-1">Notes / বিবরণ:</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly settlement / নগদ পরিশোধ"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-900 text-[11px] font-mono flex justify-between">
                <span>Remaining Due After Payment:</span>
                <span className="font-bold">
                  {formatBDT(Math.max(0, collectingCustomer.currentDue - paymentAmount))}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCollectingCustomer(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium shadow-2xs"
                >
                  Confirm & Save Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PAYMENT RECEIPT PRINT MODAL ================= */}
      {lastPaymentReceipt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="no-print flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-semibold text-sm text-slate-900">Money Receipt / মানি রিসিট</span>
              <button
                onClick={() => setLastPaymentReceipt(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt */}
            <div className="thermal-58mm-paper border border-dashed border-slate-300 p-3 rounded text-[11px] font-mono space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-bold text-sm text-slate-950">{settings.shopName}</h4>
                <p className="text-[10px] text-slate-600">{settings.bengaliShopName}</p>
                <p className="text-[10px] font-bold text-slate-800 mt-1 uppercase">
                  MONEY RECEIPT (বাকি আদায় রসিদ)
                </p>
              </div>

              <div className="space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span>তারিখ:</span>
                  <span>{formatDateTime(lastPaymentReceipt.createdAt)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>গ্রাহক:</span>
                  <span>{lastPaymentReceipt.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>মাধ্যম:</span>
                  <span className="uppercase">{lastPaymentReceipt.paymentMethod}</span>
                </div>
                {lastPaymentReceipt.trxId && (
                  <div className="flex justify-between">
                    <span>Trx ID:</span>
                    <span>{lastPaymentReceipt.trxId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>পূর্বের বাকি:</span>
                  <span>{formatBDT(lastPaymentReceipt.previousDue)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800 text-xs pt-1 border-t border-dashed border-slate-300">
                  <span>জমা গ্রহণ (Paid):</span>
                  <span>{formatBDT(lastPaymentReceipt.amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-rose-700 pt-0.5">
                  <span>বর্তমান অবশিষ্ট বাকি:</span>
                  <span>{formatBDT(lastPaymentReceipt.remainingDue)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[9px] text-slate-500">
                <p>স্বাক্ষর: ____________________</p>
                <p className="mt-1">বাকি পরিশোধের জন্য ধন্যবাদ।</p>
              </div>
            </div>

            <div className="no-print pt-2 flex justify-between gap-2">
              <button
                onClick={() => setLastPaymentReceipt(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOMER LEDGER STATEMENT DRAWER ================= */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-end">
          <div className="bg-white max-w-2xl w-full h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto space-y-4">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {statementCustomer.name} - হিসাব খতিয়ান
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {statementCustomer.phone} • {statementCustomer.address || "ঠিকানা উল্লেখ নেই"}
                  </p>
                </div>
                <button
                  onClick={() => setStatementCustomer(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2 my-4 text-xs font-mono">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase block font-sans">
                    Total Purchases
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {formatBDT(statementCustomer.totalPurchased)}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 uppercase block font-sans">
                    Total Paid
                  </span>
                  <span className="font-bold text-emerald-800 mt-0.5 block">
                    {formatBDT(statementCustomer.totalPaid)}
                  </span>
                </div>
                <div className="p-2.5 bg-rose-50 rounded border border-rose-200">
                  <span className="text-[10px] text-rose-700 uppercase block font-sans">
                    Current Due
                  </span>
                  <span className="font-bold text-rose-800 mt-0.5 block">
                    {formatBDT(statementCustomer.currentDue)}
                  </span>
                </div>
              </div>

              {/* Transactions Timeline */}
              <div className="space-y-4">
                {/* Sales Invoices */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    বিক্রয় চালানসমূহ (Sales Invoices)
                  </h4>
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="py-2 px-2.5">Invoice #</th>
                          <th className="py-2 px-2.5">Date</th>
                          <th className="py-2 px-2.5 text-right">Bill (৳)</th>
                          <th className="py-2 px-2.5 text-right">Paid (৳)</th>
                          <th className="py-2 px-2.5 text-right">Due (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sales.filter((s) => s.customerId === statementCustomer.id).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-400 font-sans text-xs">
                              No sales records yet.
                            </td>
                          </tr>
                        ) : (
                          sales
                            .filter((s) => s.customerId === statementCustomer.id)
                            .map((s) => (
                              <tr key={s.id} className="hover:bg-slate-50">
                                <td className="py-2 px-2.5 font-bold text-slate-900">{s.invoiceNo}</td>
                                <td className="py-2 px-2.5 text-slate-500 font-sans text-[11px]">
                                  {formatDateTime(s.createdAt)}
                                </td>
                                <td className="py-2 px-2.5 text-right">{formatBDT(s.payableAmount)}</td>
                                <td className="py-2 px-2.5 text-right text-emerald-700">
                                  {formatBDT(s.paidAmount)}
                                </td>
                                <td className="py-2 px-2.5 text-right text-rose-700 font-bold">
                                  {formatBDT(s.dueAmount)}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Due Payments Log */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    বাকি পরিশোধের ইতিহাস (Payment Vouchers)
                  </h4>
                  <div className="border border-slate-200 rounded overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="py-2 px-2.5">Date</th>
                          <th className="py-2 px-2.5">Method</th>
                          <th className="py-2 px-2.5 text-right">Paid Amount (৳)</th>
                          <th className="py-2 px-2.5 text-right">Balance Due (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {duePayments.filter((p) => p.customerId === statementCustomer.id).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-400 font-sans text-xs">
                              No separate due payments recorded.
                            </td>
                          </tr>
                        ) : (
                          duePayments
                            .filter((p) => p.customerId === statementCustomer.id)
                            .map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="py-2 px-2.5 text-slate-500 font-sans text-[11px]">
                                  {formatDateTime(p.createdAt)}
                                </td>
                                <td className="py-2 px-2.5 uppercase text-slate-700">{p.paymentMethod}</td>
                                <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                                  {formatBDT(p.amount)}
                                </td>
                                <td className="py-2 px-2.5 text-right text-rose-700 font-bold">
                                  {formatBDT(p.remainingDue)}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-between">
              <button
                onClick={() => setStatementCustomer(null)}
                className="px-4 py-2 border border-slate-300 rounded text-xs text-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white rounded text-xs font-medium flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Customer Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD NEW CUSTOMER MODAL ================= */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-slate-900" />
                <h3 className="font-semibold text-sm text-slate-900">Add Customer or Agent</h3>
              </div>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Account Type:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerForm((p) => ({ ...p, type: "agent" }))}
                    className={`py-2 rounded border text-center font-medium transition ${
                      customerForm.type === "agent"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-300"
                    }`}
                  >
                    Agent (পাইকারি বই বিক্রেতা)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerForm((p) => ({ ...p, type: "single" }))}
                    className={`py-2 rounded border text-center font-medium transition ${
                      customerForm.type === "single"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-300"
                    }`}
                  >
                    Retail Customer (খুচরা)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Name / দোকান বা গ্রাহকের নাম:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Madina Book House or Kabir Hossain"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Mobile / ফোন নম্বর:</label>
                <input
                  type="tel"
                  required
                  placeholder="017XXXXXXXX"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Address / ঠিকানা:</label>
                <input
                  type="text"
                  placeholder="বাজার রোড, থানা সদর"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
                />
              </div>

              {customerForm.type === "agent" && (
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Wholesale Commission Rate (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={customerForm.defaultCommissionRate}
                    onChange={(e) =>
                      setCustomerForm((p) => ({
                        ...p,
                        defaultCommissionRate: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono font-bold text-center focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-2xs"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
