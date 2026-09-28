"use client";

import React, { useState } from "react";
import { Sale } from "@/types";
import { useStore } from "@/context/StoreContext";
import { formatBDT, formatDateTime } from "@/utils/formatters";
import { generateBarcodeSVG } from "@/utils/barcode";
import { Printer, X, Smartphone, Monitor, CheckCircle, FileText } from "lucide-react";

function InvoiceWatermark({ text }: { text: string }) {
  return (
    <div className="pointer-events-none select-none absolute inset-0 overflow-hidden flex items-center justify-center z-0">
      <span className="text-4xl sm:text-6xl font-black uppercase tracking-widest text-slate-900/5 rotate-[-30deg] whitespace-nowrap">
        {text}
      </span>
    </div>
  );
}

function InvoiceBarcode({ value, height }: { value: string; height: number }) {
  const { svgXml, width } = generateBarcodeSVG(value, { height, barWidth: 1, showText: true });
  return (
    <div
      className="flex justify-center"
      style={{ maxWidth: "100%" }}
      dangerouslySetInnerHTML={{
        __html: svgXml.replace("<svg ", `<svg style="max-width:100%;width:${width}px;height:auto;" `),
      }}
    />
  );
}

interface InvoiceModalProps {
  sale: Sale | null;
  onClose: () => void;
  defaultMode?: "thermal" | "a4";
}

