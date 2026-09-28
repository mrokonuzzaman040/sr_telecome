"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/context/StoreContext";
import { Publisher, Product } from "@/types";
import { formatBDT } from "@/utils/formatters";
import { fileToCompressedDataUrl } from "@/utils/image";
import {
  ArrowLeft,
  Building2,
  Pencil,
  Trash2,
  Plus,
  X,
  BookOpen,
  Save,
  Upload,
  Link as LinkIcon,
} from "lucide-react";

interface PublisherDetailViewProps {
  publisher: Publisher;
  onBack: () => void;
}

type ProductFormState = Omit<Product, "id" | "createdAt" | "updatedAt">;

const emptyProductForm = (publisherName: string, skuPrefix: string = "BK"): ProductFormState => ({
  name: "",
  bengaliName: "",
  category: "book",
  barcode: `894${Math.floor(1000 + Math.random() * 9000)}`,
  sku: `${skuPrefix}-${Math.floor(100 + Math.random() * 900)}`,
  publisher: publisherName,
  bookClass: "General",
  subject: "",
  editionYear: "2026",
  imageUrl: "",
  buyPrice: 0,
  mrp: 0,
  stockQty: 0,
  minStockAlert: 5,
  unit: "Piece",
});

export function PublisherDetailView({ publisher, onBack }: PublisherDetailViewProps) {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    updatePublisher,
    deletePublisher,
    currentUser,
    showConfirm,
    showAlert,
    settings,
  } = useStore();

  const isAdmin = currentUser?.role === "admin";

  // ---- Publisher edit state ----
  const [isEditingPublisher, setIsEditingPublisher] = useState(false);
  const [pubForm, setPubForm] = useState({
    name: publisher.name,
    bengaliName: publisher.bengaliName || "",
    code: publisher.code,
    phone: publisher.phone || "",
    address: publisher.address || "",
    logoUrl: publisher.logoUrl || "",
    notes: publisher.notes || "",
  });

  const handleStartEditPublisher = () => {
    setPubForm({
      name: publisher.name,
      bengaliName: publisher.bengaliName || "",
      code: publisher.code,
      phone: publisher.phone || "",
      address: publisher.address || "",
      logoUrl: publisher.logoUrl || "",
      notes: publisher.notes || "",
    });
    setIsEditingPublisher(true);
  };

  const handleSavePublisher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubForm.name.trim()) return;
    await updatePublisher(publisher.id, {
      name: pubForm.name.trim(),
      bengaliName: pubForm.bengaliName.trim() || undefined,
      code: pubForm.code.trim().toUpperCase(),
      phone: pubForm.phone.trim() || undefined,
      address: pubForm.address.trim() || undefined,
      logoUrl: pubForm.logoUrl.trim() || undefined,
      notes: pubForm.notes.trim() || undefined,
    });
    setIsEditingPublisher(false);
  };

  const handleDeletePublisher = async () => {
    const confirmed = await showConfirm(`Are you sure you want to delete publisher "${publisher.name}"?`, {
      title: "Delete Publisher",
      confirmText: "Delete",
      cancelText: "Cancel",
      isDestructive: true,
      type: "warning",
    });
    if (confirmed) {
      await deletePublisher(publisher.id);
      onBack();
    }
  };

  // ---- Book matching & list ----
  const isPublisherMatch = (prodPub?: string) => {
    if (!prodPub) return false;
    const p = prodPub.trim().toLowerCase();
    const n = publisher.name.trim().toLowerCase();
    const c = publisher.code.trim().toLowerCase();
    const b = (publisher.bengaliName || "").trim().toLowerCase();

    if (p === n || p === c || p === b) return true;
    const firstWord = n.split(" ")[0];
    if (p === firstWord || n.includes(p) || p.includes(firstWord)) return true;
    return false;
  };

  const books = useMemo(
    () => products.filter((p) => isPublisherMatch(p.publisher)),
    [products, publisher]
  );

  const totalStock = books.reduce((acc, b) => acc + b.stockQty, 0);

  // ---- Book add/edit modal ----
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm(publisher.name, settings.skuPrefix));

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

  const handleOpenAddBook = () => {
    setEditingProductId(null);
    setProductForm(emptyProductForm(publisher.name, settings.skuPrefix));
    setIsProductModalOpen(true);
  };

  const handleOpenEditBook = (book: Product) => {
    setEditingProductId(book.id);
    setProductForm({
      name: book.name,
      bengaliName: book.bengaliName || "",
      category: book.category,
      barcode: book.barcode,
      sku: book.sku,
      publisher: book.publisher || publisher.name,
      bookClass: book.bookClass || "General",
      subject: book.subject || "",
      editionYear: book.editionYear || "2026",
      imageUrl: book.imageUrl || "",
      buyPrice: book.buyPrice,
      mrp: book.mrp,
      stockQty: book.stockQty,
      minStockAlert: book.minStockAlert,
      unit: book.unit,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      showAlert("Please enter book/item name.", {
        title: "Missing Name",
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

  const handleDeleteBook = async (id: string, name: string) => {
    const confirmed = await showConfirm(`Are you sure you want to delete "${name}" from stock?`, {
      title: "Delete Item",
      confirmText: "Delete",
      cancelText: "Cancel",
      isDestructive: true,
      type: "warning",
    });
    if (confirmed) {
      deleteProduct(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4 select-none">
      {/* Back Nav */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>প্রকাশনী তালিকায় ফিরুন (Back to Publishers)</span>
      </button>

      {/* Publisher Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4">
        {!isEditingPublisher ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                {publisher.logoUrl ? (
                  <img src={publisher.logoUrl} alt={publisher.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">{publisher.name}</h1>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {publisher.bengaliName && <span>{publisher.bengaliName} • </span>}
                  Code: <span className="font-mono">{publisher.code}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  {publisher.phone || "—"} {publisher.address ? `• ${publisher.address}` : ""}
                </p>
                {publisher.notes && (
                  <p className="text-[11px] text-slate-400 italic mt-1">{publisher.notes}</p>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleStartEditPublisher}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeletePublisher}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-rose-600 hover:bg-rose-50 text-xs font-medium transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSavePublisher} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Publisher Name (English) *</label>
                <input
                  type="text"
                  required
                  value={pubForm.name}
                  onChange={(e) => setPubForm({ ...pubForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">প্রকাশনীর নাম (বাংলা)</label>
                <input
                  type="text"
                  value={pubForm.bengaliName}
                  onChange={(e) => setPubForm({ ...pubForm, bengaliName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  value={pubForm.code}
                  onChange={(e) => setPubForm({ ...pubForm, code: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={pubForm.phone}
                  onChange={(e) => setPubForm({ ...pubForm, phone: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={pubForm.address}
                onChange={(e) => setPubForm({ ...pubForm, address: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL</label>
              <input
                type="url"
                value={pubForm.logoUrl}
                onChange={(e) => setPubForm({ ...pubForm, logoUrl: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
              <textarea
                rows={2}
                value={pubForm.notes}
                onChange={(e) => setPubForm({ ...pubForm, notes: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingPublisher(false)}
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Total Titles
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">{books.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Total Stock Units
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">{totalStock}</span>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Books &amp; Items ({books.length})
          </h3>
          <button
            type="button"
            onClick={handleOpenAddBook}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Item</span>
          </button>
        </div>

        {books.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">No books cataloged under this publisher yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Click &quot;Add Item&quot; to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2 px-3">Image</th>
                  <th className="py-2 px-3">Name</th>
                  <th className="py-2 px-3">Class</th>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3 text-right">MRP</th>
                  <th className="py-2 px-3 text-right">Stock</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2 px-3">
                      <div className="w-9 h-11 rounded border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                        {book.imageUrl ? (
                          <img
                            src={book.imageUrl}
                            alt={book.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <BookOpen className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <p className="font-semibold text-slate-900">{book.name}</p>
                      {book.bengaliName && <p className="text-[11px] text-slate-500">{book.bengaliName}</p>}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{book.bookClass || "General"}</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{book.sku}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatBDT(book.mrp)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          book.stockQty <= book.minStockAlert
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {book.stockQty} {book.unit}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditBook(book)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="Edit item"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBook(book.id, book.name)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Book Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm">
                {editingProductId ? "Edit Item" : "Add New Item"} — {publisher.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="p-5 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name (English) *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বাংলা নাম</label>
                <input
                  type="text"
                  value={productForm.bengaliName}
                  onChange={(e) => setProductForm({ ...productForm, bengaliName: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class</label>
                  <input
                    type="text"
                    value={productForm.bookClass}
                    onChange={(e) => setProductForm({ ...productForm, bookClass: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Edition Year</label>
                  <input
                    type="text"
                    value={productForm.editionYear}
                    onChange={(e) => setProductForm({ ...productForm, editionYear: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Cover Image / প্রচ্ছদ ছবি (Optional)
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
                      onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Buy Price (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.buyPrice}
                    onChange={(e) => setProductForm({ ...productForm, buyPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">MRP (৳)</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.mrp}
                    onChange={(e) => setProductForm({ ...productForm, mrp: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stockQty}
                    onChange={(e) => setProductForm({ ...productForm, stockQty: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition shadow-2xs"
                >
                  {editingProductId ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
