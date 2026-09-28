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
  ShieldCheck,
  KeyRound,
  Lock,
  Bell,
  Volume2,
  VolumeX,
  Smartphone,
  Sparkles,
  Fingerprint,
  Palette,
  Check,
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
    updateUserPin,
    soundEnabled,
    setSoundEnabled,
    desktopNotificationsEnabled,
    requestDesktopNotificationPermission,
    testSaleNotification,
    showAlert,
    showConfirm,
  } = useStore();

  const [form, setForm] = useState<ShopSettings>({ ...settings });
  const [importStatus, setImportStatus] = useState<string>("");
  const [isSnapshotting, setIsSnapshotting] = useState<boolean>(false);

  // PIN Management state
  const [currentAdminPin, setCurrentAdminPin] = useState("");
  const [newAdminPin, setNewAdminPin] = useState("");
  const [confirmAdminPin, setConfirmAdminPin] = useState("");
  const [isChangingAdminPin, setIsChangingAdminPin] = useState(false);

  const [newCashierPin, setNewCashierPin] = useState("");
  const [isChangingCashierPin, setIsChangingCashierPin] = useState(false);

  const handleAdminPinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdminPin.trim() || !newAdminPin.trim()) {
      await showAlert("Please enter your current PIN and new PIN.", { type: "warning" });
      return;
    }
    if (newAdminPin.length < 4 || newAdminPin.length > 6) {
      await showAlert("New PIN must be 4 to 6 digits.", { type: "warning" });
      return;
    }
    if (newAdminPin !== confirmAdminPin) {
      await showAlert("New PIN and Confirm PIN do not match.", { type: "warning" });
      return;
    }

    setIsChangingAdminPin(true);
    const res = await updateUserPin(newAdminPin, currentAdminPin);
    setIsChangingAdminPin(false);

    if (res.success) {
      setCurrentAdminPin("");
      setNewAdminPin("");
      setConfirmAdminPin("");
      await showAlert("Admin PIN updated successfully! Remember to use your new PIN on your next login.", {
        title: "PIN Updated",
        type: "success",
      });
    } else {
      await showAlert(res.error || "Failed to update PIN.", {
        title: "Error",
        type: "error",
      });
    }
  };

  const handleCashierPinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashierPin.trim()) {
      await showAlert("Please enter a new PIN for Cashier/Staff.", { type: "warning" });
      return;
    }
    if (newCashierPin.length < 4 || newCashierPin.length > 6) {
      await showAlert("Cashier PIN must be 4 to 6 digits.", { type: "warning" });
      return;
    }

    setIsChangingCashierPin(true);
    const res = await updateUserPin(newCashierPin, undefined, "usr-staff");
    setIsChangingCashierPin(false);

    if (res.success) {
      setNewCashierPin("");
      await showAlert("Cashier / Staff PIN updated successfully!", {
        title: "Staff PIN Updated",
        type: "success",
      });
    } else {
      await showAlert(res.error || "Failed to update Cashier PIN.", {
        title: "Error",
        type: "error",
      });
    }
  };

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

      {/* System Security & PIN Management */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Security &amp; PIN Management (নিরাপত্তা ও পিন পরিবর্তন)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Secure your software before going public. Change the default 4-digit PINs to private passwords.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>PBKDF2 Hashed &amp; Session Guard Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Change Admin PIN */}
          <form onSubmit={handleAdminPinChange} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>Change Admin / Proprietor PIN</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Updates your master admin PIN for full system access and profit reports.
            </p>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Current Admin PIN:</label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Enter current PIN"
                  value={currentAdminPin}
                  onChange={(e) => setCurrentAdminPin(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">New PIN (4-6 digits):</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="New PIN"
                    value={newAdminPin}
                    onChange={(e) => setNewAdminPin(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">Confirm New PIN:</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Confirm PIN"
                    value={confirmAdminPin}
                    onChange={(e) => setConfirmAdminPin(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingAdminPin}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed"
            >
              {isChangingAdminPin ? "Updating..." : "Update Admin PIN"}
            </button>
          </form>

          {/* Change Cashier / Staff PIN */}
          <form onSubmit={handleCashierPinChange} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Lock className="w-4 h-4 text-cyan-600" />
                <span>Reset Cashier / Staff PIN</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Set a secure PIN for staff members operating the POS sales counter.
              </p>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">New Cashier PIN (4-6 digits):</label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Enter new 4-digit PIN"
                  value={newCashierPin}
                  onChange={(e) => setNewCashierPin(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingCashierPin}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white rounded text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed mt-2"
            >
              {isChangingCashierPin ? "Updating..." : "Update Cashier PIN"}
            </button>
          </form>
        </div>
      </div>

      {/* Appearance: Fingerprint & Theme Color */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-violet-600" />
            <span>Appearance &amp; Biometric (অ্যাপিয়ারেন্স ও বায়োমেট্রিক)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            অ্যাপের থিম রঙ পরিবর্তন করুন এবং ফিঙ্গারপ্রিন্ট লগইন চালু করুন
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Fingerprint Toggle */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Fingerprint className="w-4 h-4 text-violet-600" />
                <span>Fingerprint / Biometric Login</span>
              </div>
              <p className="text-[11px] text-slate-500">
                পিনের পরিবর্তে ফিঙ্গারপ্রিন্ট বা ফেস আনলক দিয়ে অ্যাপে প্রবেশ করুন (মোবাইল অ্যাপে কার্যকর)।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !form.fingerprintEnabled;
                setForm((p) => ({ ...p, fingerprintEnabled: next }));
                updateSettings({ ...form, fingerprintEnabled: next });
              }}
              className={`px-3 py-1 rounded-full font-bold text-[11px] transition shrink-0 cursor-pointer ${
                form.fingerprintEnabled
                  ? "bg-violet-600 text-white"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
            >
              {form.fingerprintEnabled ? "চালু (ON)" : "বন্ধ (OFF)"}
            </button>
          </div>

          {/* Current theme preview */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Palette className="w-4 h-4 text-violet-600" />
              <span>Theme Accent Color</span>
            </div>
            <p className="text-[11px] text-slate-500">
              অ্যাপের প্রাথমিক রঙ নির্বাচন করুন। মোবাইল ও ওয়েব উভয়ে প্রযোজ্য।
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: form.themeColor || "#0f766e" }}
              />
              <span className="font-mono text-[11px] text-slate-600 uppercase">
                {form.themeColor || "#0f766e"}
              </span>
            </div>
          </div>
        </div>

        {/* Theme Color Swatches */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Select Theme Color:
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { key: "teal",   label: "Teal",   color: "#0f766e" },
              { key: "indigo", label: "Indigo", color: "#4338ca" },
              { key: "blue",   label: "Blue",   color: "#1d4ed8" },
              { key: "violet", label: "Violet", color: "#7c3aed" },
              { key: "rose",   label: "Rose",   color: "#e11d48" },
              { key: "orange", label: "Orange", color: "#ea580c" },
              { key: "green",  label: "Green",  color: "#16a34a" },
              { key: "slate",  label: "Slate",  color: "#334155" },
            ].map((opt) => {
              const isSelected = (form.themeColor || "#0f766e") === opt.color;
              return (
                <button
                  key={opt.key}
                  type="button"
                  title={opt.label}
                  onClick={() => {
                    setForm((p) => ({ ...p, themeColor: opt.color }));
                    updateSettings({ ...form, themeColor: opt.color });
                  }}
                  className="relative w-9 h-9 rounded-full border-2 transition-all cursor-pointer active:scale-95"
                  style={{
                    backgroundColor: opt.color,
                    borderColor: isSelected ? "white" : "transparent",
                    boxShadow: isSelected ? `0 0 0 3px ${opt.color}` : "none",
                  }}
                >
                  {isSelected && (
                    <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            থিম রঙ পরিবর্তন মোবাইল অ্যাপে তাৎক্ষণিক কার্যকর হয়। ওয়েবে পরবর্তী রিলিজে সম্পূর্ণ প্রয়োগ হবে।
          </p>
        </div>
      </div>

      {/* Appearance: Fingerprint & Theme Color */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-violet-600" />
            <span>Appearance &amp; Biometric Login</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            থিম রঙ ও ফিঙ্গারপ্রিন্ট লগইন বিকল্প সেটার করুন
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Fingerprint Toggle */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Fingerprint className="w-4 h-4 text-violet-600" />
                <span>Fingerprint / Biometric Login</span>
              </div>
              <p className="text-[11px] text-slate-500">
                পিনের পরিবর্তে ফিঙ্গারপ্রিন্ট বা ফেস আনলক দিয়ে অ্যাপে প্রবেশ করুন (মোবাইল অ্যাপে কার্যকর)।
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !form.fingerprintEnabled;
                setForm((p) => ({ ...p, fingerprintEnabled: next }));
                updateSettings({ ...form, fingerprintEnabled: next });
              }}
              className={`px-3 py-1 rounded-full font-bold text-[11px] transition shrink-0 cursor-pointer ${
                form.fingerprintEnabled
                  ? "bg-violet-600 text-white"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
            >
              {form.fingerprintEnabled ? "চালু (ON)" : "বন্ধ (OFF)"}
            </button>
          </div>

          {/* Current theme preview */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Palette className="w-4 h-4 text-violet-600" />
              <span>Current Theme Color</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-7 h-7 rounded-full border-2 border-white shadow-sm shrink-0"
                style={{ backgroundColor: form.themeColor || "#0f766e" }}
              />
              <span className="font-mono text-[11px] text-slate-600 uppercase">
                {form.themeColor || "#0f766e"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              মোবাইল অ্যাপে থিম রঙ তাৎক্ষণিক প্রয়োগ হয়।
            </p>
          </div>
        </div>

        {/* Theme Color Swatches */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            Select Theme Color / থিম রঙ বাছুন:
          </p>
          <div className="flex flex-wrap gap-3">
            {([
              { key: "teal",   label: "Teal (Default)", color: "#0f766e" },
              { key: "indigo", label: "Indigo",          color: "#4338ca" },
              { key: "blue",   label: "Blue",            color: "#1d4ed8" },
              { key: "violet", label: "Violet",          color: "#7c3aed" },
              { key: "rose",   label: "Rose",            color: "#e11d48" },
              { key: "orange", label: "Orange",          color: "#ea580c" },
              { key: "green",  label: "Green",           color: "#16a34a" },
              { key: "slate",  label: "Slate",           color: "#334155" },
            ] as const).map((opt) => {
              const isSelected = (form.themeColor || "#0f766e") === opt.color;
              return (
                <button
                  key={opt.key}
                  type="button"
                  title={opt.label}
                  onClick={() => {
                    setForm((p) => ({ ...p, themeColor: opt.color }));
                    updateSettings({ ...form, themeColor: opt.color });
                  }}
                  className="relative w-9 h-9 rounded-full border-[3px] transition-all cursor-pointer active:scale-95 hover:scale-105"
                  style={{
                    backgroundColor: opt.color,
                    borderColor: isSelected ? "white" : "transparent",
                    outline: isSelected ? `3px solid ${opt.color}` : "none",
                    outlineOffset: "1px",
                  }}
                >
                  {isSelected && (
                    <Check className="w-4 h-4 text-white absolute inset-0 m-auto" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            থিম রঙ মোবাইল অ্যাপে তাৎক্ষণিক কার্যকর হয়। ওয়েবে Save করলে পরবর্তী রিলিজে সম্পূর্ণ প্রয়োগ হবে।
          </p>
        </div>
      </div>

      {/* Real-time Notifications & Sound Alerts Settings */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-emerald-600" />
              <span>Real-Time Notifications &amp; Sound Alerts (বিক্রয় নোটিফিকেশন ও সাউন্ড)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              প্রতিটি বিক্রয় সম্পন্ন হলে ক্যাশ রেজিস্টার সাউন্ড চাইম, ব্রাউজার নোটিফিকেশন এবং অ্যান্ড্রয়েড পুশ নোটিফিকেশন
            </p>
          </div>

          <button
            type="button"
            onClick={testSaleNotification}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Chime &amp; Notification</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Sound Synthesizer Setting */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <span>Cash Register Audio Chime</span>
              </div>
              <p className="text-[11px] text-slate-500">
                বিক্রয় রশিদ তৈরির সাথে সাথে ক্যাশ রেজিস্টার বেল বাজবে (Web Audio API - 100% অফলাইন ও দ্রুত)।
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-1 rounded-full font-bold text-[11px] transition shrink-0 cursor-pointer ${
                soundEnabled
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
            >
              {soundEnabled ? "চালু (ON)" : "বন্ধ (OFF)"}
            </button>
          </div>

          {/* Desktop Push Notification Setting */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Bell className="w-4 h-4 text-indigo-600" />
                <span>Browser Push Notifications</span>
              </div>
              <p className="text-[11px] text-slate-500">
                ট্যাব ব্যাকগ্রাউন্ডে থাকলেও বা মিনিমাইজ করা থাকলেও কম্পিউটার স্ক্রিনে তাৎক্ষণিক বিক্রয় নোটিফিকেশন আসবে।
              </p>
            </div>

            {desktopNotificationsEnabled ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] shrink-0">
                অনুমোদিত ✓
              </span>
            ) : (
              <button
                type="button"
                onClick={requestDesktopNotificationPermission}
                className="px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition shrink-0 cursor-pointer"
              >
                অনুমতি দিন
              </button>
            )}
          </div>
        </div>

        {/* Android Push Notification Info Banner */}
        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 flex items-start gap-2.5 text-xs text-blue-900">
          <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed flex-1">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <span className="font-bold text-blue-950">অ্যান্ড্রয়েড ও মোবাইল পুশ নোটিফিকেশন (Firebase FCM):</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                ✓ Firebase Connected (boighor-pos)
              </span>
            </div>
            <p className="text-[11px] text-blue-800">
              Firebase Project: <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold text-blue-950">boighor-pos</code> | Android App: <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold text-blue-950">com.boighor.boighor_pos</code>। 
              মোবাইল ও ওয়েবে যেকোনো বিক্রয় সম্পন্ন হওয়ার সাথে সাথে ব্যাকএন্ড স্বয়ংক্রিয়ভাবে অ্যান্ড্রয়েড ডিভাইসে পুশ নোটিফিকেশন পাঠাবে।
            </p>
          </div>
        </div>
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