export function InvoiceModal({
  sale,
  onClose,
  defaultMode = "thermal",
}: InvoiceModalProps) {
  const { settings, customers } = useStore();
  const [printMode, setPrintMode] = useState<"thermal" | "a4">(defaultMode);

  if (!sale) return null;

  const customer = sale.customerId
    ? customers.find((c) => c.id === sale.customerId)
    : null;

  const previousDue = customer
    ? Math.max(0, customer.currentDue - sale.dueAmount)
    : 0;
  const currentTotalDue = customer ? customer.currentDue : sale.dueAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Modal Card */}
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Controls Header (Hidden on Print) */}
        <div className="no-print bg-slate-900 text-slate-100 px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Invoice #{sale.invoiceNo}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono uppercase font-semibold ${
                sale.customerType === "agent"
                  ? "bg-indigo-900 text-indigo-200 border border-indigo-700"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              {sale.customerType === "agent" ? "Agent / পাইকারি" : "Retail / খুচরা"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Print Mode Switcher */}
            <div className="flex items-center bg-slate-800 rounded-md p-1 border border-slate-700">
              <button
                onClick={() => setPrintMode("thermal")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
                  printMode === "thermal"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Mobile / Mini Thermal Printer Mode (58mm/80mm)"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mini Thermal (58mm)</span>
              </button>

              <button
                onClick={() => setPrintMode("a4")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition ${
                  printMode === "a4"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Desktop Standard A4 Invoice Mode"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Standard A4</span>
              </button>
            </div>

            {/* Print Trigger */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          {printMode === "thermal" ? (
            /* =================== 58mm / 80mm MINI THERMAL RECEIPT =================== */
            <div className="print-container thermal-58mm-paper bg-white border border-slate-300 shadow-sm p-3 rounded text-slate-900 w-full max-w-[340px]">
            <div className="relative">
              <InvoiceWatermark text={sale.dueAmount > 0 ? "DUE" : "PAID"} />
              <div className="relative z-10">
              {/* Header */}
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h2 className="font-bold text-base leading-tight tracking-tight text-slate-950">
                  {settings.shopName}
                </h2>
                <p className="text-[11px] font-medium text-slate-800">{settings.bengaliShopName}</p>
                {settings.proprietor && (
                  <p className="text-[9px] text-slate-600">স্বত্বাধিকারী: {settings.proprietor}</p>
                )}
                <p className="text-[10px] text-slate-600 mt-0.5">{settings.address}</p>
                <p className="text-[10px] font-mono font-medium text-slate-800">
                  ফোন: {settings.phone}
                </p>
                {settings.vatRegistrationNo && (
                  <p className="text-[9px] text-slate-500 font-mono">BIN: {settings.vatRegistrationNo}</p>
                )}
              </div>

              {/* Invoice Meta */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] leading-tight space-y-0.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-600">মেমো নং:</span>
                  <span className="font-bold text-slate-900">{sale.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">তারিখ:</span>
                  <span>{formatDateTime(sale.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">ক্রেতা:</span>
                  <span className="font-semibold text-slate-900">{sale.customerName}</span>
                </div>
                {sale.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">মোবাইল:</span>
                    <span>{sale.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">গ্রাহকের ধরণ:</span>
                  <span className="font-semibold uppercase">
                    {sale.customerType === "agent" ? "এজেন্ট (পাইকারি)" : "খুচরা ক্রেতা"}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="border-b border-dashed border-slate-400 font-semibold text-slate-700">
                      <th className="py-1">বিবরণ</th>
                      <th className="py-1 text-center">দর</th>
                      <th className="py-1 text-right">মোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dashed divide-slate-200">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="py-1 pr-1">
                          <div className="font-medium text-slate-950 leading-tight">
                            {item.productName}
                          </div>
                          <div className="text-[9px] text-slate-500 font-mono">
                            {item.quantity} x {formatBDT(item.unitPrice)}
                            {item.unitDiscount > 0 && ` (ছাড় ৳${item.unitDiscount})`}
                          </div>
                        </td>
                        <td className="py-1 text-center font-mono">{formatBDT(item.unitPrice)}</td>
                        <td className="py-1 text-right font-mono font-medium">{formatBDT(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-600">মোট মূল্য (MRP):</span>
                  <span>{formatBDT(sale.subtotal)}</span>
                </div>
                {sale.totalDiscount > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>
                      {sale.customerType === "agent" ? "কমিশন (ছাড়):" : "ডিসকাউন্ট:"}
                    </span>
                    <span>- {formatBDT(sale.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300 text-slate-950">
                  <span>সর্বমোট প্রদেয়:</span>
                  <span>{formatBDT(sale.payableAmount)}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-600">
                    পরিশোধ ({sale.paymentMethod.toUpperCase()}):
                  </span>
                  <span className="font-semibold text-emerald-800">{formatBDT(sale.paidAmount)}</span>
                </div>
                {sale.dueAmount > 0 ? (
                  <div className="flex justify-between text-rose-700 font-bold border-t border-dashed border-slate-300 pt-1">
                    <span>এই চালানে বাকি:</span>
                    <span>{formatBDT(sale.dueAmount)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>ফেরত / পরিশোধিত:</span>
                    <span>{formatBDT(Math.max(0, sale.paidAmount - sale.payableAmount))}</span>
                  </div>
                )}
                {customer && customer.currentDue > 0 && (
                  <div className="flex justify-between text-slate-800 font-semibold pt-1 border-t border-slate-300">
                    <span>মোট বর্তমান বাকি:</span>
                    <span>{formatBDT(customer.currentDue)}</span>
                  </div>
                )}
              </div>

              {/* Barcode */}
              <div className="pt-2 border-t border-dashed border-slate-400">
                <InvoiceBarcode value={sale.invoiceNo} height={18} />
              </div>

              {/* Footer Courteous Note */}
              <div className="pt-2 text-center text-[9px] text-slate-600 space-y-1">
                <p className="font-medium text-slate-800">{settings.invoiceFooterMessage}</p>
                <p>ধন্যবাদ, আবার আসবেন!</p>
                <p className="text-[8px] text-slate-400 font-mono">
                  Software by Antigravity POS
                </p>
              </div>
              </div>
            </div>
            </div>
          ) : (
            /* =================== STANDARD A4 PAPER INVOICE =================== */
            <div className="print-container a4-paper bg-white border border-slate-300 shadow-sm p-8 rounded text-slate-900 w-full max-w-[800px]">
            <div className="relative">
              <InvoiceWatermark text={sale.dueAmount > 0 ? "DUE" : "PAID"} />
              <div className="relative z-10">
              {/* Formal Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                    {settings.shopName}
                  </h1>
                  <p className="text-sm font-semibold text-slate-800">{settings.bengaliShopName}</p>
                  {settings.proprietor && (
                    <p className="text-xs text-slate-700 mt-0.5">স্বত্বাধিকারী: {settings.proprietor}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-1 max-w-md">{settings.address}</p>
                  <p className="text-xs text-slate-700 font-mono mt-0.5">
                    মোবাইল: {settings.phone} {settings.secondaryPhone && `• ${settings.secondaryPhone}`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-semibold tracking-wider uppercase rounded-xs">
                    INVOICE / ক্যাশ মেমো
                  </span>
                  <div className="text-xs font-mono text-slate-600 mt-2 space-y-0.5">
                    <p>
                      ইনভয়েস নং: <span className="font-bold text-slate-900">{sale.invoiceNo}</span>
                    </p>
                    <p>তারিখ: {formatDateTime(sale.createdAt)}</p>
                    {settings.vatRegistrationNo && <p>BIN: {settings.vatRegistrationNo}</p>}
                  </div>
                </div>
              </div>

              {/* Bill To & Customer Info */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    গ্রাহকের তথ্য (CUSTOMER INFO)
                  </span>
                  <p className="font-bold text-sm text-slate-950 mt-1">{sale.customerName}</p>
                  <p className="text-slate-600 font-mono">{sale.customerPhone || "মোবাইল: নেই"}</p>
                  {customer?.address && <p className="text-slate-600 mt-0.5">{customer.address}</p>}
                  <p className="text-slate-500 font-mono mt-1">
                    শ্রেণী:{" "}
                    <span className="font-semibold uppercase text-slate-800">
                      {sale.customerType === "agent" ? "এজেন্ট (বুকসেলার / পাইকারি)" : "খুচরা ক্রেতা"}
                    </span>
                  </p>
                </div>

                {/* Ledger & Payment Info */}
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">পেমেন্ট মাধ্যম:</span>
                    <span className="font-semibold uppercase text-slate-900">{sale.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">পূর্বের বকেয়া (Previous Due):</span>
                    <span>{formatBDT(previousDue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">বর্তমান বিল (This Bill):</span>
                    <span>{formatBDT(sale.payableAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-slate-200 pt-1">
                    <span className="text-slate-700">বর্তমান মোট বকেয়া (Total Due):</span>
                    <span className="text-rose-700">{formatBDT(currentTotalDue)}</span>
                  </div>
                </div>
              </div>

              {/* Formal Items Table */}
              <div className="py-4">
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-300 font-semibold">
                    <tr>
                      <th className="py-2 px-2 border-r border-slate-300 w-10 text-center">ক্রমিক</th>
                      <th className="py-2 px-3 border-r border-slate-300">বই ও পণ্যের বিবরণ</th>
                      <th className="py-2 px-2 border-r border-slate-300 text-center w-16">পরিমাণ</th>
                      <th className="py-2 px-3 border-r border-slate-300 text-right w-24">গায়ের দর (MRP)</th>
                      <th className="py-2 px-3 border-r border-slate-300 text-right w-24">ছাড় / কমিশন</th>
                      <th className="py-2 px-3 border-r border-slate-300 text-right w-24">বিক্রয় দর</th>
                      <th className="py-2 px-3 text-right w-28">মোট টাকা</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-900">
                          {item.productName}
                        </td>
                        <td className="py-2 px-2 border-r border-slate-200 text-center font-mono font-semibold">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono text-slate-600">
                          {formatBDT(item.mrp)}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono text-slate-600">
                          {item.unitDiscount > 0 ? formatBDT(item.unitDiscount) : "-"}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-semibold text-slate-800">
                          {formatBDT(item.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatBDT(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Totals and Ledger Breakdown */}
              <div className="grid grid-cols-2 gap-6 pt-2 pb-6 border-b border-slate-200 text-xs">
                <div>
                  <p className="text-slate-600 font-medium">শর্তাবলী:</p>
                  <ul className="list-disc list-inside text-slate-500 text-[11px] mt-1 space-y-0.5">
                    <li>বিক্রিত বই ৭ দিনের মধ্যে অক্ষত অবস্থায় ক্যাশমেমো সহ পরিবর্তনযোগ্য।</li>
                    <li>ছেঁড়া বা দাগযুক্ত বই পরিবর্তন করা হবে না।</li>
                    <li>বকেয়া হিসাব প্রতি মাসের ১-৫ তারিখের মধ্যে পরিশোধযোগ্য।</li>
                  </ul>
                  <div className="mt-4 p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-700">
                    <span className="font-semibold block mb-0.5">মন্তব্য / নোট:</span>
                    <span>{sale.notes || "কোনো বিশেষ মন্তব্য নেই।"}</span>
                  </div>
                </div>

                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">মোট মূল্য (Subtotal MRP):</span>
                    <span className="font-semibold">{formatBDT(sale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                    <span>কমিশন / ডিসকাউন্ট:</span>
                    <span>- {formatBDT(sale.totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-sm font-bold border-b-2 border-slate-900 text-slate-950">
                    <span>সর্বমোট প্রদেয় (Net Payable):</span>
                    <span>{formatBDT(sale.payableAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">পরিশোধ (Paid Today):</span>
                    <span className="font-bold text-emerald-800">{formatBDT(sale.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-sm font-bold text-rose-700">
                    <span>বাকি (Current Bill Due):</span>
                    <span>{formatBDT(sale.dueAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Barcode */}
              <div className="pt-4 flex justify-center">
                <InvoiceBarcode value={sale.invoiceNo} height={24} />
              </div>

              {/* Signature Lines */}
              <div className="pt-8 flex justify-between items-end text-xs text-slate-600">
                <div className="text-center">
                  <div className="w-40 border-t border-slate-400 mb-1"></div>
                  <p>ক্রেতার স্বাক্ষর</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-medium text-slate-800 mb-8">{settings.shopName}</p>
                  <div className="w-44 border-t border-slate-400 mb-1"></div>
                  <p>কর্তৃপক্ষের স্বাক্ষর</p>
                </div>
              </div>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
