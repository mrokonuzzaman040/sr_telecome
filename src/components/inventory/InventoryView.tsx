"use client";

import React, { useState, useMemo } from "react";
import { Product, BookPublisher, BookClass, ProductCategory } from "@/types";
import { useStore } from "@/context/StoreContext";
import { formatBDT } from "@/utils/formatters";
import { fileToCompressedDataUrl } from "@/utils/image";
import {
  Search,
  Plus,
  BookOpen,
  PenTool,
  AlertTriangle,
  Edit3,
  Trash2,
  PackagePlus,
  X,
  Layers,
  Check,
  FileSpreadsheet,
  Upload,
  Link as LinkIcon,
} from "lucide-react";
import { BulkUploadModal } from "./BulkUploadModal";

export function InventoryView() {
  const { products, addProduct, updateProduct, deleteProduct, restockProduct, publishers, settings, showAlert, showConfirm } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ProductCategory>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [publisherFilter, setPublisherFilter] = useState<string>("all");
  const [stockStatusFilter, setStockStatusFilter] = useState<"all" | "low" | "out">("all");
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Add/Edit Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<Omit<Product, "id" | "createdAt" | "updatedAt">>({
    name: "",
    bengaliName: "",
    category: "book",
    barcode: "",
    sku: "",
    publisher: "Panjeree",
    bookClass: "Class 10 (SSC)",
    subject: "",
    editionYear: "2026",
    imageUrl: "",
    buyPrice: 0,
    mrp: 0,
    stockQty: 0,
    minStockAlert: 5,
    unit: "Piece",
  });

  // Restock Modal State
  const [restockItem, setRestockItem] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState<number>(10);
  const [restockBuyPrice, setRestockBuyPrice] = useState<number>(0);

  // Cover Image Input Mode (Upload File or Paste URL)
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [isImageUploading, setIsImageUploading] = useState(false);

  const handleCoverImageFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showAlert("Please select a valid image file.", { type: "warning" });
      return;
    }
    setIsImageUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setProductForm((p) => ({ ...p, imageUrl: dataUrl }));
    } catch (err) {
      showAlert("Failed to load the selected image. Please try another file.", { type: "error" });
    } finally {
      setIsImageUploading(false);
    }
  };

  // Helper for flexible publisher matching
  const isPublisherMatch = (prodPub?: string, selectedFilter?: string) => {
    if (!selectedFilter || selectedFilter === "all") return true;
    if (!prodPub) return false;

    const p = prodPub.trim().toLowerCase();
    const f = selectedFilter.trim().toLowerCase();
    if (p === f) return true;

    // Check publishers in store
    const pubObj = publishers.find(
      (item) =>
        item.name.toLowerCase() === f ||
        item.code.toLowerCase() === f ||
        item.id.toLowerCase() === f ||
        (item.bengaliName && item.bengaliName.toLowerCase() === f)
    );

    if (pubObj) {
      const oName = pubObj.name.toLowerCase();
      const oCode = pubObj.code.toLowerCase();
      const oBengali = (pubObj.bengaliName || "").toLowerCase();
      const oFirst = oName.split(" ")[0];

      if (
        p === oName ||
        p === oCode ||
        p === oBengali ||
        p === oFirst ||
        oName.includes(p) ||
        p.includes(oFirst) ||
        p.includes(oCode)
      ) {
        return true;
      }
    }

    return p.includes(f) || f.includes(p);
  };

  // Dynamically collect all available book classes from products & standard classes
  const availableClasses = useMemo(() => {
    const defaultClasses = [
      "Play / Nursery",
      "Class 1",
      "Class 2",
      "Class 3",
      "Class 4",
      "Class 5",
      "Class 6",
      "Class 7",
      "Class 8",
      "Class 9",
      "Class 10 (SSC)",
      "HSC 1st Year",
      "HSC 2nd Year",
      "Degree / Honours",
      "General",
    ];
    const set = new Set<string>(defaultClasses);
    products.forEach((p) => {
      if (p.bookClass && p.bookClass.trim()) {
        set.add(p.bookClass.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (categoryFilter !== "all" && prod.category !== categoryFilter) return false;

      // Class Filter
      if (classFilter !== "all") {
        if (!prod.bookClass) return false;
        if (prod.bookClass.trim().toLowerCase() !== classFilter.trim().toLowerCase()) return false;
      }

      // Publisher Filter
      if (publisherFilter !== "all") {
        if (!isPublisherMatch(prod.publisher, publisherFilter)) return false;
      }

      // Stock Alerts
      if (stockStatusFilter === "low" && prod.stockQty > prod.minStockAlert) return false;
      if (stockStatusFilter === "out" && prod.stockQty > 0) return false;

      // Search Query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = prod.name.toLowerCase().includes(query);
        const matchesBengali = prod.bengaliName?.toLowerCase().includes(query) ?? false;
        const matchesBarcode = prod.barcode.toLowerCase().includes(query);
        const matchesSku = prod.sku.toLowerCase().includes(query);
        const matchesPublisher = prod.publisher?.toLowerCase().includes(query) ?? false;
        const matchesClass = prod.bookClass?.toLowerCase().includes(query) ?? false;
        return (
          matchesName ||
          matchesBengali ||
          matchesBarcode ||
          matchesSku ||
          matchesPublisher ||
          matchesClass
        );
      }
      return true;
    });
  }, [products, categoryFilter, classFilter, publisherFilter, stockStatusFilter, searchQuery, publishers]);

  // Check if any filter is active
  const isAnyFilterActive =
    categoryFilter !== "all" ||
    classFilter !== "all" ||
    publisherFilter !== "all" ||
    stockStatusFilter !== "all" ||
    searchQuery.trim() !== "";

  const handleClearFilters = () => {
    setCategoryFilter("all");
    setClassFilter("all");
    setPublisherFilter("all");
    setStockStatusFilter("all");
    setSearchQuery("");
  };

  // Aggregate Metrics
  const totalStockUnits = products.reduce((acc, p) => acc + p.stockQty, 0);
  const totalValuationCost = products.reduce((acc, p) => acc + p.stockQty * p.buyPrice, 0);
  const totalValuationMRP = products.reduce((acc, p) => acc + p.stockQty * p.mrp, 0);
  const lowStockCount = products.filter((p) => p.stockQty <= p.minStockAlert).length;

  const handleOpenAddModal = () => {
    setEditingProductId(null);
    setProductForm({
      name: "",
      bengaliName: "",
      category: "book",
      barcode: `894${Math.floor(1000 + Math.random() * 9000)}`,
      sku: `${settings.skuPrefix || "BK"}-${Math.floor(100 + Math.random() * 900)}`,
      publisher: publishers[0]?.name || "Panjeree",
      bookClass: "Class 10 (SSC)",
      subject: "",
      editionYear: "2026",
      imageUrl: "",
      buyPrice: 0,
      mrp: 0,
      stockQty: 10,
      minStockAlert: 5,
      unit: "Piece",
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      bengaliName: product.bengaliName || "",
      category: product.category,
      barcode: product.barcode,
      sku: product.sku,
      publisher: product.publisher || "Panjeree",
      bookClass: product.bookClass || "General",
      subject: product.subject || "",
      editionYear: product.editionYear || "2026",
      imageUrl: product.imageUrl || "",
      buyPrice: product.buyPrice,
      mrp: product.mrp,
      stockQty: product.stockQty,
      minStockAlert: product.minStockAlert,
      unit: product.unit,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showAlert("Please enter product name.", {
        title: "Missing Product Name",
        type: "warning",
      });
      return;
    }

    if (editingProductId) {
      updateProduct(editingProductId, productForm);
    } else {
      addProduct(productForm);
    }
    setIsProductModalOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm(`Are you sure you want to delete "${name}" from stock?`, {
      title: "Delete Product",
      confirmText: "Delete",
      cancelText: "Cancel",
      isDestructive: true,
      type: "warning",
    });
    if (confirmed) {
      deleteProduct(id);
    }
  };

  const handleOpenRestock = (product: Product) => {
    setRestockItem(product);
    setRestockQty(10);
    setRestockBuyPrice(product.buyPrice);
  };

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;
    if (restockQty <= 0) {
      showAlert("Please enter valid restock quantity.", {
        title: "Invalid Quantity",
        type: "warning",
      });
      return;
    }
    restockProduct(restockItem.id, restockQty, restockBuyPrice > 0 ? restockBuyPrice : undefined);
    setRestockItem(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Catalog Products (আইটেম সংখ্যা)
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {products.length} Products ({totalStockUnits} Units)
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Inventory Valuation (ক্রয় মূল্য)
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {formatBDT(totalValuationCost)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Valuation at MRP (বিক্রয় মূল্য)
          </span>
          <span className="font-bold text-lg font-mono text-emerald-700 mt-1 block">
            {formatBDT(totalValuationMRP)}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-amber-600 uppercase tracking-wider font-semibold block">
            Low Stock Alerts (কম স্টক সতর্কতা)
          </span>
          <span className="font-bold text-lg font-mono text-amber-700 mt-1 block">
            {lowStockCount} Items
          </span>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search catalog by name, বাংলা নাম, barcode or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-700 focus:bg-white"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="all">All Categories (সব ক্যাটাগরি)</option>
            <option value="book">Books (বই)</option>
            <option value="stationery">Stationery (স্টেশনারি)</option>
          </select>

          {/* Class */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="all">All Classes (সব শ্রেণী)</option>
            {availableClasses.map((cls) => {
              const count = products.filter(
                (p) => p.bookClass && p.bookClass.trim().toLowerCase() === cls.toLowerCase()
              ).length;
              return (
                <option key={cls} value={cls}>
                  {cls} {count > 0 ? `(${count})` : ""}
                </option>
              );
            })}
          </select>

          {/* Publisher */}
          <select
            value={publisherFilter}
            onChange={(e) => setPublisherFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500 max-w-[200px]"
          >
            <option value="all">All Publishers (সকল প্রকাশনী)</option>
            {publishers.map((p) => {
              const count = products.filter((prod) => isPublisherMatch(prod.publisher, p.name)).length;
              return (
                <option key={p.id} value={p.name}>
                  {p.name} {p.bengaliName ? `(${p.bengaliName})` : ""} {count > 0 ? `(${count})` : ""}
                </option>
              );
            })}
          </select>

          {/* Stock Alerts */}
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="all">All Stock Status (স্টক অবস্থা)</option>
            <option value="low">Low Stock (&lt;= Alert)</option>
            <option value="out">Out of Stock (0)</option>
          </select>

          {/* Clear Filters Button */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-medium transition"
              title="Reset all search & category filters"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          )}

          {/* Bulk Import Button */}
          <button
            type="button"
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded font-medium shadow-2xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bulk Import (CSV)</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">Cover</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3">Class / Category</th>
                <th className="py-2.5 px-3">Publisher</th>
                <th className="py-2.5 px-3">SKU / Barcode</th>
                <th className="py-2.5 px-3 text-right">Cost (ক্রয়)</th>
                <th className="py-2.5 px-3 text-right">MRP (গায়ের দর)</th>
                <th className="py-2.5 px-3 text-center">Available Stock</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isOutOfStock = prod.stockQty <= 0;
                  const isLowStock = prod.stockQty <= prod.minStockAlert;
                  const pubObj = publishers.find(
                    (p) =>
                      p.name.toLowerCase() === prod.publisher?.toLowerCase() ||
                      p.code === prod.publisher
                  );

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition">
                      {/* Book Cover Image */}
                      <td className="py-2 px-3 text-center">
                        <div className="w-9 h-11 mx-auto rounded border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : prod.category === "book" ? (
                            <BookOpen className="w-4 h-4 text-slate-400" />
                          ) : (
                            <PenTool className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{prod.name}</div>
                        {prod.bengaliName && (
                          <div className="text-[11px] text-slate-500">{prod.bengaliName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {prod.category === "book" ? prod.bookClass || "Book" : "Stationery"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {prod.publisher ? (
                          <div className="flex items-center gap-1.5">
                            {pubObj?.logoUrl && (
                              <img
                                src={pubObj.logoUrl}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-700">
                              {prod.publisher}
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        <div>{prod.sku}</div>
                        <div className="text-[10px] text-slate-400">{prod.barcode}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatBDT(prod.buyPrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatBDT(prod.mrp)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`font-mono text-xs px-2 py-0.5 rounded font-bold inline-block ${
                            isOutOfStock
                              ? "bg-rose-100 text-rose-800"
                              : isLowStock
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {prod.stockQty} {prod.unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick Restock */}
                          <button
                            onClick={() => handleOpenRestock(prod)}
                            className="p-1 rounded hover:bg-slate-200 text-emerald-700 transition"
                            title="Restock / Add Quantity"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-700 transition"
                            title="Edit Product"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(prod.id, prod.name)}
                            className="p-1 rounded hover:bg-slate-200 text-rose-600 transition"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ================= ADD / EDIT PRODUCT MODAL ================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-slate-800" />
                <h3 className="font-semibold text-sm text-slate-900">
                  {editingProductId ? "Edit Item in Catalog" : "Add New Book or Stationery"}
                </h3>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Item Category:</label>
                  <select
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm((p) => ({ ...p, category: e.target.value as any }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="book">Book (বই)</option>
                    <option value="stationery">Stationery (স্টেশনারি)</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Unit:</label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="Piece">Piece (পিস)</option>
                    <option value="Dozen">Dozen (ডজন)</option>
                    <option value="Box">Box (বক্স)</option>
                    <option value="Pkt">Packet (প্যাকেট)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Product Name (English):
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Panjeree SSC Higher Math Guide"
                  value={productForm.name}
                  onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  বাংলা নাম (ঐচ্ছিক):
                </label>
                <input
                  type="text"
                  placeholder="যেমন: পাঞ্জেরী এস.এস.সি উচ্চতর গণিত গাইড"
                  value={productForm.bengaliName || ""}
                  onChange={(e) =>
                    setProductForm((p) => ({ ...p, bengaliName: e.target.value }))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                />
              </div>

              {productForm.category === "book" && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Class / শ্রেণী:</label>
                    <select
                      value={productForm.bookClass || "Class 10 (SSC)"}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, bookClass: e.target.value as any }))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none"
                    >
                      <option value="Play / Nursery">Play / Nursery</option>
                      <option value="Class 1">Class 1</option>
                      <option value="Class 2">Class 2</option>
                      <option value="Class 3">Class 3</option>
                      <option value="Class 4">Class 4</option>
                      <option value="Class 5">Class 5</option>
                      <option value="Class 6">Class 6</option>
                      <option value="Class 7">Class 7</option>
                      <option value="Class 8">Class 8</option>
                      <option value="Class 9">Class 9</option>
                      <option value="Class 10 (SSC)">Class 10 (SSC)</option>
                      <option value="HSC 1st Year">HSC 1st Year</option>
                      <option value="HSC 2nd Year">HSC 2nd Year</option>
                      <option value="Degree / Honours">Degree / Honours</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Publisher:</label>
                    <select
                      value={productForm.publisher || "Panjeree"}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, publisher: e.target.value as any }))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 focus:outline-none"
                    >
                      {publishers.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Edition Year:</label>
                    <input
                      type="text"
                      placeholder="2026"
                      value={productForm.editionYear || "2026"}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, editionYear: e.target.value }))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-center focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Cover Image: Upload or URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700">
                    Book Cover Image / প্রচ্ছদ ছবি (Optional):
                  </label>
                  <div className="flex gap-1 bg-slate-100 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setImageInputMode("upload")}
                      className={`px-2 py-0.5 text-[11px] rounded flex items-center gap-1 font-medium transition ${
                        imageInputMode === "upload" ? "bg-white shadow-2xs text-slate-900" : "text-slate-500"
                      }`}
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode("url")}
                      className={`px-2 py-0.5 text-[11px] rounded flex items-center gap-1 font-medium transition ${
                        imageInputMode === "url" ? "bg-white shadow-2xs text-slate-900" : "text-slate-500"
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" /> URL
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  {imageInputMode === "upload" ? (
                    <input
                      key="upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCoverImageFile(e.target.files?.[0])}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:bg-white file:mr-2 file:px-2 file:py-0.5 file:rounded file:border-0 file:bg-slate-900 file:text-white file:text-[11px]"
                    />
                  ) : (
                    <input
                      key="url"
                      type="url"
                      placeholder="https://... cover image url (ঐচ্ছিক)"
                      value={productForm.imageUrl || ""}
                      onChange={(e) =>
                        setProductForm((p) => ({ ...p, imageUrl: e.target.value }))
                      }
                      className="flex-1 bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                    />
                  )}
                  {isImageUploading && (
                    <span className="text-[10px] text-slate-500 shrink-0">Processing…</span>
                  )}
                  {productForm.imageUrl && !isImageUploading && (
                    <div className="w-8 h-10 rounded border border-slate-200 overflow-hidden shrink-0 bg-slate-50">
                      <img
                        src={productForm.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Buy Price (ক্রয়):</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.buyPrice}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        buyPrice: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono text-center font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">MRP (গায়ের দর):</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.mrp}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        mrp: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono text-center font-bold text-emerald-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Stock Units:</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.stockQty}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        stockQty: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono text-center focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700 block mb-1">Low Alert Limit:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={productForm.minStockAlert}
                    onChange={(e) =>
                      setProductForm((p) => ({
                        ...p,
                        minStockAlert: parseInt(e.target.value) || 5,
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono text-center focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium shadow-2xs"
                >
                  {editingProductId ? "Update Item" : "Save to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= RESTOCK MODAL ================= */}
      {restockItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-700" />
                <h3 className="font-semibold text-sm text-slate-900">Restock Product</h3>
              </div>
              <button
                onClick={() => setRestockItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-semibold text-slate-900">{restockItem.name}</p>
              <p className="text-slate-500">Current In Stock: {restockItem.stockQty} {restockItem.unit}</p>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Add Quantity ({restockItem.unit}):
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockQty}
                  onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono font-bold text-center text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Buy Price per Unit (নতুন ক্রয় দর - ঐচ্ছিক):
                </label>
                <input
                  type="number"
                  min="0"
                  value={restockBuyPrice}
                  onChange={(e) => setRestockBuyPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono text-center text-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRestockItem(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium shadow-2xs"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload CSV Modal */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
      />
    </div>
  );
}
