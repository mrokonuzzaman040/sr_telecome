"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import { ShopSettings } from "@/types";
import {
  Settings,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  Database,
  Save,
} from "lucide-react";

export function SettingsView() {
  const {
    settings,
    updateSettings,
    exportBackupJSON,
    importBackupJSON,
    resetToDefaultData,
    dailyBackups,
    createDailyBackup,
    loadDailyBackups,
    showAlert,
    showConfirm,
  } = useStore();

  const [form, setForm] = useState<ShopSettings>({ ...settings });
  const [importStatus, setImportStatus] = useState<string>("");
  const [isSnapshotting, setIsSnapshotting] = useState<boolean>(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    await showAlert("Shop settings updated successfully!", {
      title: "Settings Saved",
      type: "success",
    });
  };

  const handleResetDemoData = async () => {
    const confirmed = await showConfirm(
      "Are you sure you want to reset all data to demo default records? All your current transactions and inventory will be replaced.",
      {
        title: "Reset Demo Database",
        confirmText: "Yes, Reset All Data",
        cancelText: "Cancel",
        isDestructive: true,
        type: "warning",
      }
    );
    if (confirmed) {
      resetToDefaultData();
      await showAlert("Database has been reset to demo default records.", {
        title: "Reset Completed",
        type: "info",
      });
    }
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sr_library_backup_${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importBackupJSON(content);
        if (success) {
          setImportStatus("Backup restored successfully!");
          setTimeout(() => setImportStatus(""), 4000);
        } else {
          setImportStatus("Error: Failed to restore backup. Invalid JSON file format.");
        }
      }
    };
    reader.readAsText(file);
  };

  const handleCreateDBSnapshot = async () => {
    setIsSnapshotting(true);
    setImportStatus("");
    try {
      const ok = await createDailyBackup("manual", "Manual Database Snapshot from Settings");
      if (ok) {
        setImportStatus("Live database snapshot successfully saved into Supabase PostgreSQL!");
        await loadDailyBackups();
      } else {
        setImportStatus("Database snapshot created or updated for today.");
      }
    } catch (e: any) {
      setImportStatus(`Backup failed: ${e.message}`);
    } finally {
      setIsSnapshotting(false);
      setTimeout(() => setImportStatus(""), 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
      {/* Page Title */}
      <div>
        <h1 className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-700" />
          <span>Shop Settings &amp; Data Management</span>
        </h1>
        <p className="text-[11px] text-slate-500 mt-0.5">
          দোকানের তথ্য, ইনভয়েস সেটিংস ও ডাটাবেজ ব্যাকআপ ব্যবস্থাপনা
        </p>
      </div>

      {/* Shop Settings Form */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-3">
          Shop Profile
        </h3>
        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Shop Name (English):
              </label>
              <input
                type="text"
                required
                value={form.shopName}
                onChange={(e) => setForm((p) => ({ ...p, shopName: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">
                দোকানের নাম (বাংলায়):
              </label>
              <input
                type="text"
                required
                value={form.bengaliShopName}
                onChange={(e) => setForm((p) => ({ ...p, bengaliShopName: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Proprietor / স্বত্বাধিকারী:
              </label>
              <input
                type="text"
                value={form.proprietor}
                onChange={(e) => setForm((p) => ({ ...p, proprietor: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Primary Phone:</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">Secondary Phone:</label>
              <input
                type="text"
                value={form.secondaryPhone || ""}
                onChange={(e) => setForm((p) => ({ ...p, secondaryPhone: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">
                VAT / BIN No (ঐচ্ছিক):
              </label>
              <input
                type="text"
                value={form.vatRegistrationNo || ""}
                onChange={(e) => setForm((p) => ({ ...p, vatRegistrationNo: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Shop Address / দোকানের পূর্ণ ঠিকানা:
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Default Agent Commission Rate (%):
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={form.defaultAgentCommission}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    defaultAgentCommission: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono text-center font-bold focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="font-medium text-slate-700 block mb-1">
                Default Retail Discount (%):
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={form.defaultRetailDiscount}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    defaultRetailDiscount: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono text-center font-bold focus:outline-none focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">
              Invoice Footer Greeting / স্লিপের নিচের বার্তা:
            </label>
            <input
              type="text"
              value={form.invoiceFooterMessage}
              onChange={(e) => setForm((p) => ({ ...p, invoiceFooterMessage: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Document Numbering / Prefixes */}
          <div className="pt-3 border-t border-slate-200">
            <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-700 mb-2">
              Document Numbering / নম্বরিং প্রিফিক্স
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Invoice Prefix:</label>
                <input
                  type="text"
                  value={form.invoicePrefix}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, invoicePrefix: e.target.value.toUpperCase() }))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono font-bold focus:outline-none focus:bg-white"
                  placeholder="INV"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Digits (padding):</label>
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={form.invoicePadding}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, invoicePadding: parseInt(e.target.value) || 4 }))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono text-center font-bold focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Expense Voucher Prefix:</label>
                <input
                  type="text"
                  value={form.expensePrefix}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expensePrefix: e.target.value.toUpperCase() }))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono font-bold focus:outline-none focus:bg-white"
                  placeholder="EXP"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Product SKU Prefix:</label>
                <input
                  type="text"
                  value={form.skuPrefix}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, skuPrefix: e.target.value.toUpperCase() }))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono font-bold focus:outline-none focus:bg-white"
                  placeholder="BK"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none text-slate-600">
              <input
                type="checkbox"
                checked={form.invoiceIncludeYear}
                onChange={(e) => setForm((p) => ({ ...p, invoiceIncludeYear: e.target.checked }))}
                className="rounded text-slate-900 focus:ring-slate-500"
              />
              <span>Include year in invoice number (e.g. {form.invoicePrefix || "INV"}-2026-{String(1).padStart(form.invoicePadding || 4, "0")} instead of {form.invoicePrefix || "INV"}-{String(1).padStart(form.invoicePadding || 4, "0")})</span>
            </label>

            <p className="text-[11px] text-slate-500 mt-2 font-mono">
              Preview → Invoice: <strong className="text-slate-800">
                {form.invoicePrefix || "INV"}-{form.invoiceIncludeYear ? `${new Date().getFullYear()}-` : ""}{String(1).padStart(form.invoicePadding || 4, "0")}
              </strong>
              {" • "}Expense: <strong className="text-slate-800">{form.expensePrefix || "EXP"}-A1B2C3</strong>
              {" • "}SKU: <strong className="text-slate-800">{form.skuPrefix || "BK"}-482</strong>
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-xs shadow-2xs transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Shop Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* Database Daily Backups to DB */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Daily Database Backup (স্বয়ংক্রিয় ডাটাবেজ ব্যাকআপ)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Every day, full system snapshots (products, ledger, sales) are automatically archived into Supabase PostgreSQL database.
            </p>
          </div>

          <button
            type="button"
            disabled={isSnapshotting}
            onClick={handleCreateDBSnapshot}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-2xs transition shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSnapshotting ? "animate-spin" : ""}`} />
            <span>{isSnapshotting ? "Saving..." : "Take Snapshot to DB Now"}</span>
          </button>
        </div>

        {importStatus && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Daily Backups History Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 text-slate-500 sticky top-0 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Products</th>
                  <th className="p-2">Customers</th>
                  <th className="p-2">Sales</th>
                  <th className="p-2">Due Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dailyBackups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-400 text-xs">
                      No automated daily snapshots recorded yet. Click &quot;Take Snapshot to DB Now&quot;.
                    </td>
                  </tr>
                ) : (
                  dailyBackups.map((bkp) => (
                    <tr key={bkp.id} className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-medium text-slate-900">{bkp.backupDate}</td>
                      <td className="p-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                            bkp.backupType === "auto_daily"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {bkp.backupType}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-slate-600">{bkp.summary?.totalProducts ?? "-"}</td>
                      <td className="p-2 font-mono text-slate-600">{bkp.summary?.totalCustomers ?? "-"}</td>
                      <td className="p-2 font-mono text-slate-600">{bkp.summary?.totalSales ?? "-"}</td>
                      <td className="p-2 font-mono font-semibold text-rose-700">
                        {bkp.summary?.totalDue ? `৳${bkp.summary.totalDue}` : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Offline JSON Export/Import */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export Offline JSON</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium cursor-pointer transition">
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Restore from Offline JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleResetDemoData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium transition ml-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
