"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { Product } from "@/types";
import { formatBDT } from "@/utils/formatters";
import { generateBarcodeSVG } from "@/utils/barcode";
import {
  Barcode,
  Printer,
  Search,
  CheckSquare,
  Square,
  Plus,
  Minus,
  RefreshCw,
  Tag,
  BookOpen,
  Filter,
  Layers,
  Sliders,
  Sparkles,
  Info,
} from "lucide-react";

type LabelFormat = "price_tag" | "compact_sticker" | "a4_sheet";

interface PrintQueueItem {
  product: Product;
  quantity: number;
}

export function BarcodeGeneratorView() {
  const { products } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPublisher, setSelectedPublisher] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedStockStatus, setSelectedStockStatus] = useState<"all" | "in_stock" | "low" | "out">("all");
  const [selectedFormat, setSelectedFormat] = useState<LabelFormat>("price_tag");

  // Quantity applied when bulk-selecting (Select All / Select Low Stock)
  const [bulkQty, setBulkQty] = useState<number>(1);

  // Print Queue
  const [printQueue, setPrintQueue] = useState<Record<string, number>>({});

  // Display custom options
  const [showPrice, setShowPrice] = useState(true);
  const [showClassInfo, setShowClassInfo] = useState(true);
  const [customBarcodeText, setCustomBarcodeText] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customPrice, setCustomPrice] = useState<number>(100);

  // Available publishers from products
  const publishers = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.publisher) set.add(p.publisher);
    });
    return Array.from(set).sort();
  }, [products]);

  // Available book classes from products
  const bookClasses = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.bookClass) set.add(p.bookClass);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (selectedPublisher !== "all" && prod.publisher !== selectedPublisher) return false;
      if (selectedCategory !== "all" && prod.category !== selectedCategory) return false;
      if (selectedClass !== "all" && prod.bookClass !== selectedClass) return false;
      if (selectedStockStatus === "out" && prod.stockQty > 0) return false;
      if (selectedStockStatus === "low" && !(prod.stockQty > 0 && prod.stockQty <= prod.minStockAlert)) return false;
      if (selectedStockStatus === "in_stock" && prod.stockQty <= prod.minStockAlert) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(q);
        const matchesBengali = prod.bengaliName?.toLowerCase().includes(q) ?? false;
        const matchesBarcode = prod.barcode.toLowerCase().includes(q);
        const matchesClass = prod.bookClass?.toLowerCase().includes(q) ?? false;
        const matchesSubject = prod.subject?.toLowerCase().includes(q) ?? false;
        return matchesName || matchesBengali || matchesBarcode || matchesClass || matchesSubject;
      }
      return true;
    });
  }, [products, selectedPublisher, selectedCategory, selectedClass, selectedStockStatus, searchQuery]);

  // Queue helpers
  const handleToggleProduct = (productId: string) => {
    setPrintQueue((prev) => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = 1;
      }
      return next;
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setPrintQueue((prev) => {
      const current = prev[productId] || 0;
      const nextQty = Math.max(1, current + delta);
      return { ...prev, [productId]: nextQty };
    });
  };

  const handleSelectAllFiltered = () => {
    const qty = Math.max(1, bulkQty);
    const next: Record<string, number> = { ...printQueue };
    filteredProducts.forEach((p) => {
      next[p.id] = qty;
    });
    setPrintQueue(next);
  };

  const handleClearAllQueue = () => {
    setPrintQueue({});
  };

  const handleSelectLowStock = () => {
    const qty = Math.max(1, bulkQty);
    const next: Record<string, number> = {};
    products
      .filter((p) => p.stockQty <= p.minStockAlert)
      .forEach((p) => {
        next[p.id] = qty;
      });
    setPrintQueue(next);
  };

  // Compile list of total stickers to render
  const queueItems: PrintQueueItem[] = useMemo(() => {
    const list: PrintQueueItem[] = [];
    Object.entries(printQueue).forEach(([pId, qty]) => {
      const prod = products.find((p) => p.id === pId);
      if (prod && qty > 0) {
        list.push({ product: prod, quantity: qty });
      }
    });
    return list;
  }, [printQueue, products]);

  const totalLabelsToPrint = queueItems.reduce((acc, item) => acc + item.quantity, 0);

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Barcode className="w-5 h-5" />
            </span>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Barcode &amp; Price Tag Generator
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            বই, গাইড ও স্টেশনারি পণ্যের জন্য স্ক্যানযোগ্য বারকোড ও তাকের প্রাইস ট্যাগ স্টিকার প্রিন্ট করুন
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            disabled={totalLabelsToPrint === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition ${
              totalLabelsToPrint > 0
                ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95"
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print Labels ({totalLabelsToPrint})</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left selector & configuration, Right live print preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Selection & Controls */}
        <div className="lg:col-span-6 space-y-5">
          {/* Format & Style Customization Box */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>Label Format &amp; Appearance (স্টিকার লেআউট)</span>
              </div>
            </div>

            {/* Layout Mode selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedFormat("price_tag")}
                className={`p-2.5 rounded-lg border text-left transition ${
                  selectedFormat === "price_tag"
                    ? "bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Shelf Price Tag</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">তাকের মূল্য ট্যাগ (বড়)</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat("compact_sticker")}
                className={`p-2.5 rounded-lg border text-left transition ${
                  selectedFormat === "compact_sticker"
                    ? "bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Compact Barcode</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">থার্মাল রোল স্টিকার (38x25mm)</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat("a4_sheet")}
                className={`p-2.5 rounded-lg border text-left transition ${
                  selectedFormat === "a4_sheet"
                    ? "bg-emerald-50/70 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="font-semibold text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>A4 Sticker Grid</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">A4 পেপার শিট গ্রিড</div>
              </button>
            </div>

            {/* Checkbox Options */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>মূল্য (MRP ৳)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showClassInfo}
                  onChange={(e) => setShowClassInfo(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>শ্রেণী / প্রকাশনী তথ্য</span>
              </label>
            </div>
          </div>

          {/* Product Search & Selection List */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Select Books &amp; Items ({filteredProducts.length})
              </span>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-medium">Qty</span>
                  <input
                    type="number"
                    min={1}
                    value={bulkQty}
                    onChange={(e) => setBulkQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-11 py-1 px-1.5 text-[11px] text-center font-mono font-bold rounded border border-slate-200 focus:outline-emerald-500"
                    title="Quantity applied when using Select All / Select Low Stock"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSelectLowStock}
                  className="text-[11px] px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition font-medium"
                >
                  Select Low Stock
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-[11px] px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition font-medium"
                >
                  Select All
                </button>
                {Object.keys(printQueue).length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllQueue}
                    className="text-[11px] px-2 py-1 rounded text-rose-600 hover:bg-rose-50 transition font-medium"
                  >
                    Clear Queue
                  </button>
                )}
              </div>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative sm:col-span-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search book or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-emerald-500"
                />
              </div>

              <div>
                <select
                  value={selectedPublisher}
                  onChange={(e) => setSelectedPublisher(e.target.value)}
                  className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 text-slate-700 bg-white"
                >
                  <option value="all">All Publishers</option>
                  {publishers.map((pub) => (
                    <option key={pub} value={pub}>
                      {pub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 text-slate-700 bg-white"
                >
                  <option value="all">All Categories</option>
                  <option value="book">Books (বই)</option>
                  <option value="stationery">Stationery (স্টেশনারি)</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 text-slate-700 bg-white"
                >
                  <option value="all">All Classes (শ্রেণী)</option>
                  {bookClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedStockStatus}
                  onChange={(e) => setSelectedStockStatus(e.target.value as typeof selectedStockStatus)}
                  className="w-full py-1.5 px-2 text-xs rounded-lg border border-slate-200 text-slate-700 bg-white"
                >
                  <option value="all">All Stock Levels</option>
                  <option value="in_stock">In Stock (পর্যাপ্ত)</option>
                  <option value="low">Low Stock (কম)</option>
                  <option value="out">Out of Stock (নেই)</option>
                </select>
              </div>
            </div>

            {/* Product Scroll List */}
            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto border border-slate-100 rounded-lg">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  কোনো পণ্য পাওয়া যায়নি
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const isQueued = Boolean(printQueue[prod.id]);
                  const qty = printQueue[prod.id] || 0;

                  return (
                    <div
                      key={prod.id}
                      className={`flex items-center justify-between p-2.5 text-xs transition ${
                        isQueued ? "bg-emerald-50/50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div
                        onClick={() => handleToggleProduct(prod.id)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                      >
                        <button
                          type="button"
                          className="shrink-0 text-slate-400 hover:text-emerald-600"
                        >
                          {isQueued ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{prod.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            {prod.publisher && (
                              <span className="font-medium text-emerald-700">
                                {prod.publisher}
                              </span>
                            )}
                            {prod.bookClass && <span>• {prod.bookClass}</span>}
                            <span>• Barcode: {prod.barcode}</span>
                            <span>• MRP: {formatBDT(prod.mrp)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Controller */}
                      {isQueued && (
                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(prod.id, -1)}
                            className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold text-xs font-mono">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(prod.id, 1)}
                            className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Printable Preview */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800">
                  Print Preview (প্রিন্ট প্রিভিউ)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                  {totalLabelsToPrint} Labels Selected
                </span>
              </div>

              <div className="text-[11px] text-slate-400">
                Layout: <span className="font-semibold text-slate-700 capitalize">{selectedFormat.replace("_", " ")}</span>
              </div>
            </div>

            {/* Preview Canvas Container */}
            <div className="mt-3 p-4 bg-slate-100/70 rounded-xl border border-dashed border-slate-300 min-h-[420px] max-h-[600px] overflow-y-auto">
              {totalLabelsToPrint === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Barcode className="w-10 h-10 stroke-1 text-slate-300" />
                  <p className="text-xs">Select items from the list to preview printable tags</p>
                  <button
                    type="button"
                    onClick={handleSelectLowStock}
                    className="text-xs text-emerald-600 font-semibold hover:underline"
                  >
                    Quick Add Low Stock Books
                  </button>
                </div>
              ) : (
                <div
                  id="printable-labels-area"
                  className={
                    selectedFormat === "a4_sheet"
                      ? "grid grid-cols-4 sm:grid-cols-5 gap-2 bg-white p-4 shadow-xs rounded-lg"
                      : selectedFormat === "compact_sticker"
                      ? "flex flex-wrap gap-1.5 justify-center"
                      : "flex flex-wrap gap-2 justify-center"
                  }
                >
                  {queueItems.map(({ product, quantity }) => {
                    const barcodeRes = generateBarcodeSVG(product.barcode, {
                      height: selectedFormat === "compact_sticker" ? 26 : 30,
                      barWidth: 1.2,
                      showText: true,
                    });
                    // Force every barcode to render at the same fixed width regardless
                    // of how many digits/characters the underlying value has - otherwise
                    // longer barcodes come out wider (and their text looks bigger/smaller)
                    // than shorter ones.
                    const barcodeMaxWidth =
                      selectedFormat === "compact_sticker" ? 90 : selectedFormat === "a4_sheet" ? 95 : 118;
                    const scaledSvgXml = barcodeRes.svgXml.replace(
                      "<svg ",
                      `<svg style="width:100%;max-width:${barcodeMaxWidth}px;height:auto;display:block;" `
                    );

                    return Array.from({ length: quantity }).map((_, index) => (
                      <div
                        key={`${product.id}-${index}`}
                        className={`sticker-item bg-white border border-dashed border-slate-300 text-slate-900 leading-none transition ${
                          selectedFormat === "price_tag"
                            ? "w-[130px] p-1.5 flex flex-col"
                            : selectedFormat === "compact_sticker"
                            ? "w-[100px] p-1 flex flex-col items-center text-center"
                            : "w-[110px] p-1 flex flex-col"
                        }`}
                      >
                        {/* Product Title & Class Info */}
                        <div className="space-y-px">
                          <p className="text-[8px] font-bold text-slate-900 leading-none line-clamp-1">
                            {product.name}
                          </p>
                          {showClassInfo && (
                            <p className="text-[7px] text-slate-600 leading-none truncate">
                              {product.publisher} {product.bookClass ? `• ${product.bookClass}` : ""}
                            </p>
                          )}
                        </div>

                        {/* SVG Barcode Output */}
                        <div
                          className="flex justify-center overflow-hidden mt-0.5"
                          dangerouslySetInnerHTML={{ __html: scaledSvgXml }}
                        />

                        {/* Price */}
                        {showPrice && (
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[7px] font-semibold text-slate-500">MRP</span>
                            <span className="text-[10px] font-black text-slate-900 font-mono">
                              {formatBDT(product.mrp)}
                            </span>
                          </div>
                        )}
                      </div>
                    ));
                  })}
                </div>
              )}
            </div>

            {/* Print Note */}
            <div className="mt-3 flex items-start gap-2 p-2.5 bg-emerald-50 rounded-lg text-emerald-800 text-[11px]">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>
                <strong>Print Tip:</strong> Compatible with POS Thermal label printers (Xprinter, Gprinter) and standard desktop A4 sticker sheets. Set printer margins to "None" in your browser print dialog.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Print Media Stylesheet to print ONLY labels */}
      <style jsx global>{`
        .sticker-item {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-labels-area,
          #printable-labels-area * {
            visibility: visible;
          }
          #printable-labels-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            /* Force a plain flow layout for print regardless of screen layout
               (grid rows can split mid-cell across pages in some browsers) */
            display: flex !important;
            flex-wrap: wrap !important;
            align-content: flex-start !important;
            gap: 4px !important;
          }
          .sticker-item {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
