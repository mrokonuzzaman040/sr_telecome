"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/context/StoreContext";
import { Customer, Sale, DuePayment } from "@/types";
import { formatBDT, formatDateTime } from "@/utils/formatters";
import {
  ArrowLeft,
  Pencil,
  Save,
  Coins,
  FileText,
  User,
  Building2,
  Printer,
  CheckCircle,
} from "lucide-react";

interface CustomerDetailViewProps {
  customer: Customer;
  onBack: () => void;
  onSelectInvoice: (sale: Sale, mode: "thermal" | "a4") => void;
}

export function CustomerDetailView({ customer, onBack, onSelectInvoice }: CustomerDetailViewProps) {
  const { sales, duePayments, recordDuePayment, updateCustomer, currentUser, showAlert, settings } = useStore();
  const isAdmin = currentUser?.role === "admin";

  // ---- Inline edit customer info ----
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: customer.name,
    phone: customer.phone,
    address: customer.address || "",
    type: customer.type,
    defaultCommissionRate: customer.defaultCommissionRate ?? 30,
  });

  const handleStartEdit = () => {
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || "",
      type: customer.type,
      defaultCommissionRate: customer.defaultCommissionRate ?? 30,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomer(customer.id, {
      name: editForm.name.trim(),
      phone: editForm.phone.trim(),
      address: editForm.address.trim() || undefined,
      type: editForm.type,
      defaultCommissionRate: editForm.type === "agent" ? editForm.defaultCommissionRate : 0,
    });
    setIsEditing(false);
  };

  // ---- Customer's sales / invoices / payments / profit ----
  const customerSales = useMemo(
    () => sales.filter((s) => s.customerId === customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [sales, customer.id]
  );

  const customerDuePayments = useMemo(
    () =>
      duePayments
        .filter((p) => p.customerId === customer.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [duePayments, customer.id]
  );

  const totalGrossProfit = customerSales.reduce((acc, s) => acc + s.grossProfit, 0);

  // ---- Inline collect due form ----
  const [isCollectingDue, setIsCollectingDue] = useState(false);
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number>(customer.currentDue);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bkash" | "nagad" | "bank">("cash");
  const [paymentTrxId, setPaymentTrxId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [lastReceipt, setLastReceipt] = useState<DuePayment | null>(null);

  // Invoices for this customer that have unpaid due
  const unpaidSales = useMemo(
    () => customerSales.filter((s) => s.dueAmount > 0),
    [customerSales]
  );

  const handleOpenCollectDue = (targetInvoice?: Sale) => {
    if (targetInvoice) {
      setSelectedInvoiceNo(targetInvoice.invoiceNo);
      setPaymentAmount(targetInvoice.dueAmount);
    } else {
      setSelectedInvoiceNo("");
      setPaymentAmount(customer.currentDue);
    }
    setPaymentMethod("cash");
    setPaymentTrxId("");
    setPaymentNote("");
    setIsCollectingDue(true);
  };

  const handleConfirmDuePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      showAlert("Please enter a valid payment amount greater than zero.", {
        title: "Invalid Payment Amount",
        type: "warning",
      });
      return;
    }
    const receipt = recordDuePayment(
      customer.id,
      paymentAmount,
      paymentMethod,
      paymentTrxId,
      paymentNote,
      selectedInvoiceNo || undefined
    );
    setLastReceipt(receipt);
    setIsCollectingDue(false);
    setSelectedInvoiceNo("");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4 select-none">
      {/* Printable Money Receipt (visible inline, isolated when printing) */}
      {lastReceipt && (
        <div className="print-container bg-white rounded-lg border border-emerald-200 shadow-2xs p-4 space-y-3">
          <div className="no-print flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle className="w-4 h-4" />
              <span>Payment recorded — Money Receipt ready below.</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setLastReceipt(null)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700 hover:bg-slate-50"
              >
                Dismiss
              </button>
            </div>
          </div>

          <div className="thermal-58mm-paper border border-dashed border-slate-300 p-3 rounded text-[11px] font-mono space-y-2 max-w-xs mx-auto">
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
                <span>{formatDateTime(lastReceipt.createdAt)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>গ্রাহক:</span>
                <span>{lastReceipt.customerName}</span>
              </div>
              {lastReceipt.invoiceNo && (
                <div className="flex justify-between font-bold text-indigo-900">
                  <span>চালান নং (Invoice):</span>
                  <span>{lastReceipt.invoiceNo}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>মাধ্যম:</span>
                <span className="uppercase">{lastReceipt.paymentMethod}</span>
              </div>
              {lastReceipt.trxId && (
                <div className="flex justify-between">
                  <span>Trx ID:</span>
                  <span>{lastReceipt.trxId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>পূর্বের বাকি:</span>
                <span>{formatBDT(lastReceipt.previousDue)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800 text-xs pt-1 border-t border-dashed border-slate-300">
                <span>জমা গ্রহণ (Paid):</span>
                <span>{formatBDT(lastReceipt.amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-700 pt-0.5">
                <span>বর্তমান অবশিষ্ট বাকি:</span>
                <span>{formatBDT(lastReceipt.remainingDue)}</span>
              </div>
            </div>
            <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[9px] text-slate-500">
              <p>স্বাক্ষর: ____________________</p>
              <p className="mt-1">বাকি পরিশোধের জন্য ধন্যবাদ।</p>
            </div>
          </div>
        </div>
      )}

      <div className="no-print space-y-4">
      {/* Back Nav */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>গ্রাহক তালিকায় ফিরুন (Back to Ledger)</span>
      </button>

      {/* Customer Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4">
        {!isEditing ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                {customer.type === "agent" ? (
                  <Building2 className="w-5 h-5 text-indigo-500" />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-900 leading-tight">{customer.name}</h1>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                      customer.type === "agent"
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {customer.type === "agent" ? "Agent (পাইকারি)" : "Retail"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  {customer.phone} {customer.address ? `• ${customer.address}` : ""}
                </p>
                {customer.type === "agent" && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Commission Rate: <span className="font-mono font-semibold">{customer.defaultCommissionRate ?? 30}%</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {customer.currentDue > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenCollectDue()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium shadow-2xs transition"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>বাকি আদায়</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleStartEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name / নাম *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / ফোন *</label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address / ঠিকানা</label>
              <input
                type="text"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm((p) => ({ ...p, type: "agent" }))}
                    className={`py-1.5 rounded-md border text-center text-xs font-medium transition ${
                      editForm.type === "agent"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-300"
                    }`}
                  >
                    Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm((p) => ({ ...p, type: "single" }))}
                    className={`py-1.5 rounded-md border text-center text-xs font-medium transition ${
                      editForm.type === "single"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-300"
                    }`}
                  >
                    Retail
                  </button>
                </div>
              </div>

              {editForm.type === "agent" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={editForm.defaultCommissionRate}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, defaultCommissionRate: parseFloat(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold text-center bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Inline Collect Due Form */}
      {isCollectingDue && (
        <div className="bg-white rounded-lg border border-emerald-200 shadow-2xs p-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-3">
            Collect Due Payment (বাকি আদায়)
          </h3>
          <form onSubmit={handleConfirmDuePayment} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Select Invoice / নির্দিষ্ট চালান নির্বাচন (ঐচ্ছিক):
              </label>
              <select
                value={selectedInvoiceNo}
                onChange={(e) => {
                  const invNo = e.target.value;
                  setSelectedInvoiceNo(invNo);
                  if (invNo) {
                    const match = unpaidSales.find((s) => s.invoiceNo === invNo);
                    if (match) {
                      setPaymentAmount(match.dueAmount);
                    }
                  } else {
                    setPaymentAmount(customer.currentDue);
                  }
                }}
                className="w-full sm:w-96 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs focus:outline-none focus:bg-white"
              >
                <option value="">— সকল চালান / একাউন্ট বাকি (General Customer Due) —</option>
                {unpaidSales.map((sale) => (
                  <option key={sale.id} value={sale.invoiceNo}>
                    {sale.invoiceNo} — বাকি: ৳{sale.dueAmount.toLocaleString()} ({formatDateTime(sale.createdAt)})
                  </option>
                ))}
              </select>
              {selectedInvoiceNo && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-indigo-700">
                  <span>Selected Invoice Due:</span>
                  <span className="font-bold font-mono">
                    {formatBDT(unpaidSales.find((s) => s.invoiceNo === selectedInvoiceNo)?.dueAmount || 0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoiceNo("");
                      setPaymentAmount(customer.currentDue);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 underline ml-2"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Received Amount / আদায়ের পরিমাণ (৳):
              </label>
              <input
                type="number"
                min="1"
                max={customer.currentDue}
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="w-full sm:w-64 bg-slate-50 border border-slate-300 rounded px-3 py-2 font-mono font-bold text-base text-emerald-800 text-center focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Payment Method:</label>
              <div className="grid grid-cols-4 gap-1 max-w-sm text-[11px] font-medium">
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
                <label className="font-medium text-slate-700 block mb-1">Transaction ID (ঐচ্ছিক):</label>
                <input
                  type="text"
                  placeholder="e.g. 9J283HDK8"
                  value={paymentTrxId}
                  onChange={(e) => setPaymentTrxId(e.target.value)}
                  className="w-full sm:w-64 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:outline-none focus:bg-white"
                />
              </div>
            )}

            <div>
              <label className="font-medium text-slate-700 block mb-1">Notes:</label>
              <input
                type="text"
                placeholder="e.g. Monthly settlement"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full sm:w-96 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="p-2 bg-emerald-50 rounded border border-emerald-200 text-emerald-900 text-[11px] font-mono flex justify-between max-w-sm">
              <span>Remaining Due After Payment:</span>
              <span className="font-bold">{formatBDT(Math.max(0, customer.currentDue - paymentAmount))}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCollectingDue(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-medium text-xs shadow-2xs"
              >
                Confirm &amp; Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Total Purchased
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {formatBDT(customer.totalPurchased)}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold block">
            Total Paid
          </span>
          <span className="font-bold text-lg font-mono text-emerald-700 mt-1 block">
            {formatBDT(customer.totalPaid)}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-rose-600 uppercase tracking-wider font-semibold block">
            Current Due
          </span>
          <span className="font-bold text-lg font-mono text-rose-700 mt-1 block">
            {formatBDT(customer.currentDue)}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-indigo-600 uppercase tracking-wider font-semibold block">
            Total Profit Generated
          </span>
          <span className="font-bold text-lg font-mono text-indigo-800 mt-1 block">
            {formatBDT(totalGrossProfit)}
          </span>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            বিক্রয় চালানসমূহ (Sales Invoices) — {customerSales.length}
          </h3>
        </div>
        {customerSales.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No sales records yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Invoice #</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3 text-right">Bill (৳)</th>
                  <th className="py-2 px-3 text-right">Paid (৳)</th>
                  <th className="py-2 px-3 text-right">Due (৳)</th>
                  <th className="py-2 px-3 text-right">Profit (৳)</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onSelectInvoice(s, "thermal")}
                          className="font-bold text-indigo-700 hover:text-indigo-900 hover:underline underline-offset-2"
                          title="View / Print Invoice"
                        >
                          {s.invoiceNo}
                        </button>
                        {s.isModified && (
                          <span
                            className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200 rounded font-normal font-sans"
                            title={s.modifiedReason || "Invoice modified"}
                          >
                            Modified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-sans text-[11px]">
                      {formatDateTime(s.createdAt)}
                    </td>
                    <td className="py-2 px-3 text-right">{formatBDT(s.payableAmount)}</td>
                    <td className="py-2 px-3 text-right text-emerald-700">{formatBDT(s.paidAmount)}</td>
                    <td className="py-2 px-3 text-right text-rose-700 font-bold">{formatBDT(s.dueAmount)}</td>
                    <td className="py-2 px-3 text-right text-indigo-700">{formatBDT(s.grossProfit)}</td>
                    <td className="py-2 px-3 text-center">
                      {s.dueAmount > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCollectDue(s)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-sans font-medium transition shadow-2xs"
                          title={`Collect due for ${s.invoiceNo}`}
                        >
                          <Coins className="w-3 h-3" />
                          <span>বাকি আদায়</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-sans">পরিশোধিত</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Due Payments Log */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            বাকি পরিশোধের ইতিহাস (Payment Vouchers) — {customerDuePayments.length}
          </h3>
        </div>
        {customerDuePayments.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No separate due payments recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50/80 text-slate-500 text-[10px] uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Invoice #</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3 text-right">Paid (৳)</th>
                  <th className="py-2 px-3 text-right">Balance Due (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerDuePayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2 px-3 text-slate-500 font-sans text-[11px]">
                      {formatDateTime(p.createdAt)}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      {p.invoiceNo ? (
                        <span className="font-bold text-indigo-700 font-mono">{p.invoiceNo}</span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">সাধারণ বাকি</span>
                      )}
                    </td>
                    <td className="py-2 px-3 uppercase text-slate-700">{p.paymentMethod}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatBDT(p.amount)}</td>
                    <td className="py-2 px-3 text-right text-rose-700 font-bold">{formatBDT(p.remainingDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
