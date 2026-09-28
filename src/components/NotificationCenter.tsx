"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { formatBDT } from "@/utils/formatters";
import {
  Bell,
  BellRing,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  ShoppingCart,
  AlertTriangle,
  Receipt,
  X,
  Sparkles,
  Info,
} from "lucide-react";
import { NotificationType } from "@/types";

export function NotificationCenter() {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    soundEnabled,
    setSoundEnabled,
    desktopNotificationsEnabled,
    requestDesktopNotificationPermission,
    testSaleNotification,
  } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | NotificationType>("all");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  const formatTimeAgo = (isoDate: string) => {
    try {
      const now = new Date().getTime();
      const date = new Date(isoDate).getTime();
      const diffSecs = Math.floor((now - date) / 1000);

      if (diffSecs < 60) return "এইমাত্র";
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} মিনিট আগে`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} ঘন্টা আগে`;
      return new Date(isoDate).toLocaleDateString("bn-BD", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "";
    }
  };

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case "sale":
        return <ShoppingCart className="w-4 h-4 text-emerald-600" />;
      case "low_stock":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case "due":
        return <Receipt className="w-4 h-4 text-blue-600" />;
      default:
        return <Info className="w-4 h-4 text-indigo-600" />;
    }
  };

  const getBgForType = (type: NotificationType) => {
    switch (type) {
      case "sale":
        return "bg-emerald-50 border-emerald-200/80";
      case "low_stock":
        return "bg-amber-50 border-amber-200/80";
      case "due":
        return "bg-blue-50 border-blue-200/80";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg border text-xs font-medium transition flex items-center justify-center ${
          isOpen
            ? "bg-emerald-50 border-emerald-300 text-emerald-800"
            : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
        }`}
        title="Notifications & Sale Alerts"
        aria-label="Open notifications"
      >
        {unreadNotificationsCount > 0 ? (
          <BellRing className="w-4 h-4 text-emerald-600 animate-pulse" />
        ) : (
          <Bell className="w-4 h-4 text-slate-600" />
        )}

        {/* Unread Counter Badge */}
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
            {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white/98 backdrop-blur-md shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 leading-none">বিজ্ঞপ্তি ও এলার্ট</h3>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      {unreadNotificationsCount} নতুন
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">রিয়েল-টাইম বিক্রয় ও স্টক নোটিফিকেশন</p>
              </div>
            </div>

            {/* Quick Action Icons */}
            <div className="flex items-center gap-1">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-md border text-xs transition ${
                  soundEnabled
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                    : "bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200"
                }`}
                title={soundEnabled ? "সাউন্ড চালু আছে (ক্লিক করে বন্ধ করুন)" : "সাউন্ড বন্ধ আছে (ক্লিক করে চালু করুন)"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop Push Prompt Banner (if not yet enabled) */}
          {!desktopNotificationsEnabled && (
            <div className="px-3.5 py-2 bg-indigo-50/80 border-b border-indigo-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-indigo-900 font-medium">ব্রাউজার পুশ নোটিফিকেশন চালু করুন</span>
              <button
                type="button"
                onClick={requestDesktopNotificationPermission}
                className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[10px] shadow-2xs transition"
              >
                অনুমতি দিন
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="px-3 pt-2 pb-1 border-b border-slate-100 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                filter === "all"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              সকল ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("sale")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                filter === "sale"
                  ? "bg-emerald-700 text-white"
                  : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
              }`}
            >
              <ShoppingCart className="w-3 h-3" />
              বিক্রয়
            </button>
            <button
              type="button"
              onClick={() => setFilter("low_stock")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                filter === "low_stock"
                  ? "bg-amber-700 text-white"
                  : "text-slate-600 hover:bg-amber-50 hover:text-amber-800"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              স্টক
            </button>
          </div>

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-500 font-medium">কোন নোটিফিকেশন নেই</p>
                <button
                  type="button"
                  onClick={testSaleNotification}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  টেস্ট সেল এলার্ট বাজান
                </button>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`p-3 transition cursor-pointer flex items-start gap-3 hover:bg-slate-50/80 ${
                    !notif.read ? "bg-emerald-50/20" : ""
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg border shrink-0 mt-0.5 ${getBgForType(
                      notif.type
                    )}`}
                  >
                    {getIconForType(notif.type)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                      {notif.message}
                    </p>

                    {/* Metadata pill */}
                    {notif.metadata?.amount && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                          ৳{formatBDT(notif.metadata.amount)}
                        </span>
                        {notif.metadata.invoiceNo && (
                          <span className="text-[10px] font-mono text-slate-400">
                            #{notif.metadata.invoiceNo}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          {notifications.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                সব পড়া হয়েছে
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={testSaleNotification}
                  className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded hover:bg-emerald-50 transition"
                  title="সাউন্ড ও নোটিফিকেশন পরীক্ষা করুন"
                >
                  টেস্ট বেল
                </button>
                <button
                  type="button"
                  onClick={clearAllNotifications}
                  className="flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-50 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  মুছুন
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
