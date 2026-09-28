"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Search, ShieldCheck, Loader2 } from "lucide-react";

function formatBDT(amount: number): string {
  const num = Math.round((amount + Number.EPSILON) * 100) / 100;
  return `৳ ${num.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

interface VerifiedItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface VerifyResult {
  found: boolean;
  sale?: {
    invoiceNo: string;
    customerName: string;
    customerType: string;
    items: VerifiedItem[];
    subtotal: number;
    totalDiscount: number;
    payableAmount: number;
    paidAmount: number;
    dueAmount: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
  };
  shop?: {
    shopName: string;
    bengaliShopName: string;
    phone: string;
    address: string;
  } | null;
}

function VerifyPageInner() {
  const searchParams = useSearchParams();
  const [invoiceNo, setInvoiceNo] = useState(searchParams.get("invoice") || "");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const runVerify = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/verify-invoice?invoiceNo=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fromUrl = searchParams.get("invoice");
    if (fromUrl) {
      runVerify(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shopName = result?.shop?.shopName || "SR Telecom & Library";
  const bengaliShopName = result?.shop?.bengaliShopName || "এস. আর. টেলিকম এন্ড লাইব্রেরি";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-lg space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">Invoice Verification</h1>
          <p className="text-xs text-slate-500">
            ইনভয়েস নম্বর দিয়ে চালানের সত্যতা যাচাই করুন (verify an invoice is genuine)
          </p>
        </div>

        {/* Search Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runVerify(invoiceNo);
          }}
          className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="e.g. INV-0001"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-slate-700 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
          </button>
        </form>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-3 text-center">
            {error}
          </div>
        )}

        {/* Result: Not Found */}
        {result && !result.found && (
          <div className="bg-white rounded-xl border border-rose-200 shadow-xs p-6 text-center space-y-2">
            <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h2 className="font-bold text-rose-700 text-sm">Invoice Not Found</h2>
            <p className="text-xs text-slate-500">
              এই নম্বরে কোনো বৈধ চালান পাওয়া যায়নি। নম্বরটি আবার যাচাই করুন।
            </p>
          </div>
        )}

        {/* Result: Found */}
        {result?.found && result.sale && (
          <div className="bg-white rounded-xl border border-emerald-200 shadow-xs overflow-hidden">
            <div className="bg-emerald-50 border-b border-emerald-200 p-4 text-center space-y-1">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto" />
              <h2 className="font-bold text-emerald-800 text-sm">Genuine Invoice / বৈধ চালান</h2>
              <p className="text-[11px] text-emerald-700">{shopName} • {bengaliShopName}</p>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">Invoice No</span>
                  <span className="font-bold text-slate-900">{result.sale.invoiceNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Date</span>
                  <span className="text-slate-700">
                    {new Date(result.sale.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Customer</span>
                  <span className="text-slate-700">{result.sale.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status</span>
                  <span
                    className={`font-semibold uppercase ${
                      result.sale.dueAmount > 0 ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {result.sale.dueAmount > 0 ? "Due Pending" : "Fully Paid"}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2 space-y-1">
                {result.sale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between font-mono text-[11px]">
                    <span className="text-slate-700 font-sans">
                      {item.quantity}x {item.productName}
                    </span>
                    <span className="text-slate-900">{formatBDT(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-2 space-y-1 font-mono">
                <div className="flex justify-between font-bold text-slate-900">
                  <span className="font-sans">Total Payable</span>
                  <span>{formatBDT(result.sale.payableAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans">Paid</span>
                  <span>{formatBDT(result.sale.paidAmount)}</span>
                </div>
                {result.sale.dueAmount > 0 && (
                  <div className="flex justify-between text-rose-700 font-semibold">
                    <span className="font-sans">Due</span>
                    <span>{formatBDT(result.sale.dueAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-slate-400">
          {shopName} — Public invoice verification service
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPageInner />
    </Suspense>
  );
}
