"use client";

import React, { useState, useMemo } from "react";
import { Product, Customer, SaleItem, PaymentMethod, Sale } from "@/types";
import { useStore } from "@/context/StoreContext";
import { formatBDT } from "@/utils/formatters";
import { BarcodeScannerModal } from "./BarcodeScannerModal";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  FileText,
  UserCheck,
  UserPlus,
  CheckCircle,
  Percent,
  Coins,
  BookOpen,
  PenTool,
  X,
  CreditCard,
  Building2,
  User,
  LayoutGrid,
  List as ListIcon,
  ArrowRight,
  Camera,
} from "lucide-react";

interface POSViewProps {
  onSaleComplete: (sale: Sale, printType: "thermal" | "a4" | "none") => void;
}

export function POSView({ onSaleComplete }: POSViewProps) {
  const { products, customers, addCustomer, createSale, settings, publishers, showAlert, showConfirm } = useStore();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "book" | "stationery">("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedPublisher, setSelectedPublisher] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Cart & Customer States
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("walkin");
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
    type: "single" as "agent" | "single",
    defaultCommissionRate: 30,
  });

  // Dynamic Commission & Smart Discount
  const [agentCommissionRate, setAgentCommissionRate] = useState<number>(settings.defaultAgentCommission);
  const [retailDiscountMode, setRetailDiscountMode] = useState<"percent" | "fixed">("percent");
  const [retailDiscountValue, setRetailDiscountValue] = useState<number>(settings.defaultRetailDiscount);

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paidAmountInput, setPaidAmountInput] = useState<string>("");
  const [saleNotes, setSaleNotes] = useState("");

  // Selected customer object
  const activeCustomer = useMemo(() => {
    if (selectedCustomerId === "walkin") return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const isAgent = activeCustomer?.type === "agent";

  // When customer changes, sync default commission if agent
  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    if (custId !== "walkin") {
      const cust = customers.find((c) => c.id === custId);
      if (cust && cust.type === "agent") {
        setAgentCommissionRate(cust.defaultCommissionRate ?? settings.defaultAgentCommission);
      }
    }
  };

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Category filter
      if (selectedCategory !== "all" && prod.category !== selectedCategory) {
        return false;
      }
      // Class filter
      if (selectedClass !== "all" && prod.bookClass !== selectedClass) {
        return false;
      }
      // Publisher filter
      if (selectedPublisher !== "all" && prod.publisher !== selectedPublisher) {
        return false;
      }
      // Search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(query);
        const matchesBengali = prod.bengaliName?.toLowerCase().includes(query) ?? false;
        const matchesBarcode = prod.barcode.toLowerCase().includes(query);
        const matchesSku = prod.sku.toLowerCase().includes(query);
        const matchesSubject = prod.subject?.toLowerCase().includes(query) ?? false;
        return matchesName || matchesBengali || matchesBarcode || matchesSku || matchesSubject;
      }
      return true;
    });
  }, [products, selectedCategory, selectedClass, selectedPublisher, searchQuery]);

  // Recalculate item unit price & totals based on customer type
  const recalculatedCart = useMemo(() => {
    return cart.map((item) => {
      let unitDiscount = 0;
      let unitPrice = item.mrp;
      let commissionRate = 0;

      if (isAgent) {
        // Agent gets dynamic commission (books get full commission, stationery gets standard)
        commissionRate = agentCommissionRate;
        unitDiscount = Math.round((item.mrp * (commissionRate / 100)) * 100) / 100;
        unitPrice = Math.max(0, item.mrp - unitDiscount);
      } else {
        // Retail customer smart discount
        if (retailDiscountMode === "percent") {
          unitDiscount = Math.round((item.mrp * (retailDiscountValue / 100)) * 100) / 100;
        } else {
          // Flat discount distributed or fixed per item
          unitDiscount = Math.min(item.mrp, retailDiscountValue);
        }
        unitPrice = Math.max(0, item.mrp - unitDiscount);
      }

      return {
        ...item,
        commissionRate: isAgent ? commissionRate : undefined,
        unitDiscount,
        unitPrice,
        total: Math.round(unitPrice * item.quantity * 100) / 100,
      };
    });
  }, [cart, isAgent, agentCommissionRate, retailDiscountMode, retailDiscountValue]);

  // Cart Totals
  const subtotalMRP = recalculatedCart.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
  const totalDiscount = recalculatedCart.reduce((sum, item) => sum + item.unitDiscount * item.quantity, 0);
  const payableAmount = Math.max(0, Math.round((subtotalMRP - totalDiscount) * 100) / 100);
  const totalCost = recalculatedCart.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);

  // Paid amount calculation
  const numericPaidAmount =
    paidAmountInput.trim() === ""
      ? paymentMethod === "due"
        ? 0
        : payableAmount
      : parseFloat(paidAmountInput) || 0;

  const dueAmount = Math.max(0, payableAmount - numericPaidAmount);
  const changeAmount = Math.max(0, numericPaidAmount - payableAmount);

  // Add Product to Cart
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQty) {
          showAlert(`Caution: Only ${product.stockQty} units available in stock!`, {
            title: "Stock Limit Reached",
            type: "warning",
          });
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (product.stockQty <= 0) {
        showAlert("This item is currently out of stock!", {
          title: "Out of Stock",
          type: "error",
        });
        return prev;
      }
      const newItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        category: product.category,
        quantity: 1,
        buyPrice: product.buyPrice,
        mrp: product.mrp,
        unitDiscount: 0,
        unitPrice: product.mrp,
        total: product.mrp,
      };
      return [...prev, newItem];
    });
  };

  // Resolve a scanned/typed barcode (or SKU) straight to a cart add
  const handleScanValue = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const match = products.find(
      (p) => p.barcode.toLowerCase() === trimmed.toLowerCase() || p.sku.toLowerCase() === trimmed.toLowerCase()
    );
    if (match) {
      handleAddToCart(match);
      setSearchQuery("");
    } else {
      showAlert(`No product found for barcode "${trimmed}"`, {
        title: "Barcode Not Found",
        type: "warning",
      });
    }
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const product = products.find((p) => p.id === productId);
            const newQty = item.quantity + delta;
            if (product && newQty > product.stockQty) {
              showAlert(`Only ${product.stockQty} units available in stock!`, {
                title: "Stock Limit Exceeded",
                type: "warning",
              });
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as SaleItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleClearCart = async () => {
    if (cart.length > 0) {
      const confirmed = await showConfirm("Are you sure you want to clear the sales cart?", {
        title: "Clear Cart",
        confirmText: "Clear Cart",
        cancelText: "Keep Items",
        isDestructive: true,
        type: "warning",
      });
      if (confirmed) {
        setCart([]);
        setPaidAmountInput("");
        setSaleNotes("");
      }
    }
  };

  // Quick Round-off for Retail
  const handleQuickRoundOff = () => {
    const rounded = Math.floor(payableAmount / 10) * 10;
    const diff = payableAmount - rounded;
    if (diff > 0) {
      setRetailDiscountMode("fixed");
      setRetailDiscountValue((prev) => prev + diff);
    }
  };

  // Submit Sale
  const handleCompleteSale = (printType: "thermal" | "a4" | "none") => {
    if (recalculatedCart.length === 0) {
      showAlert("Please add at least one item to the cart.", {
        title: "Empty Cart",
        type: "warning",
      });
      return;
    }

    if (dueAmount > 0 && (!activeCustomer || activeCustomer.id === "walkin")) {
      showAlert(
        "Due/Baki is only allowed for registered customers or agents. Please select or create a customer profile to record dues.",
        {
          title: "Registered Customer Required",
          type: "info",
        }
      );
      return;
    }

    const saleRecord = createSale({
      customerId: activeCustomer?.id,
      customerName: activeCustomer ? activeCustomer.name : "Walk-in Retail Customer",
      customerPhone: activeCustomer?.phone,
      customerType: isAgent ? "agent" : "single",
      items: recalculatedCart,
      subtotal: subtotalMRP,
      totalDiscount,
      payableAmount,
      paidAmount: numericPaidAmount,
      dueAmount,
      paymentMethod,
      paymentDetails: {
        cashAmount: paymentMethod === "cash" ? numericPaidAmount : 0,
        mfsAmount: ["bkash", "nagad", "rocket"].includes(paymentMethod) ? numericPaidAmount : 0,
        mfsType: ["bkash", "nagad", "rocket"].includes(paymentMethod) ? (paymentMethod as any) : undefined,
      },
      totalCost,
      grossProfit: payableAmount - totalCost,
      status: "completed",
      notes: saleNotes,
    });

    // Reset Cart
    setCart([]);
    setIsMobileCartOpen(false);
    setPaidAmountInput("");
    setSaleNotes("");

    // Trigger Print or modal
    onSaleComplete(saleRecord, printType);
  };

  // Quick Customer Creation
  const handleCreateNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) {
      showAlert("Please provide both customer name and phone number.", {
        title: "Missing Information",
        type: "warning",
      });
      return;
    }

    const created = addCustomer({
      name: newCustomerForm.name,
      phone: newCustomerForm.phone,
      address: newCustomerForm.address,
      type: newCustomerForm.type,
      defaultCommissionRate:
        newCustomerForm.type === "agent" ? newCustomerForm.defaultCommissionRate : 0,
    });

    setSelectedCustomerId(created.id);
    if (created.type === "agent") {
      setAgentCommissionRate(created.defaultCommissionRate ?? settings.defaultAgentCommission);
    }
    setIsNewCustomerModalOpen(false);
    setNewCustomerForm({
      name: "",
      phone: "",
      address: "",
      type: "single",
      defaultCommissionRate: 30,
    });
  };

  const renderCartRegister = (isMobile = false) => (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden">
      {/* Cart Header & Customer Selection */}
      <div className="p-3.5 bg-slate-900 text-slate-100 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm text-white">Sales Register</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 font-mono text-slate-300">
              {recalculatedCart.length} items
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs text-rose-400 hover:text-rose-300 transition flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800"
                title="Clear Cart"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
            {isMobile && (
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Customer Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-medium">Customer Type / সিলেক্ট গ্রাহক:</span>
            <button
              type="button"
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ New Customer</span>
            </button>
          </div>

          <select
            value={selectedCustomerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-md text-xs text-white px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="walkin">Walk-in Single Customer (সাধারণ খুচরা ক্রেতা)</option>
            <optgroup label="Agents / পাইকারি এজেন্ট">
              {customers
                .filter((c) => c.type === "agent")
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} (Due: {formatBDT(agent.currentDue)})
                  </option>
                ))}
            </optgroup>
            <optgroup label="Registered Retail Customers">
              {customers
                .filter((c) => c.type === "single")
                .map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.name} (Due: {formatBDT(cust.currentDue)})
                  </option>
                ))}
            </optgroup>
          </select>

          {/* Agent or Customer Due Alert Banner */}
          {activeCustomer && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded p-2 text-xs flex justify-between items-center text-slate-300">
              <div>
                <span className="font-semibold text-white block">{activeCustomer.name}</span>
                <span className="text-[11px] text-slate-400">{activeCustomer.phone}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">Previous Due</span>
                <span
                  className={`font-mono font-bold ${
                    activeCustomer.currentDue > 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {formatBDT(activeCustomer.currentDue)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Discount / Commission Controls */}
        <div className="pt-2 border-t border-slate-800">
          {isAgent ? (
            /* Dynamic Commission Box for Agent */
            <div className="bg-indigo-950/60 border border-indigo-800/80 rounded p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-indigo-200">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="font-semibold block">Agent Wholesale Commission</span>
                  <span className="text-[10px] text-indigo-300">বইয়ের পাইকারি কমিশন রেট</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={agentCommissionRate}
                  onChange={(e) => setAgentCommissionRate(parseFloat(e.target.value) || 0)}
                  className="w-14 bg-slate-900 border border-indigo-700 rounded px-2 py-1 text-center font-mono font-bold text-white text-xs focus:outline-none"
                />
                <span className="text-xs font-bold text-indigo-300">%</span>
              </div>
            </div>
          ) : (
            /* Smart Discount Box for Retail Customer */
            <div className="bg-slate-800/80 border border-slate-700 rounded p-2 text-xs flex items-center justify-between">
              <div className="flex items-center gap-1 text-slate-300">
                <Percent className="w-3.5 h-3.5 text-slate-400" />
                <span>Retail Smart Discount:</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded border border-slate-700 p-0.5 bg-slate-900 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setRetailDiscountMode("percent")}
                    className={`px-1.5 py-0.5 rounded ${
                      retailDiscountMode === "percent"
                        ? "bg-slate-700 text-white font-bold"
                        : "text-slate-400"
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setRetailDiscountMode("fixed")}
                    className={`px-1.5 py-0.5 rounded ${
                      retailDiscountMode === "fixed"
                        ? "bg-slate-700 text-white font-bold"
                        : "text-slate-400"
                    }`}
                  >
                    ৳
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  value={retailDiscountValue}
                  onChange={(e) => setRetailDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-center font-mono font-bold text-white text-xs focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div
        className={`flex-1 overflow-y-auto p-3 divide-y divide-slate-100 ${
          isMobile ? "max-h-[35vh]" : "max-h-[320px]"
        }`}
      >
        {recalculatedCart.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">Sales cart is empty.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Click any book or stationery to add.</p>
          </div>
        ) : (
          recalculatedCart.map((item) => (
            <div key={item.productId} className="py-2.5 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-slate-900 truncate">
                  {item.productName}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                  <span>MRP: {formatBDT(item.mrp)}</span>
                  {item.unitDiscount > 0 && (
                    <span className="text-slate-600">
                      - {formatBDT(item.unitDiscount)} = {formatBDT(item.unitPrice)}
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleUpdateQty(item.productId, -1)}
                  className={`${
                    isMobile ? "w-8 h-8 rounded-lg" : "w-6 h-6 rounded"
                  } bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95`}
                >
                  <Minus className={isMobile ? "w-4 h-4" : "w-3 h-3"} />
                </button>
                <span className="w-6 text-center font-mono font-bold text-xs text-slate-900">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateQty(item.productId, 1)}
                  className={`${
                    isMobile ? "w-8 h-8 rounded-lg" : "w-6 h-6 rounded"
                  } bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition active:scale-95`}
                >
                  <Plus className={isMobile ? "w-4 h-4" : "w-3 h-3"} />
                </button>
              </div>

              {/* Line Total & Remove */}
              <div className="text-right pl-2 shrink-0">
                <span className="font-mono font-bold text-xs text-slate-900 block">
                  {formatBDT(item.total)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFromCart(item.productId)}
                  className="text-[10px] text-rose-500 hover:text-rose-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pricing Calculation Summary */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal MRP (মোট গায়ের দাম):</span>
            <span className="font-mono font-medium">{formatBDT(subtotalMRP)}</span>
          </div>

          <div className="flex justify-between text-emerald-700">
            <span>
              {isAgent ? "Agent Commission (কমিশন ছাড়):" : "Total Discount (মোট ছাড়):"}
            </span>
            <span className="font-mono font-medium">- {formatBDT(totalDiscount)}</span>
          </div>

          <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
            <span>Net Payable (পরিশোধযোগ্য):</span>
            <span className="font-mono text-emerald-700">{formatBDT(payableAmount)}</span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="pt-2 border-t border-slate-200">
          <label className="text-[11px] font-medium text-slate-600 block mb-1">
            Payment Method (মূল্য পরিশোধ মাধ্যম):
          </label>
          <div className="grid grid-cols-5 gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("cash");
                setPaidAmountInput(payableAmount.toString());
              }}
              className={`py-1.5 rounded border text-center transition ${
                paymentMethod === "cash"
                  ? "bg-slate-900 text-white border-slate-900 font-bold"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              নগদ Cash
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("bkash");
                setPaidAmountInput(payableAmount.toString());
              }}
              className={`py-1.5 rounded border text-center transition ${
                paymentMethod === "bkash"
                  ? "bg-slate-900 text-white border-slate-900 font-bold"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              বিকাশ
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("nagad");
                setPaidAmountInput(payableAmount.toString());
              }}
              className={`py-1.5 rounded border text-center transition ${
                paymentMethod === "nagad"
                  ? "bg-slate-900 text-white border-slate-900 font-bold"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              নগদ MFS
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("rocket");
                setPaidAmountInput(payableAmount.toString());
              }}
              className={`py-1.5 rounded border text-center transition ${
                paymentMethod === "rocket"
                  ? "bg-slate-900 text-white border-slate-900 font-bold"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              রকেট
            </button>
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("due");
                setPaidAmountInput("0");
              }}
              className={`py-1.5 rounded border text-center transition ${
                paymentMethod === "due"
                  ? "bg-rose-900 text-white border-rose-900 font-bold"
                  : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
              }`}
            >
              বাকি Due
            </button>
          </div>
        </div>

        {/* Paid Amount Input & Due / Change Indicator */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[11px] font-medium text-slate-600 block mb-0.5">
              Paid Amount (জমা):
            </label>
            <input
              type="number"
              min="0"
              placeholder={payableAmount.toString()}
              value={paidAmountInput}
              onChange={(e) => setPaidAmountInput(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-700"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded p-1.5 flex flex-col justify-center text-right font-mono">
            {dueAmount > 0 ? (
              <div>
                <span className="text-[10px] text-rose-600 uppercase font-semibold block">
                  New Due (বাকি)
                </span>
                <span className="font-bold text-xs text-rose-700">
                  {formatBDT(dueAmount)}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-[10px] text-emerald-600 uppercase font-semibold block">
                  Change (ফেরত)
                </span>
                <span className="font-bold text-xs text-emerald-700">
                  {formatBDT(changeAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleQuickRoundOff}
            className="text-[11px] text-slate-600 hover:text-slate-900 underline flex items-center gap-1"
          >
            <Coins className="w-3 h-3 text-slate-400" />
            <span>Round-off ৳</span>
          </button>

          <input
            type="text"
            placeholder="Order note / মন্তব্য (ঐচ্ছিক)"
            value={saleNotes}
            onChange={(e) => setSaleNotes(e.target.value)}
            className="w-48 bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] text-slate-700 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
          {/* 58mm Thermal Print (Mobile / Mini Printer) */}
          <button
            type="button"
            onClick={() => handleCompleteSale("thermal")}
            disabled={recalculatedCart.length === 0}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded font-medium text-xs transition shadow-2xs active:scale-[0.98]"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mini Slip (58mm)</span>
          </button>

          {/* A4 Paper Print (Desktop / Web) */}
          <button
            type="button"
            onClick={() => handleCompleteSale("a4")}
            disabled={recalculatedCart.length === 0}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 text-white rounded font-medium text-xs transition shadow-2xs active:scale-[0.98]"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>A4 Invoice</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleCompleteSale("none")}
          disabled={recalculatedCart.length === 0}
          className="w-full py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700 disabled:text-slate-400 rounded text-[11px] font-medium transition active:scale-[0.98]"
        >
          Complete Sale (No Print)
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ================= LEFT SECTION: CATALOG & SEARCH (7 COLS) ================= */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Search and Filters Bar */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3">
            {/* Live Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleScanValue(searchQuery);
                    }
                  }}
                  placeholder="Search or scan barcode (USB scanner + Enter also works)..."
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-700 focus:bg-white transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                title="Scan barcode with camera"
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition"
              >
                <Camera className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Scan</span>
              </button>
            </div>

            {/* Category and Sub-filters */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Category Pills */}
              <div className="flex rounded-md border border-slate-200 p-0.5 bg-slate-100 text-xs">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1 rounded font-medium transition ${
                    selectedCategory === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  All Items
                </button>
                <button
                  onClick={() => setSelectedCategory("book")}
                  className={`flex items-center gap-1 px-3 py-1 rounded font-medium transition ${
                    selectedCategory === "book" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>Books (বই)</span>
                </button>
                <button
                  onClick={() => setSelectedCategory("stationery")}
                  className={`flex items-center gap-1 px-3 py-1 rounded font-medium transition ${
                    selectedCategory === "stationery" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5 text-blue-600" />
                  <span>Stationery</span>
                </button>
              </div>

              {/* Class Dropdown */}
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-700"
              >
                <option value="all">All Classes (সকল শ্রেণী)</option>
                <option value="Play / Nursery">Play / Nursery</option>
                <option value="Class 1">Class 1</option>
                <option value="Class 5">Class 5 (Primary)</option>
                <option value="Class 8">Class 8 (JSC)</option>
                <option value="Class 10 (SSC)">Class 9-10 (SSC)</option>
                <option value="HSC 1st Year">HSC 1st Year</option>
                <option value="HSC 2nd Year">HSC 2nd Year</option>
              </select>

              {/* Publisher Dropdown */}
              <select
                value={selectedPublisher}
                onChange={(e) => setSelectedPublisher(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-700"
              >
                <option value="all">All Publishers (সকল প্রকাশনী)</option>
                {publishers.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} {p.bengaliName ? `(${p.bengaliName})` : ""}
                  </option>
                ))}
              </select>

              {/* View Toggle (Table / Card) */}
              <div className="flex items-center gap-1 border border-slate-300 rounded p-0.5 bg-slate-100 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition ${
                    viewMode === "table"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Table View (টেবিল ভিউ)"
                >
                  <ListIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition ${
                    viewMode === "grid"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Card View (কার্ড ভিউ)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Card View</span>
                </button>
              </div>

              <span className="text-xs text-slate-500 font-mono">
                {filteredProducts.length} items
              </span>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No books or stationery found matching criteria.</p>
            </div>
          ) : viewMode === "table" ? (
            /* ================= TABLE VIEW (DEFAULT) ================= */
            <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden max-h-[620px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold border-b border-slate-200 z-10">
                  <tr>
                    <th className="p-2.5 w-12 text-center">Cover</th>
                    <th className="p-2.5">Title &amp; Bengali Name</th>
                    <th className="p-2.5">Class / Subject</th>
                    <th className="p-2.5">Publisher</th>
                    <th className="p-2.5 text-right">MRP</th>
                    <th className="p-2.5 text-center">Stock</th>
                    <th className="p-2.5 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const isOutOfStock = product.stockQty <= 0;
                    const isLowStock = product.stockQty <= product.minStockAlert;
                    const inCart = cart.find((i) => i.productId === product.id);

                    // Find matching publisher logo
                    const pubObj = publishers.find(
                      (p) =>
                        p.name.toLowerCase() === product.publisher?.toLowerCase() ||
                        p.code === product.publisher
                    );

                    return (
                      <tr
                        key={product.id}
                        onClick={() => !isOutOfStock && handleAddToCart(product)}
                        className={`transition cursor-pointer select-none hover:bg-slate-50/80 ${
                          isOutOfStock ? "opacity-60 bg-slate-50/40 cursor-not-allowed" : ""
                        }`}
                      >
                        {/* Optional Book Cover Image */}
                        <td className="p-2 text-center">
                          <div className="w-9 h-11 mx-auto rounded border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : product.category === "book" ? (
                              <BookOpen className="w-4 h-4 text-slate-400" />
                            ) : (
                              <PenTool className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </td>

                        {/* Title & Bengali */}
                        <td className="p-2.5">
                          <p className="font-semibold text-slate-900 leading-tight">
                            {product.name}
                          </p>
                          {product.bengaliName && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {product.bengaliName}
                            </p>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">
                            {product.barcode}
                          </span>
                        </td>

                        {/* Class & Subject */}
                        <td className="p-2.5 text-slate-600">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-700">
                            {product.category === "book" ? product.bookClass || "Book" : "Stationery"}
                          </span>
                          {product.subject && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{product.subject}</p>
                          )}
                        </td>

                        {/* Publisher with Brand Logo */}
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            {pubObj?.logoUrl && (
                              <img
                                src={pubObj.logoUrl}
                                alt={pubObj.name}
                                className="w-4 h-4 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <span className="text-[11px] font-medium text-slate-700 truncate max-w-[120px]">
                              {product.publisher || "-"}
                            </span>
                          </div>
                        </td>

                        {/* MRP */}
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatBDT(product.mrp)}
                        </td>

                        {/* Stock */}
                        <td className="p-2.5 text-center">
                          <span
                            className={`inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded ${
                              isOutOfStock
                                ? "bg-rose-100 text-rose-700"
                                : isLowStock
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {product.stockQty} {product.unit}
                          </span>
                        </td>

                        {/* Action / In Cart */}
                        <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          {inCart ? (
                            <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded px-2 py-1 font-mono text-[11px] font-semibold">
                              <span>In Cart: {inCart.quantity}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => handleAddToCart(product)}
                              className="px-3 py-1 rounded bg-slate-900 text-white text-[11px] font-medium hover:bg-slate-800 disabled:opacity-40 transition shadow-2xs inline-flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ================= CARD GRID VIEW ================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stockQty <= 0;
                const isLowStock = product.stockQty <= product.minStockAlert;
                const inCart = cart.find((i) => i.productId === product.id);
                const pubObj = publishers.find(
                  (p) =>
                    p.name.toLowerCase() === product.publisher?.toLowerCase() ||
                    p.code === product.publisher
                );

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && handleAddToCart(product)}
                    className={`bg-white p-3 rounded-lg border transition cursor-pointer select-none relative flex flex-col justify-between ${
                      isOutOfStock
                        ? "opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed"
                        : "hover:border-slate-400 hover:shadow-xs border-slate-200"
                    }`}
                  >
                    <div>
                      {/* Optional Image and Header */}
                      <div className="flex gap-2.5 mb-2">
                        {product.imageUrl && (
                          <div className="w-12 h-16 rounded border border-slate-200 bg-slate-100 overflow-hidden shrink-0">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                              {product.category === "book" ? product.bookClass || "Book" : "Stationery"}
                            </span>
                            {product.publisher && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-700 border border-slate-200">
                                {pubObj?.logoUrl && (
                                  <img
                                    src={pubObj.logoUrl}
                                    alt=""
                                    className="w-3 h-3 rounded-full object-cover"
                                  />
                                )}
                                <span>{product.publisher}</span>
                              </span>
                            )}
                          </div>

                          <h3 className="font-semibold text-xs text-slate-900 leading-snug line-clamp-2">
                            {product.name}
                          </h3>
                          {product.bengaliName && (
                            <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                              {product.bengaliName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pricing & Stock Footer */}
                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block text-[10px] uppercase">MRP</span>
                        <span className="font-bold text-sm font-mono text-slate-900">
                          {formatBDT(product.mrp)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded block ${
                            isOutOfStock
                              ? "bg-rose-100 text-rose-700"
                              : isLowStock
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          Stock: {product.stockQty} {product.unit}
                        </span>
                        {inCart && (
                          <span className="text-[10px] font-bold text-emerald-600">
                            In Cart: {inCart.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= RIGHT SECTION: SALES CART & REGISTER (DESKTOP) ================= */}
        <div className="hidden lg:flex lg:col-span-5 flex-col gap-3">
          {renderCartRegister(false)}
        </div>
      </div>

      {/* ================= MOBILE FLOATING STICKY CART BAR ================= */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in fade-in slide-in-from-bottom duration-200">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-700/80 flex items-center justify-between active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <ShoppingCart className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold font-mono flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-300 font-medium">
                  {cart.length} {cart.length === 1 ? "item" : "items"} in cart
                </div>
                <div className="text-sm font-bold font-mono text-emerald-400">
                  {formatBDT(payableAmount)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs">
              <span>View Cart & Pay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* ================= MOBILE SLIDE-UP BOTTOM SHEET CART DRAWER ================= */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            onClick={() => setIsMobileCartOpen(false)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[92vh] bg-white rounded-t-2xl shadow-2xl flex flex-col z-10 overflow-hidden animate-in slide-in-from-bottom duration-300 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="pt-2 pb-1 bg-slate-900 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderCartRegister(true)}
            </div>
          </div>
        </div>
      )}

      {/* ================= NEW CUSTOMER MODAL ================= */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-slate-800" />
                <h3 className="font-semibold text-sm text-slate-900">Add New Customer or Agent</h3>
              </div>
              <button
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Customer Type (গ্রাহকের ধরণ):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCustomerForm((p) => ({ ...p, type: "single" }))}
                    className={`py-2 rounded border text-center font-medium transition ${
                      newCustomerForm.type === "single"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-300"
                    }`}
                  >
                    Single Retail Customer (খুচরা)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCustomerForm((p) => ({ ...p, type: "agent" }))}
                    className={`py-2 rounded border text-center font-medium transition ${
                      newCustomerForm.type === "agent"
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-300"
                    }`}
                  >
                    Agent (পাইকারি বই বিক্রেতা)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Full Name / নাম:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sonargaon Book House or Rafiqul Islam"
                  value={newCustomerForm.name}
                  onChange={(e) =>
                    setNewCustomerForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Phone / মোবাইল নম্বর:</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 01712-XXXXXX"
                  value={newCustomerForm.phone}
                  onChange={(e) =>
                    setNewCustomerForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Shop Address / ঠিকানা:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Union Bazar, Thana Road"
                  value={newCustomerForm.address}
                  onChange={(e) =>
                    setNewCustomerForm((p) => ({ ...p, address: e.target.value }))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-700 focus:bg-white"
                />
              </div>

              {newCustomerForm.type === "agent" && (
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Default Wholesale Commission Rate (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={newCustomerForm.defaultCommissionRate}
                    onChange={(e) =>
                      setNewCustomerForm((p) => ({
                        ...p,
                        defaultCommissionRate: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-700"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Standard commission for Panjeree/Lecture guides is 25% to 35%.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-2xs"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <BarcodeScannerModal
          onDetected={(code) => {
            handleScanValue(code);
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}
