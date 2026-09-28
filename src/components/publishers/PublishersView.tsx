"use client";

import React, { useState, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { fileToCompressedDataUrl } from "@/utils/image";
import { PublisherDetailView } from "./PublisherDetailView";
import {
  Building2,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  X,
  BookOpen,
  LayoutGrid,
  List,
  Upload,
  Link as LinkIcon,
} from "lucide-react";

export function PublishersView() {
  const { publishers, addPublisher, deletePublisher, products, currentUser, showConfirm, showAlert } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [logoInputMode, setLogoInputMode] = useState<"upload" | "url">("url");
  const [isLogoUploading, setIsLogoUploading] = useState(false);

  // When set, replaces the list with a full detail page for this publisher
  const [viewingPublisherId, setViewingPublisherId] = useState<string | null>(null);
  const viewingPublisher = publishers.find((p) => p.id === viewingPublisherId) || null;

  const [form, setForm] = useState<{
    name: string;
    bengaliName: string;
    code: string;
    phone: string;
    address: string;
    logoUrl: string;
    notes: string;
  }>({
    name: "",
    bengaliName: "",
    code: "",
    phone: "",
    address: "",
    logoUrl: "",
    notes: "",
  });

  const presetLogos = [
    { label: "Panjeree Style", url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=120&h=120&fit=crop&q=80" },
    { label: "Lecture Style", url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=120&h=120&fit=crop&q=80" },
    { label: "Anupam Style", url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=120&h=120&fit=crop&q=80" },
    { label: "Jupiter Style", url: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=120&h=120&fit=crop&q=80" },
    { label: "Board / NCTB", url: "https://images.unsplash.com/photo-1532012164546-f432f2e37b73?w=120&h=120&fit=crop&q=80" },
    { label: "Literature Press", url: "https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=120&h=120&fit=crop&q=80" },
  ];

  // Robust publisher matching helper
  const isPublisherMatch = (prodPub?: string, pubName?: string, pubCode?: string, pubBengali?: string) => {
    if (!prodPub) return false;
    const p = prodPub.trim().toLowerCase();
    const n = (pubName || "").trim().toLowerCase();
    const c = (pubCode || "").trim().toLowerCase();
    const b = (pubBengali || "").trim().toLowerCase();

    if (p === n || p === c || p === b) return true;
    const firstWord = n.split(" ")[0];
    if (p === firstWord || n.includes(p) || p.includes(firstWord)) return true;
    return false;
  };

  // Filtered Publishers
  const filteredPublishers = useMemo(() => {
    return publishers.filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.bengaliName && p.bengaliName.toLowerCase().includes(q)) ||
        p.code.toLowerCase().includes(q) ||
        (p.address && p.address.toLowerCase().includes(q))
      );
    });
  }, [publishers, searchQuery]);

  // Aggregate stats across publishers
  const totalBooksLinked = useMemo(() => {
    return products.filter((p) =>
      publishers.some((pub) => isPublisherMatch(p.publisher, pub.name, pub.code, pub.bengaliName))
    ).length;
  }, [products, publishers]);

  const handleOpenModal = () => {
    setForm({
      name: "",
      bengaliName: "",
      code: "",
      phone: "",
      address: "বাংলাবাজার, ঢাকা",
      logoUrl: presetLogos[0].url,
      notes: "",
    });
    setIsModalOpen(true);
    setStatusMsg("");
    setLogoInputMode("url");
  };

  const handleLogoFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showAlert("Please select a valid image file.", { type: "warning" });
      return;
    }
    setIsLogoUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 300, 0.85);
      setForm((f) => ({ ...f, logoUrl: dataUrl }));
    } catch (err) {
      showAlert("Failed to load the selected image. Please try another file.", { type: "error" });
    } finally {
      setIsLogoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setSubmitting(true);
    try {
      await addPublisher({
        name: form.name.trim(),
        bengaliName: form.bengaliName.trim() || undefined,
        code: form.code.trim().toUpperCase() || form.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8),
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });

      setStatusMsg("প্রকাশনী সফলভাবে যুক্ত হয়েছে!");
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitting(false);
      }, 600);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await showConfirm(`Are you sure you want to delete publisher "${name}"?`, {
      title: "Delete Publisher",
      confirmText: "Delete",
      cancelText: "Cancel",
      isDestructive: true,
      type: "warning",
    });
    if (confirmed) {
      await deletePublisher(id);
    }
  };

  if (viewingPublisher) {
    return (
      <PublisherDetailView
        publisher={viewingPublisher}
        onBack={() => setViewingPublisherId(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4 select-none">
      {/* Page Title & Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">
            প্রকাশনী ও ব্র্যান্ড (Publishers &amp; Brands)
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            প্রকাশনী তালিকা, যোগাযোগ ও সংযুক্ত বইয়ের সংখ্যা
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition font-medium text-xs shadow-2xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>নতুন প্রকাশনী</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Total Publishers
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {publishers.length}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Linked Books
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {totalBooksLinked}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
            Avg. Titles / House
          </span>
          <span className="font-bold text-lg font-mono text-slate-900 mt-1 block">
            {Math.round(totalBooksLinked / (publishers.length || 1))}
          </span>
        </div>
      </div>

      {/* Search, Counter & View Mode Toolbar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search publishers by name, বাংলা নাম, code, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 focus:bg-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Tools: Count & View Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-xs text-slate-500 font-mono font-medium hidden sm:inline">
            Showing {filteredPublishers.length} of {publishers.length}
          </span>

          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded transition ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded transition ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredPublishers.map((pub) => {
            const bookCount = products.filter((p) =>
              isPublisherMatch(p.publisher, pub.name, pub.code, pub.bengaliName)
            ).length;

            return (
              <button
                type="button"
                key={pub.id}
                onClick={() => setViewingPublisherId(pub.id)}
                className="text-left bg-white rounded-lg border border-slate-200 p-3 shadow-2xs hover:border-slate-300 hover:shadow-xs transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-md border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                    {pub.logoUrl ? (
                      <img
                        src={pub.logoUrl}
                        alt={pub.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Building2 className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-xs text-slate-900 truncate" title={pub.name}>
                      {pub.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      {pub.bengaliName || pub.code}
                    </p>
                  </div>

                  {currentUser?.role === "admin" && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(pub.id, pub.name);
                      }}
                      className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                      title="Delete publisher"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate font-mono">{pub.phone || "—"}</span>
                  <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-700 shrink-0">
                    <BookOpen className="w-3 h-3 text-slate-400" />
                    {bookCount}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Publisher / House</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-4">Address</th>
                  <th className="py-2.5 px-3 text-center">Catalog Books</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPublishers.map((pub) => {
                  const bookCount = products.filter((p) =>
                    isPublisherMatch(p.publisher, pub.name, pub.code, pub.bengaliName)
                  ).length;

                  return (
                    <tr key={pub.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                            {pub.logoUrl ? (
                              <img
                                src={pub.logoUrl}
                                alt={pub.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{pub.name}</p>
                            {pub.bengaliName && (
                              <p className="text-[11px] text-slate-500">{pub.bengaliName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                        {pub.code}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono">
                        {pub.phone || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 truncate max-w-[200px]">
                        {pub.address || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        <button
                          type="button"
                          onClick={() => setViewingPublisherId(pub.id)}
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 transition"
                        >
                          {bookCount} Titles
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingPublisherId(pub.id)}
                            className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition"
                          >
                            বই দেখুন
                          </button>
                          {currentUser?.role === "admin" && (
                            <button
                              type="button"
                              onClick={() => handleDelete(pub.id, pub.name)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete publisher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Publisher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-sm sm:text-base">
                  নতুন প্রকাশনী যোগ করুন (Add Publisher)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {statusMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{statusMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publisher Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Panjeree Publications"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    প্রকাশনীর নাম (বাংলা)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. পাঞ্জেরী পাবলিকেশন্স"
                    value={form.bengaliName}
                    onChange={(e) => setForm({ ...form, bengaliName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publisher Code / Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PANJEREE"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone / যোগাযোগ নম্বর
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 02-9568741 or 01712..."
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ঠিকানা (Banglabazar / Press Address)
                </label>
                <input
                  type="text"
                  placeholder="e.g. বাংলাবাজার, ঢাকা-১১০০"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                />
              </div>

              {/* Logo: Upload or URL, with Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Publisher Brand Logo
                  </label>
                  <div className="flex gap-1 bg-slate-100 rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setLogoInputMode("upload")}
                      className={`px-2 py-0.5 text-[11px] rounded flex items-center gap-1 font-medium transition ${
                        logoInputMode === "upload" ? "bg-white shadow-2xs text-slate-900" : "text-slate-500"
                      }`}
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoInputMode("url")}
                      className={`px-2 py-0.5 text-[11px] rounded flex items-center gap-1 font-medium transition ${
                        logoInputMode === "url" ? "bg-white shadow-2xs text-slate-900" : "text-slate-500"
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" /> URL
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  {logoInputMode === "upload" ? (
                    <input
                      key="upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoFile(e.target.files?.[0])}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500 file:mr-2 file:px-2 file:py-0.5 file:rounded file:border-0 file:bg-slate-900 file:text-white file:text-[11px]"
                    />
                  ) : (
                    <input
                      key="url"
                      type="url"
                      placeholder="https://... logo image link"
                      value={form.logoUrl}
                      onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                    />
                  )}
                  {isLogoUploading && (
                    <span className="text-[10px] text-slate-500 shrink-0">Processing…</span>
                  )}
                  {form.logoUrl && !isLogoUploading && (
                    <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden shrink-0 bg-slate-50">
                      <img src={form.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Preset Logos */}
                <div className="mt-2">
                  <span className="text-[10px] text-slate-500 block mb-1">Choose a preset theme:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {presetLogos.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => {
                          setForm({ ...form, logoUrl: preset.url });
                          setLogoInputMode("url");
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition ${
                          form.logoUrl === preset.url
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / বিবরণ
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Class 9-10 Guidebooks, HSC Model Questions"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50 shadow-xs transition"
                >
                  {submitting ? "সংরক্ষণ করা হচ্ছে..." : "Save Publisher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
