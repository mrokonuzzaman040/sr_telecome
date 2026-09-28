"use client";

import React, { useState, useMemo } from "react";
import { Product, Customer, ReturnType, ReturnRecord, ReturnedBookItem, ReplacementBookItem, Sale } from "@/types";
import { useStore } from "@/context/StoreContext";
import { formatBDT, formatDateTime } from "@/utils/formatters";
import {
  ArrowLeftRight,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  Printer,
  X,
  BookOpen,
  Plus,
  Trash2,
  Receipt,
  User,
  Phone,
  Percent,
  ChevronDown,
  Info,
  DollarSign,
  Check,
} from "lucide-react";

export function ReturnsView() {
  const { products, customers, sales, returns, processReturn, settings, showAlert } = useStore();

  // Operation Type
  const [returnType, setReturnType] = useState<ReturnType>("exchange");

  // Customer / Agent / Mobile Search & Selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("walkin");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Original Invoice Selection (ঐচ্ছিক চালান নং)
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string>("");
  const [manualInvoiceNo, setManualInvoiceNo] = useState<string>("");

  // Returned Books List (Multiple or Single)
  const [returnedBooks, setReturnedBooks] = useState<ReturnedBookItem[]>([]);

  // Direct Book Add Selector (when adding from catalog)
  const [catalogAddProductId, setCatalogAddProductId] = useState<string>(products[0]?.id || "");
  const [catalogAddQty, setCatalogAddQty] = useState<number>(1);
  const [catalogAddCommRate, setCatalogAddCommRate] = useState<number>(0);

  // Replacement Items List (For Exchange)
  const [replacementItems, setReplacementItems] = useState<ReplacementBookItem[]>([]);
  const [replaceAddProductId, setReplaceAddProductId] = useState<string>(products[1]?.id || products[0]?.id || "");
  const [replaceAddQty, setReplaceAddQty] = useState<number>(1);
  const [replaceAddCommRate, setReplaceAddCommRate] = useState<number>(0);

  // Refund Settlement Option (when refunding or price difference < 0)
  const [refundAdjustmentType, setRefundAdjustmentType] = useState<"cash" | "due_deduct">("cash");

  // Return Reason
  const [returnReason, setReturnReason] = useState("Wrong Subject / Class");

  // Search filter for past returns log
  const [logSearchQuery, setLogSearchQuery] = useState("");

  // Print voucher modal
  const [activeSlip, setActiveSlip] = useState<ReturnRecord | null>(null);

  // Active customer object
  const activeCustomer = useMemo(() => {
    if (selectedCustomerId === "walkin") return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Filtered customers by query (name or phone)
  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, customerSearchQuery]);

  // Invoices for the active customer / search
  const customerInvoices = useMemo(() => {
    if (!activeCustomer) return [];
    return sales.filter(
      (s) =>
        s.customerId === activeCustomer.id ||
        (activeCustomer.phone && s.customerPhone === activeCustomer.phone)
    );
  }, [sales, activeCustomer]);

  // Find selected invoice object
  const activeInvoice = useMemo<Sale | null>(() => {
    const invNo = selectedInvoiceNo || manualInvoiceNo.trim();
    if (!invNo) return null;
    return sales.find((s) => s.invoiceNo.toLowerCase() === invNo.toLowerCase()) || null;
  }, [sales, selectedInvoiceNo, manualInvoiceNo]);

  // Effective invoice number string
  const effectiveInvoiceNo = selectedInvoiceNo || manualInvoiceNo.trim();

  // Suggest default commission rate when selecting customer
  const defaultCustomerCommission = useMemo(() => {
    if (activeCustomer) {
      if (activeCustomer.type === "agent") {
        return activeCustomer.defaultCommissionRate ?? settings.defaultAgentCommission ?? 30;
      }
      return settings.defaultRetailDiscount ?? 0;
    }
    return 0;
  }, [activeCustomer, settings]);

  // Total Return Credit (Sum of all returned items)
  const totalRefundCredit = useMemo(() => {
    return returnedBooks.reduce((sum, item) => sum + (item.totalRefundValue || 0), 0);
  }, [returnedBooks]);

  // Total Replacement Value (Sum of replacement items)
  const totalReplacementValue = useMemo(() => {
    if (returnType === "replacement") {
      // Same book replacement has ৳0 price difference
      return totalRefundCredit;
    }
    if (returnType === "refund") {
      return 0;
    }
    return replacementItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);
  }, [returnType, totalRefundCredit, replacementItems]);

  // Price Difference:
  // Positive = Customer owes extra to shop (গ্রাহক পরিশোধ করবে)
  // Negative = Shop owes refund / credit to customer (দোকান ফেরত বা বাকি সমন্বয়)
  const priceDifference = useMemo(() => {
    if (returnType === "replacement") return 0;
    return totalReplacementValue - totalRefundCredit;
  }, [returnType, totalReplacementValue, totalRefundCredit]);

  // --- Handlers ---

  // Select customer
  const handleSelectCustomer = (cust: Customer | "walkin") => {
    if (cust === "walkin") {
      setSelectedCustomerId("walkin");
      setCustomerSearchQuery("");
      setSelectedInvoiceNo("");
    } else {
      setSelectedCustomerId(cust.id);
      setCustomerSearchQuery(`${cust.name} (${cust.phone})`);
      setSelectedInvoiceNo("");
      // Update catalog add default commission
      if (cust.type === "agent") {
        const rate = cust.defaultCommissionRate ?? settings.defaultAgentCommission ?? 30;
        setCatalogAddCommRate(rate);
        setReplaceAddCommRate(rate);
      } else {
        const rate = settings.defaultRetailDiscount ?? 0;
        setCatalogAddCommRate(rate);
        setReplaceAddCommRate(rate);
      }
    }
    setIsCustomerDropdownOpen(false);
  };

  // Select invoice from dropdown
  const handleSelectInvoice = (invNo: string) => {
    setSelectedInvoiceNo(invNo);
    setManualInvoiceNo("");

    // If an invoice is selected, check if we need to auto-link customer
    if (invNo) {
      const sale = sales.find((s) => s.invoiceNo === invNo);
      if (sale && sale.customerId && (!activeCustomer || activeCustomer.id !== sale.customerId)) {
        setSelectedCustomerId(sale.customerId);
        const cust = customers.find((c) => c.id === sale.customerId);
        if (cust) {
          setCustomerSearchQuery(`${cust.name} (${cust.phone})`);
        }
      }
    }
  };

  // Add an item from the selected invoice into returnedBooks
  const handleAddFromInvoice = (item: any) => {
    // Check if already in return list
    const existingIndex = returnedBooks.findIndex((rb) => rb.productId === item.productId);
    if (existingIndex >= 0) {
      showAlert(`"${item.productName}" is already in the return list. You can adjust its quantity there.`, {
        title: "Already Added",
        type: "info",
      });
      return;
    }

    // Determine commission rate given at time of sale
    const mrp = Number(item.mrp) || Number(item.unitPrice) || 0;
    const soldUnitPrice = Number(item.unitPrice) || mrp;
    const unitDiscount = Number(item.unitDiscount) || Math.max(0, mrp - soldUnitPrice);
    const commissionRate =
      item.commissionRate !== undefined
        ? Number(item.commissionRate)
        : mrp > 0
        ? Math.round((unitDiscount / mrp) * 100)
        : 0;

    const newReturnedItem: ReturnedBookItem = {
      productId: item.productId,
      productName: item.productName,
      quantity: 1,
      mrp,
      commissionRate,
      unitDiscount,
      unitPrice: soldUnitPrice,
      totalRefundValue: soldUnitPrice * 1,
      originalSoldQty: Number(item.quantity) || 1,
    };

    setReturnedBooks((prev) => [...prev, newReturnedItem]);
  };

  // Add a book from catalog (manual or direct return)
  const handleAddFromCatalog = () => {
    const prod = products.find((p) => p.id === catalogAddProductId);
    if (!prod) {
      showAlert("Please select a valid book to add.", { type: "warning" });
      return;
    }

    // Check if already in list
    const existingIndex = returnedBooks.findIndex((rb) => rb.productId === prod.id);
    if (existingIndex >= 0) {
      showAlert(`"${prod.name}" is already in the return list. You can adjust quantity directly.`, {
        type: "info",
      });
      return;
    }

    const mrp = prod.mrp || 0;
    const commRate = Math.max(0, Math.min(100, catalogAddCommRate));
    const unitDiscount = Math.round((mrp * commRate) / 100);
    const unitPrice = Math.max(0, mrp - unitDiscount);

    const newItem: ReturnedBookItem = {
      productId: prod.id,
      productName: prod.name,
      quantity: Math.max(1, catalogAddQty),
      mrp,
      commissionRate: commRate,
      unitDiscount,
      unitPrice,
      totalRefundValue: unitPrice * Math.max(1, catalogAddQty),
    };

    setReturnedBooks((prev) => [...prev, newItem]);
    setCatalogAddQty(1);
  };

  // Update a returned book's property (qty, commRate, or custom refund rate)
  const handleUpdateReturnedBook = (
    index: number,
    field: "quantity" | "commissionRate" | "unitPrice",
    value: number
  ) => {
    setReturnedBooks((prev) => {
      const next = [...prev];
      const item = { ...next[index] };

      if (field === "quantity") {
        const qty = Math.max(1, value);
        if (item.originalSoldQty && qty > item.originalSoldQty) {
          showAlert(
            `Original invoice had only ${item.originalSoldQty} copies of "${item.productName}". Return quantity is adjusted to ${item.originalSoldQty}.`,
            { title: "Invoice Quantity Limit", type: "warning" }
          );
          item.quantity = item.originalSoldQty;
        } else {
          item.quantity = qty;
        }
        item.totalRefundValue = item.quantity * item.unitPrice;
      } else if (field === "commissionRate") {
        const rate = Math.max(0, Math.min(100, value));
        item.commissionRate = rate;
        item.unitDiscount = Math.round((item.mrp * rate) / 100);
        item.unitPrice = Math.max(0, item.mrp - item.unitDiscount);
        item.totalRefundValue = item.quantity * item.unitPrice;
      } else if (field === "unitPrice") {
        const customRate = Math.max(0, value);
        item.unitPrice = customRate;
        item.unitDiscount = Math.max(0, item.mrp - customRate);
        item.commissionRate = item.mrp > 0 ? Math.round((item.unitDiscount / item.mrp) * 100) : 0;
        item.totalRefundValue = item.quantity * customRate;
      }

      next[index] = item;
      return next;
    });
  };

  // Remove a returned book
  const handleRemoveReturnedBook = (index: number) => {
    setReturnedBooks((prev) => prev.filter((_, i) => i !== index));
  };

  // Add replacement item for exchange
  const handleAddReplacementItem = () => {
    const prod = products.find((p) => p.id === replaceAddProductId);
    if (!prod) {
      showAlert("Please select a replacement item.", { type: "warning" });
      return;
    }

    if (prod.stockQty < replaceAddQty) {
      showAlert(
        `Only ${prod.stockQty} copies of ${prod.name} are available in stock!`,
        { title: "Insufficient Stock", type: "error" }
      );
      return;
    }

    const mrp = prod.mrp || 0;
    const commRate = Math.max(0, Math.min(100, replaceAddCommRate));
    const unitDiscount = Math.round((mrp * commRate) / 100);
    const unitPrice = Math.max(0, mrp - unitDiscount);

    const existingIndex = replacementItems.findIndex((it) => it.productId === prod.id);
    if (existingIndex >= 0) {
      setReplacementItems((prev) => {
        const next = [...prev];
        const nextQty = next[existingIndex].quantity + replaceAddQty;
        if (nextQty > prod.stockQty) {
          showAlert(`Cannot exceed total available stock (${prod.stockQty})!`, { type: "error" });
          return prev;
        }
        next[existingIndex].quantity = nextQty;
        next[existingIndex].totalValue = nextQty * next[existingIndex].unitPrice;
        return next;
      });
    } else {
      setReplacementItems((prev) => [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: replaceAddQty,
          mrp,
          commissionRate: commRate,
          unitDiscount,
          unitPrice,
          totalValue: unitPrice * replaceAddQty,
        },
      ]);
    }

    setReplaceAddQty(1);
  };

  // Update a replacement item's property (qty, commRate, or custom unit rate)
  const handleUpdateReplacementItem = (
    index: number,
    field: "quantity" | "commissionRate" | "unitPrice",
    value: number
  ) => {
    setReplacementItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };
      const mrp = item.mrp || item.unitPrice;

      if (field === "quantity") {
        const prod = products.find((p) => p.id === item.productId);
        let qty = Math.max(1, value);
        if (prod && qty > prod.stockQty) {
          showAlert(`Only ${prod.stockQty} copies of "${item.productName}" are available in stock!`, {
            title: "Insufficient Stock",
            type: "error",
          });
          qty = prod.stockQty;
        }
        item.quantity = qty;
        item.totalValue = item.quantity * item.unitPrice;
      } else if (field === "commissionRate") {
        const rate = Math.max(0, Math.min(100, value));
        item.commissionRate = rate;
        item.unitDiscount = Math.round((mrp * rate) / 100);
        item.unitPrice = Math.max(0, mrp - item.unitDiscount);
        item.totalValue = item.quantity * item.unitPrice;
      } else if (field === "unitPrice") {
        const customRate = Math.max(0, value);
        item.unitPrice = customRate;
        item.unitDiscount = Math.max(0, mrp - customRate);
        item.commissionRate = mrp > 0 ? Math.round((item.unitDiscount / mrp) * 100) : 0;
        item.totalValue = item.quantity * customRate;
      }

      next[index] = item;
      return next;
    });
  };

  // Remove replacement item
  const handleRemoveReplacementItem = (index: number) => {
    setReplacementItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit return
  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();

    if (returnedBooks.length === 0) {
      showAlert("Please add at least one book to the returned list (ফেরত দেওয়া বই যোগ করুন)।", {
        title: "No Returned Books",
        type: "warning",
      });
      return;
    }

    if (returnType === "exchange" && replacementItems.length === 0) {
      showAlert("Please select at least one replacement item to exchange with (বিনিময়ে নেওয়া নতুন বই যোগ করুন)।", {
        title: "Replacement Item Required",
        type: "warning",
      });
      return;
    }

    // Prepare primary returned item for backward compatibility
    const primaryReturnedItem = returnedBooks[0];

    // Prepare replacement items
    let finalReplacementItems: ReplacementBookItem[] = [];
    if (returnType === "replacement") {
      // In same book replacement, mirrors returned books
      finalReplacementItems = returnedBooks.map((rb) => ({
        productId: rb.productId,
        productName: rb.productName,
        quantity: rb.quantity,
        unitPrice: rb.unitPrice,
        totalValue: rb.totalRefundValue,
      }));
    } else if (returnType === "exchange") {
      finalReplacementItems = replacementItems;
    }

    const primaryReplacement = finalReplacementItems[0];

    // Effective price difference adjustment
    let adjustedPriceDifference = priceDifference;
    if ((returnType === "refund" || returnType === "exchange") && refundAdjustmentType === "cash") {
      // Settled with cash on the spot (received extra or refunded) - no ledger/due change.
      // "due_deduct" keeps priceDifference so it adds/deducts against the customer's due.
      adjustedPriceDifference = 0;
    }
    // Walk-in customers have no account to carry a due, so any difference must be cash-settled.
    if (!activeCustomer) {
      adjustedPriceDifference = 0;
    }

    const record = processReturn({
      invoiceId: effectiveInvoiceNo || "DIRECT-COUNTER",
      invoiceNo: effectiveInvoiceNo || "COUNTER-RETURN",
      customerId: activeCustomer?.id,
      customerName: activeCustomer ? activeCustomer.name : "Walk-in Retail Customer",
      customerPhone: activeCustomer?.phone,
      returnType,
      returnedItems: returnedBooks,
      returnedItem: primaryReturnedItem,
      replacementItems: finalReplacementItems,
      replacementItem: primaryReplacement,
      totalRefundCredit,
      totalReplacementValue,
      adjustmentType: refundAdjustmentType,
      reason: returnReason,
      priceDifference: adjustedPriceDifference,
    });

    setActiveSlip(record);

    // Reset fields
    setReturnedBooks([]);
    setReplacementItems([]);
    setSelectedInvoiceNo("");
    setManualInvoiceNo("");
    setReturnReason("Wrong Subject / Class");
    setRefundAdjustmentType("cash");
  };

  // Filtered returns history log
  const filteredReturnsLog = useMemo(() => {
    const q = logSearchQuery.trim().toLowerCase();
    if (!q) return returns;
    return returns.filter(
      (r) =>
        r.customerName.toLowerCase().includes(q) ||
        (r.invoiceNo && r.invoiceNo.toLowerCase().includes(q)) ||
        (r.customerPhone && r.customerPhone.includes(q)) ||
        r.reason.toLowerCase().includes(q)
    );
  }, [returns, logSearchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Return & Exchange Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shadow-2xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Book Returns & Exchange (বই ফেরত ও পরিবর্তন কেন্দ্র)
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-800">
                  Multi-Item & Commission Verification
                </span>
              </div>
              <p className="text-xs text-slate-500">
                একক বা একাধিক বই ফেরত নিন। বিক্রয়ের সময় দেওয়া কমিশন যাচাই করে নিট মূল্যে ফেরত বা পরিবর্তন করুন।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-mono text-center">
              <span className="text-[10px] text-slate-500 block">Total Logs</span>
              <span className="font-bold text-slate-900">{returns.length} records</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ================= LEFT COLUMN: RETURN FORM (7 COLS) ================= */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSubmitReturn} className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
            {/* Header / Step Indicator */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <h3 className="font-semibold text-sm text-slate-900">
                  Return Operation & Customer Identification
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Step 1 of 3</span>
            </div>

            {/* 1. Return Operation Type Tabs */}
            <div>
              <label className="font-semibold text-xs text-slate-700 block mb-1.5">
                Operation Type (ফেরতের ধরন):
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReturnType("exchange")}
                  className={`py-2 px-2 rounded-lg border text-center transition ${
                    returnType === "exchange"
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-medium"
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                  <span className="block text-xs">1. Exchange (বিনিময়)</span>
                  <span className="text-[10px] opacity-75 block">অন্য বই বা স্টেশনারি নেওয়া</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReturnType("refund")}
                  className={`py-2 px-2 rounded-lg border text-center transition ${
                    returnType === "refund"
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-medium"
                  }`}
                >
                  <DollarSign className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                  <span className="block text-xs">2. Direct Refund (ফেরত)</span>
                  <span className="text-[10px] opacity-75 block">নগদ ফেরত বা বাকি সমন্বয়</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReturnType("replacement")}
                  className={`py-2 px-2 rounded-lg border text-center transition ${
                    returnType === "replacement"
                      ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-semibold"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-medium"
                  }`}
                >
                  <RefreshCw className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                  <span className="block text-xs">3. Same Copy Change</span>
                  <span className="text-[10px] opacity-75 block">ছেঁড়া/ত্রুটিপূর্ণ বইয়ের কপি বদল</span>
                </button>
              </div>
            </div>

            {/* 2. Customer / Agent / Mobile Number Selector */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Customer / Agent / Mobile Number (গ্রাহক বা এজেন্ট):
                </label>
                {activeCustomer && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      activeCustomer.type === "agent"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-blue-100 text-blue-800 border border-blue-300"
                    }`}
                  >
                    {activeCustomer.type === "agent" ? "Agent (এজেন্ট)" : "Retail Customer"}
                  </span>
                )}
              </div>

              {/* Customer Search & Dropdown */}
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search Customer / Agent Name or Mobile 017... / খুচরা ক্রেতা"
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                    />
                    {customerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearchQuery("");
                          setSelectedCustomerId("walkin");
                        }}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectCustomer("walkin")}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${
                      selectedCustomerId === "walkin"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    Walk-in
                  </button>
                </div>

                {/* Dropdown Results */}
                {isCustomerDropdownOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                    <div
                      onClick={() => handleSelectCustomer("walkin")}
                      className={`p-2.5 cursor-pointer hover:bg-slate-50 flex items-center justify-between ${
                        selectedCustomerId === "walkin" ? "bg-slate-50 font-bold" : ""
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-slate-900">Walk-in Retail Customer (খুচরা ক্রেতা)</span>
                        <p className="text-[10px] text-slate-500">Regular counter customer without account</p>
                      </div>
                      <span className="text-[10px] text-slate-400">Cash Settlement</span>
                    </div>

                    {filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className={`p-2.5 cursor-pointer hover:bg-slate-50 flex items-center justify-between ${
                          selectedCustomerId === c.id ? "bg-blue-50/70 font-semibold" : ""
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-900 font-bold">{c.name}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                c.type === "agent" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {c.type === "agent" ? "Agent" : "Retail"}
                            </span>
                            {c.defaultCommissionRate !== undefined && c.type === "agent" && (
                              <span className="text-[9px] text-amber-700 font-mono">
                                ({c.defaultCommissionRate}% Comm)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {c.phone || "No phone"}
                            </span>
                            {c.address && <span>• {c.address}</span>}
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <span className="text-[10px] text-slate-400 block">Due (বাকি)</span>
                          <span className={`text-xs font-bold ${c.currentDue > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {formatBDT(c.currentDue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Customer Details Banner */}
              {activeCustomer && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {activeCustomer.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">{activeCustomer.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono ml-2">{activeCustomer.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    {activeCustomer.type === "agent" && (
                      <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                        Default Comm: <strong>{activeCustomer.defaultCommissionRate ?? settings.defaultAgentCommission ?? 30}%</strong>
                      </span>
                    )}
                    <span className="text-slate-700">
                      Current Due: <strong className="text-rose-600">{formatBDT(activeCustomer.currentDue)}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Original Invoice Reference (ঐচ্ছিক চালান নং) */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    Original Invoice No (ঐচ্ছিক চালান নং):
                  </label>
                  <span className="text-[10px] text-slate-500">
                    চালান সিলেক্ট করলে বিক্রিত বই ও কমিশনের সঠিক হিসাব পাওয়া যাবে
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  {/* Dropdown if customer has invoices */}
                  <div className="sm:col-span-7">
                    <select
                      value={selectedInvoiceNo}
                      onChange={(e) => handleSelectInvoice(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="">-- No Invoice Selected / Direct Counter Return --</option>
                      {customerInvoices.map((inv) => (
                        <option key={inv.id} value={inv.invoiceNo}>
                          {inv.invoiceNo} • {new Date(inv.createdAt).toLocaleDateString()} • {inv.items.length} items (৳{inv.payableAmount})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Or Manual Invoice Search */}
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Or type Invoice No (e.g. INV-...)"
                      value={manualInvoiceNo}
                      onChange={(e) => {
                        setManualInvoiceNo(e.target.value);
                        if (e.target.value) setSelectedInvoiceNo("");
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* If Invoice Found: Show Items Purchased in this Invoice */}
                {activeInvoice && (
                  <div className="mt-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-blue-700" />
                        <span className="font-bold text-blue-900 font-mono">{activeInvoice.invoiceNo}</span>
                        <span className="text-[10px] text-blue-700 font-sans">
                          ({formatDateTime(activeInvoice.createdAt)})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-blue-800 font-semibold">
                        Total Paid: {formatBDT(activeInvoice.paidAmount)} • Due: {formatBDT(activeInvoice.dueAmount)}
                      </span>
                    </div>

                    <p className="text-[11px] text-blue-950 font-medium">
                      Books sold in this invoice (এই চালানের বিক্রিত বই ও বিক্রয়কালীন দেওয়া কমিশন):
                    </p>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {activeInvoice.items.map((item, idx) => {
                        const mrp = Number(item.mrp) || Number(item.unitPrice);
                        const soldUnitPrice = Number(item.unitPrice) || mrp;
                        const unitDiscount = Number(item.unitDiscount) || Math.max(0, mrp - soldUnitPrice);
                        const commRate =
                          item.commissionRate !== undefined
                            ? Number(item.commissionRate)
                            : mrp > 0
                            ? Math.round((unitDiscount / mrp) * 100)
                            : 0;

                        const isAlreadyAdded = returnedBooks.some((rb) => rb.productId === item.productId);

                        return (
                          <div
                            key={idx}
                            className="bg-white p-2 rounded-lg border border-blue-100 flex items-center justify-between text-xs gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-slate-900 truncate block">
                                {item.productName}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                                <span>Sold: {item.quantity} pcs</span>
                                <span>• MRP: {formatBDT(mrp)}</span>
                                <span className="bg-amber-50 text-amber-900 px-1.5 py-0.2 rounded border border-amber-200 font-bold">
                                  Comm Given: {commRate}% ({formatBDT(unitDiscount)}/pc)
                                </span>
                                <span className="text-emerald-700 font-bold">
                                  Sold Rate: {formatBDT(soldUnitPrice)}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddFromInvoice(item)}
                              disabled={isAlreadyAdded}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition shrink-0 flex items-center gap-1 ${
                                isAlreadyAdded
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                              }`}
                            >
                              {isAlreadyAdded ? (
                                <>
                                  <Check className="w-3 h-3" /> Added
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" /> Return Item
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Returned Books Section (ফেরত দেওয়া বই - Multiple or Single) */}
            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-rose-900 uppercase">
                      Returned Books (ফেরত দেওয়া বইসমূহ):
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      এক বা একাধিক বই ফেরত নিতে পারেন। কমিশন বাদ দিয়ে নিট ফেরত মূল্য হিসাব হবে।
                    </p>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {returnedBooks.length} {returnedBooks.length === 1 ? "Book" : "Books"} Selected
                </span>
              </div>

              {/* Add Book From Inventory / Catalog (Direct) */}
              <div className="p-2.5 bg-white rounded-lg border border-rose-200 text-xs space-y-2">
                <span className="text-[11px] font-semibold text-slate-700 block">
                  + Add Any Book from Catalog (তালিকা থেকে সরাসরি বই যোগ করুন):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <select
                      value={catalogAddProductId}
                      onChange={(e) => setCatalogAddProductId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (MRP: {formatBDT(p.mrp)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={catalogAddQty}
                      onChange={(e) => setCatalogAddQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-center font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Comm %"
                        value={catalogAddCommRate}
                        onChange={(e) => setCatalogAddCommRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-300 rounded pl-2 pr-5 py-1.5 text-center font-mono font-bold text-amber-900"
                      />
                      <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddFromCatalog}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold text-xs transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>

                {defaultCustomerCommission > 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>Default Commission Suggestion:</span>
                    <button
                      type="button"
                      onClick={() => setCatalogAddCommRate(defaultCustomerCommission)}
                      className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200 font-mono font-bold hover:bg-amber-100"
                    >
                      Use {defaultCustomerCommission}%
                    </button>
                  </div>
                )}
              </div>

              {/* Returned Books List */}
              {returnedBooks.length === 0 ? (
                <div className="py-8 text-center bg-white rounded-lg border border-dashed border-rose-300 text-slate-400 text-xs">
                  <BookOpen className="w-8 h-8 mx-auto mb-1.5 text-rose-300" />
                  <p className="font-semibold text-slate-600">কোনো বই এখনও যুক্ত করা হয়নি</p>
                  <p className="text-[11px] text-slate-400">
                    উপরের চালানের তালিকা থেকে &quot;Return Item&quot; চাপুন অথবা সরাসরি বই নির্বাচন করুন।
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {returnedBooks.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-lg border border-rose-200 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900 block">{item.productName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Printed MRP: {formatBDT(item.mrp)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveReturnedBook(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Commission & Quantity Adjustment Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
                        {/* Quantity */}
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Return Qty (পরিমাণ):</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateReturnedBook(idx, "quantity", item.quantity - 1)}
                              className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateReturnedBook(idx, "quantity", parseInt(e.target.value) || 1)
                              }
                              className="w-full bg-slate-50 border border-slate-300 rounded py-0.5 text-center font-mono font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateReturnedBook(idx, "quantity", item.quantity + 1)}
                              className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Commission % */}
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Commission Given (%):</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.commissionRate ?? 0}
                              onChange={(e) =>
                                handleUpdateReturnedBook(idx, "commissionRate", parseFloat(e.target.value) || 0)
                              }
                              className="w-full bg-amber-50/60 border border-amber-300 text-amber-950 rounded py-0.5 pr-4 text-center font-mono font-bold"
                            />
                            <span className="absolute right-1 top-0.5 text-[10px] text-amber-600 font-bold">%</span>
                          </div>
                        </div>

                        {/* Net Refund Rate per copy */}
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Refund Rate / pc (৳):</label>
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdateReturnedBook(idx, "unitPrice", parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-emerald-50/60 border border-emerald-300 text-emerald-950 rounded py-0.5 text-center font-mono font-bold"
                          />
                        </div>

                        {/* Subtotal Refund Credit */}
                        <div className="text-right flex flex-col justify-end font-mono">
                          <span className="text-[10px] text-slate-500">Item Total Credit</span>
                          <span className="text-sm font-bold text-rose-700">
                            {formatBDT(item.totalRefundValue)}
                          </span>
                        </div>
                      </div>

                      {/* Commission presets helper */}
                      <div className="flex items-center gap-1.5 text-[10px] pt-1">
                        <span className="text-slate-400">Quick presets:</span>
                        {[0, 20, 25, 30, 35].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleUpdateReturnedBook(idx, "commissionRate", preset)}
                            className={`px-1.5 py-0.2 rounded border font-mono transition ${
                              item.commissionRate === preset
                                ? "bg-amber-600 text-white border-amber-600 font-bold"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                        <span className="text-[9px] text-slate-400 ml-auto">
                          (MRP {formatBDT(item.mrp)} - {item.commissionRate}% = {formatBDT(item.unitPrice)} / pc)
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Summary of Returned Books */}
                  <div className="p-3 bg-rose-100/60 rounded-lg border border-rose-300 font-mono text-xs space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span>Total Returned Copies:</span>
                      <span className="font-bold">
                        {returnedBooks.reduce((sum, b) => sum + b.quantity, 0)} copies
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Total Printed MRP:</span>
                      <span>{formatBDT(returnedBooks.reduce((sum, b) => sum + b.mrp * b.quantity, 0))}</span>
                    </div>
                    <div className="flex justify-between text-amber-900 font-semibold">
                      <span>Commission / Discount Deducted:</span>
                      <span>
                        -{" "}
                        {formatBDT(
                          returnedBooks.reduce(
                            (sum, b) => sum + (b.unitDiscount || b.mrp - b.unitPrice) * b.quantity,
                            0
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-rose-900 pt-1 border-t border-rose-300">
                      <span>Net Return Credit (মোট ফেরত মূল্য):</span>
                      <span>{formatBDT(totalRefundCredit)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Replacement Items or Direct Refund Options */}
            {returnType === "exchange" ? (
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-emerald-900 uppercase">
                        New Replacement Items Taken (বিনিময়ে নতুন নেওয়া বইসমূহ):
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        গ্রাহক যেসব নতুন বই বা স্টেশনারি নিবেন তা যুক্ত করুন।
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {replacementItems.length} {replacementItems.length === 1 ? "Item" : "Items"}
                  </span>
                </div>

                {/* Add Replacement Item Box */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  <div className="sm:col-span-5">
                    <select
                      value={replaceAddProductId}
                      onChange={(e) => setReplaceAddProductId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stockQty} • MRP: {formatBDT(p.mrp)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={replaceAddQty}
                      onChange={(e) => setReplaceAddQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-center font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Comm %"
                        value={replaceAddCommRate}
                        onChange={(e) => setReplaceAddCommRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-emerald-300 rounded-lg pl-2 pr-5 py-1.5 text-center font-mono font-bold text-emerald-900"
                      />
                      <span className="absolute right-1.5 top-1.5 text-[10px] text-slate-400 font-bold">%</span>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={handleAddReplacementItem}
                      className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-xs transition flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add New Item
                    </button>
                  </div>
                </div>

                {defaultCustomerCommission > 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>Default Commission Suggestion:</span>
                    <button
                      type="button"
                      onClick={() => setReplaceAddCommRate(defaultCustomerCommission)}
                      className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-mono font-bold hover:bg-emerald-100"
                    >
                      Use {defaultCustomerCommission}%
                    </button>
                  </div>
                )}

                {/* Replacement Items List */}
                {replacementItems.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {replacementItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-2.5 rounded-lg border border-emerald-200 text-xs font-mono space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 font-sans">
                            <span className="font-semibold text-slate-900 block truncate">{item.productName}</span>
                            {item.mrp !== undefined && (
                              <span className="text-[10px] text-slate-500 font-mono">MRP: {formatBDT(item.mrp)}</span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveReplacementItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Qty:</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateReplacementItem(idx, "quantity", parseInt(e.target.value) || 1)
                              }
                              className="w-full bg-slate-50 border border-slate-300 rounded py-0.5 text-center font-mono font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Comm (%):</label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.commissionRate ?? 0}
                                onChange={(e) =>
                                  handleUpdateReplacementItem(idx, "commissionRate", parseFloat(e.target.value) || 0)
                                }
                                className="w-full bg-amber-50/60 border border-amber-300 text-amber-950 rounded py-0.5 pr-4 text-center font-mono font-bold"
                              />
                              <span className="absolute right-1 top-0.5 text-[10px] text-amber-600 font-bold">%</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">Rate/pc (৳):</label>
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleUpdateReplacementItem(idx, "unitPrice", parseFloat(e.target.value) || 0)
                              }
                              className="w-full bg-emerald-50/60 border border-emerald-300 text-emerald-950 rounded py-0.5 text-center font-mono font-bold"
                            />
                          </div>

                          <div className="text-right flex flex-col justify-end">
                            <span className="text-[10px] text-slate-500">Item Total</span>
                            <span className="font-bold text-emerald-800 text-xs">
                              {formatBDT(item.totalValue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="p-2.5 bg-emerald-100/70 rounded-lg border border-emerald-300 font-mono text-xs flex justify-between font-bold text-emerald-950">
                      <span>Total New Replacement Value:</span>
                      <span>{formatBDT(totalReplacementValue)}</span>
                    </div>
                  </div>
                )}

                {/* Extra Payment / Refund Settlement for Exchange (when price differs) */}
                {priceDifference !== 0 && (
                  activeCustomer ? (
                    <div className="p-3 bg-white rounded-lg border border-emerald-300 space-y-2 text-xs">
                      <span className="font-bold text-slate-800 block">
                        {priceDifference > 0
                          ? `Extra Payment Settlement (গ্রাহক অতিরিক্ত দিবে ${formatBDT(priceDifference)}):`
                          : `Refund Settlement (দোকান ফেরত দিবে ${formatBDT(Math.abs(priceDifference))}):`}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <label
                          className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                            refundAdjustmentType === "cash"
                              ? "bg-emerald-50 border-emerald-600 shadow-2xs font-semibold text-emerald-900"
                              : "bg-white border-slate-300 text-slate-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="exchangeAdj"
                            checked={refundAdjustmentType === "cash"}
                            onChange={() => setRefundAdjustmentType("cash")}
                          />
                          <div>
                            <span className="block text-xs">
                              {priceDifference > 0 ? "Cash Received Now" : "Cash Refunded Now"}
                            </span>
                            <span className="text-[10px] text-slate-500 block">নগদ পরিশোধ / ফেরত হয়েছে</span>
                          </div>
                        </label>

                        <label
                          className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                            refundAdjustmentType === "due_deduct"
                              ? "bg-emerald-50 border-emerald-600 shadow-2xs font-semibold text-emerald-900"
                              : "bg-white border-slate-300 text-slate-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="exchangeAdj"
                            checked={refundAdjustmentType === "due_deduct"}
                            onChange={() => setRefundAdjustmentType("due_deduct")}
                          />
                          <div>
                            <span className="block text-xs">
                              {priceDifference > 0 ? "Add to Customer Due" : "Deduct from Due"}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {priceDifference > 0
                                ? "বাকি খাতায় যোগ হবে"
                                : "বাকি থেকে কর্তন হবে"}
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    priceDifference > 0 && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                        ওয়াক-ইন গ্রাহক থেকে অতিরিক্ত {formatBDT(priceDifference)} নগদ সংগ্রহ করুন (Collect extra cash from walk-in customer).
                      </div>
                    )
                  )
                )}
              </div>
            ) : returnType === "refund" ? (
              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-2 text-xs">
                <span className="font-bold text-blue-900 block">
                  Refund Settlement Mode (ফেরত নিষ্পত্তির পদ্ধতি):
                </span>
                <p className="text-[11px] text-slate-600">
                  গ্রাহক কোনো নতুন পণ্য নেননি। মোট ফেরত ক্রেডিট ({formatBDT(totalRefundCredit)}) যেভাবে নিষ্পত্তি হবে:
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <label
                    className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                      refundAdjustmentType === "cash"
                        ? "bg-white border-blue-600 shadow-2xs font-semibold text-blue-900"
                        : "bg-white/50 border-slate-300 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundAdj"
                      checked={refundAdjustmentType === "cash"}
                      onChange={() => setRefundAdjustmentType("cash")}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="block text-xs">Cash / MFS Refund</span>
                      <span className="text-[10px] text-slate-500 block">নগদ টাকা ফেরত দেওয়া হয়েছে</span>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition ${
                      refundAdjustmentType === "due_deduct"
                        ? "bg-white border-blue-600 shadow-2xs font-semibold text-blue-900"
                        : "bg-white/50 border-slate-300 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundAdj"
                      checked={refundAdjustmentType === "due_deduct"}
                      onChange={() => setRefundAdjustmentType("due_deduct")}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="block text-xs">Deduct from Due</span>
                      <span className="text-[10px] text-slate-500 block">
                        {activeCustomer && activeCustomer.currentDue > 0
                          ? `বর্তমান বাকি (${formatBDT(activeCustomer.currentDue)}) থেকে কমবে`
                          : "বকেয়া খাতা থেকে কর্তন"}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 text-xs space-y-1">
                <span className="font-bold text-purple-950 block">
                  Same Book Replacement Mode (একই বই পরিবর্তন):
                </span>
                <p className="text-[11px] text-purple-900">
                  ছেঁড়া বা মিসপ্রিন্ট কপির বিপরীতে একই বইয়ের ফ্রেশ কপি প্রদান করা হবে। মূল্য সমন্বয় ৳০।
                </p>
              </div>
            )}

            {/* Return Reason */}
            <div>
              <label className="font-semibold text-xs text-slate-700 block mb-1">
                Reason for Return (বই পরিবর্তনের কারণ):
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="Wrong Subject / Class">Wrong Subject / Class (ভুল বিষয় বা শ্রেণি)</option>
                <option value="Misprinted / Torn Pages">Misprinted / Torn Pages (ছেঁড়া বা মিসপ্রিন্ট পাতা)</option>
                <option value="Defective Binding">Defective Binding (বাইন্ডিং ত্রুটি)</option>
                <option value="Customer Exchanged Mind">Customer Exchanged Mind (অন্য বই নেওয়ার ইচ্ছা)</option>
                <option value="Agent Season Return / Unsold">Agent Season Return (এজেন্ট অবিক্রীত বই ফেরত)</option>
                <option value="Syllabus / Edition Changed">Syllabus / Edition Changed (সিলেবাস বা সংস্করণ পরিবর্তন)</option>
                <option value="Other">Other / অন্যান্য</option>
              </select>
            </div>

            {/* Final Financial Settlement Banner */}
            <div className="p-4 bg-slate-900 text-white rounded-xl font-mono text-xs space-y-1.5 shadow-sm">
              <div className="flex justify-between text-slate-300">
                <span>Returned Books Total Credit:</span>
                <span className="text-rose-400 font-bold">- {formatBDT(totalRefundCredit)}</span>
              </div>

              {returnType === "exchange" && (
                <div className="flex justify-between text-slate-300">
                  <span>New Items Total Value:</span>
                  <span className="text-emerald-400 font-bold">+ {formatBDT(totalReplacementValue)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-700 text-white">
                <span className="font-sans">
                  {priceDifference > 0
                    ? (returnType === "refund" || returnType === "exchange") && refundAdjustmentType === "due_deduct" && activeCustomer
                      ? "Added to Customer Due (বাকিতে যোগ হবে):"
                      : "Customer Pays Extra (গ্রাহক পরিশোধ করবে):"
                    : priceDifference < 0
                    ? (returnType === "refund" || returnType === "exchange") && refundAdjustmentType === "due_deduct" && activeCustomer
                      ? "Deducted from Customer Due (বাকি কর্তন):"
                      : "Shop Refunds to Customer (দোকান ফেরত দিবে):"
                    : "Settlement Balanced (সমান সমান):"}
                </span>
                <span
                  className={
                    priceDifference > 0
                      ? "text-emerald-400"
                      : priceDifference < 0
                      ? "text-rose-400"
                      : "text-slate-300"
                  }
                >
                  {formatBDT(Math.abs(priceDifference))}
                </span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={returnedBooks.length === 0}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-xs transition shadow-2xs flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Confirm Return & Adjust Stock (ফেরত সম্পন্ন ও স্টক সমন্বয় করুন)</span>
            </button>
          </form>
        </div>

        {/* ================= RIGHT COLUMN: RECENT RETURNS LOG (5 COLS) ================= */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  Returns & Exchanges Log ({returns.length})
                </h3>
                <p className="text-[11px] text-slate-500">সর্বশেষ ফেরত ও বদলের হিসাব রেকর্ড</p>
              </div>

              {/* Search Log Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter log..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:bg-white w-32 sm:w-40"
                />
              </div>
            </div>

            {/* Returns List */}
            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {filteredReturnsLog.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No return or exchange records found.
                </div>
              ) : (
                filteredReturnsLog.map((ret) => {
                  const itemsList = ret.returnedItems && ret.returnedItems.length > 0
                    ? ret.returnedItems
                    : ret.returnedItem ? [ret.returnedItem] : [];
                  const replaceList = ret.replacementItems && ret.replacementItems.length > 0
                    ? ret.replacementItems
                    : ret.replacementItem ? [ret.replacementItem] : [];

                  return (
                    <div
                      key={ret.id}
                      className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 block">{ret.customerName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDateTime(ret.createdAt)} • Inv: {ret.invoiceNo || "N/A"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                              ret.returnType === "exchange"
                                ? "bg-blue-100 text-blue-800"
                                : ret.returnType === "refund"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {ret.returnType}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveSlip(ret)}
                            className="p-1 text-slate-400 hover:text-slate-800"
                            title="Print Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Returned Books */}
                      <div className="p-2 bg-rose-50/60 rounded border border-rose-100 space-y-1">
                        <span className="text-[10px] font-bold text-rose-800 uppercase block">
                          Returned ({itemsList.length}):
                        </span>
                        {itemsList.map((item, i) => (
                          <div key={i} className="flex justify-between text-[11px] font-mono text-slate-700">
                            <span className="truncate pr-2 font-sans font-medium text-slate-900">
                              {item.quantity}x {item.productName}
                            </span>
                            <span className="shrink-0 text-rose-800 font-bold">
                              {formatBDT(item.totalRefundValue || item.unitPrice * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Replacement Items (if any) */}
                      {replaceList.length > 0 && (
                        <div className="p-2 bg-emerald-50/60 rounded border border-emerald-100 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                            Replacement ({replaceList.length}):
                          </span>
                          {replaceList.map((rep, j) => (
                            <div key={j} className="flex justify-between text-[11px] font-mono text-slate-700">
                              <span className="truncate pr-2 font-sans font-medium text-slate-900">
                                {rep.quantity}x {rep.productName}
                              </span>
                              <span className="shrink-0 text-emerald-800 font-bold">
                                {formatBDT(rep.totalValue || rep.unitPrice * rep.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Settlement summary */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-mono text-[11px]">
                        <span className="text-slate-500 font-sans">{ret.reason}</span>
                        <div>
                          {ret.priceDifference > 0 ? (
                            <span className="text-emerald-700 font-bold">
                              + {formatBDT(ret.priceDifference)} (Paid)
                            </span>
                          ) : ret.priceDifference < 0 ? (
                            <span className="text-rose-700 font-bold">
                              - {formatBDT(Math.abs(ret.priceDifference))} (Refunded)
                            </span>
                          ) : (
                            <span className="text-slate-400">Balanced (৳0)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= RETURN VOUCHER PRINT MODAL ================= */}
      {activeSlip && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="no-print flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-semibold text-sm text-slate-900">Return & Exchange Voucher</span>
              <button
                onClick={() => setActiveSlip(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Thermal Slip */}
            <div className="thermal-58mm-paper relative border border-dashed border-slate-300 p-3 rounded text-[11px] font-mono space-y-2 overflow-hidden">
              {(activeSlip.returnType === "exchange" || activeSlip.returnType === "replacement") && (
                <div
                  className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0"
                  style={{ transform: "rotate(-28deg)" }}
                >
                  <span
                    className="font-black uppercase tracking-widest whitespace-nowrap"
                    style={{ fontSize: "28px", color: "rgba(220, 38, 38, 0.18)" }}
                  >
                    REPLACEMENT
                  </span>
                </div>
              )}
              <div className="relative z-10 space-y-2">
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <h4 className="font-bold text-sm text-slate-950">{settings.shopName}</h4>
                <p className="text-[10px] text-slate-600">{settings.bengaliShopName}</p>
                <p className="text-[9px] text-slate-500">{settings.address} • {settings.phone}</p>
                <p className="text-[10px] font-bold text-slate-800 mt-1 uppercase">
                  RETURN & EXCHANGE VOUCHER
                </p>
                <p className="text-[9px] text-slate-500">ভাউচার নং: {activeSlip.id}</p>
              </div>

              <div className="space-y-1 text-slate-700 text-[10px]">
                <div className="flex justify-between">
                  <span>তারিখ:</span>
                  <span>{formatDateTime(activeSlip.createdAt)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>ক্রেতা / এজেন্ট:</span>
                  <span>{activeSlip.customerName}</span>
                </div>
                {activeSlip.invoiceNo && (
                  <div className="flex justify-between">
                    <span>মূল চালান নং:</span>
                    <span>{activeSlip.invoiceNo}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>ধরণ:</span>
                  <span className="uppercase font-semibold">{activeSlip.returnType}</span>
                </div>
                <div className="flex justify-between">
                  <span>কারণ:</span>
                  <span>{activeSlip.reason}</span>
                </div>
              </div>

              {/* Itemized returned items */}
              <div className="py-1.5 border-t border-b border-dashed border-slate-300 text-[10px] space-y-1">
                <span className="font-bold text-rose-900 block">ফেরত দেওয়া বই:</span>
                {(activeSlip.returnedItems && activeSlip.returnedItems.length > 0
                  ? activeSlip.returnedItems
                  : [activeSlip.returnedItem]
                ).map((it, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-medium">
                      <span>{it.quantity}x {it.productName}</span>
                      <span>{formatBDT(it.totalRefundValue || it.unitPrice * it.quantity)}</span>
                    </div>
                    <div className="text-[9px] text-slate-500 pl-2">
                      MRP {formatBDT(it.mrp)} {it.commissionRate ? `(-${it.commissionRate}% comm)` : ""} = {formatBDT(it.unitPrice)}/pc
                    </div>
                  </div>
                ))}

                {/* Replacement items if any */}
                {((activeSlip.replacementItems && activeSlip.replacementItems.length > 0) || activeSlip.replacementItem) && (
                  <div className="pt-1 mt-1 border-t border-dashed border-slate-200 space-y-0.5">
                    <span className="font-bold text-emerald-900 block">বিনিময়ে নেওয়া নতুন বই:</span>
                    {(activeSlip.replacementItems && activeSlip.replacementItems.length > 0
                      ? activeSlip.replacementItems
                      : [activeSlip.replacementItem!]
                    ).map((rep, j) => (
                      <div key={j} className="flex justify-between">
                        <span>{rep.quantity}x {rep.productName}</span>
                        <span>{formatBDT(rep.totalValue || rep.unitPrice * rep.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Settlement summary */}
              <div className="text-[10px] font-bold flex justify-between pt-1">
                <span>হিসাব নিষ্পত্তি:</span>
                <span>
                  {activeSlip.priceDifference > 0
                    ? `ক্রেতা অতিরিক্ত দিল: ${formatBDT(activeSlip.priceDifference)}`
                    : activeSlip.priceDifference < 0
                    ? `দোকান ফেরত দিল: ${formatBDT(Math.abs(activeSlip.priceDifference))}`
                    : "সম্পূর্ণ সমান (৳0)"}
                </span>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-500">
                <p>ধন্যবাদ, আবার আসবেন।</p>
              </div>
              </div>
            </div>

            <div className="no-print pt-2 flex justify-between gap-2">
              <button
                onClick={() => setActiveSlip(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
