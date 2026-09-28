"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useStore } from "@/context/StoreContext";
import { formatBDT, getTodayDateString } from "@/utils/formatters";
import { DashboardTab } from "@/components/Sidebar";
import {
  Menu,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  Lock,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  ShoppingCart,
  FileText,
  BookOpen,
  Users,
  ArrowLeftRight,
  TrendingUp,
  Building2,
  Barcode,
  Receipt,
  Settings,
} from "lucide-react";

interface TopHeaderProps {
  activeTab: DashboardTab;
  onToggleMobileSidebar: () => void;
  onOpenSettings?: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
}

export function Navbar({
  activeTab,
  onToggleMobileSidebar,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
}: TopHeaderProps) {
  const { sales, products, logout, selectedDate, setSelectedDate, resetSelectedDate } = useStore();
  const [timeStr, setTimeStr] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to browser fullscreen change event
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const activeDate = selectedDate || getTodayDateString();
  const isToday = activeDate === getTodayDateString();

  const formattedSelectedDate = useMemo(() => {
    try {
      const [y, m, d] = activeDate.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return activeDate;
    }
  }, [activeDate]);

  const handleShiftDate = (days: number) => {
    try {
      const [y, m, d] = activeDate.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      dateObj.setDate(dateObj.getDate() + days);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      setSelectedDate(`${year}-${month}-${day}`);
    } catch (err) {
      console.error("Shift date error:", err);
    }
  };

  const selectedDateSalesTotal = useMemo(() => {
    return sales
      .filter((s) => s.createdAt.startsWith(activeDate))
      .reduce((acc, s) => acc + s.payableAmount, 0);
  }, [sales, activeDate]);

  const lowStockCount = products.filter((p) => p.stockQty <= p.minStockAlert).length;

  const tabTitles: Record<
    DashboardTab,
    { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    dashboard: {
      title: "Dashboard Overview",
      subtitle: "দোকানের দৈনিক হিসাব ও সামগ্রিক পরিসংখ্যান",
      icon: LayoutDashboard,
    },
    pos: {
      title: "POS Billing Terminal",
      subtitle: "খুচরা ও এজেন্ট বই বিক্রয় কেন্দ্র",
      icon: ShoppingCart,
    },
    invoices: {
      title: "Sales Invoices Log",
      subtitle: "সকল বিক্রয় রশিদ ও প্রিন্ট তালিকা",
      icon: FileText,
    },
    inventory: {
      title: "Inventory & Stock Catalog",
      subtitle: "সকল শ্রেণীর বই, গাইড ও স্টেশনারি স্টক",
      icon: BookOpen,
    },
    publishers: {
      title: "Publishers & Brands",
      subtitle: "প্রকাশনী সংস্থা, লোগো ও ব্র্যান্ড তালিকা",
      icon: Building2,
    },
    barcodes: {
      title: "Barcode & Price Tag Generator",
      subtitle: "বই ও স্টেশনারি পণ্যের জন্য বারকোড এবং প্রাইস স্টিকার তৈরি ও প্রিন্ট",
      icon: Barcode,
    },
    customers: {
      title: "Customer & Agent Ledger",
      subtitle: "বাকি খাতা, পাইকারি এজেন্ট ও লেনদেন",
      icon: Users,
    },
    expenses: {
      title: "Daily Expenses Ledger",
      subtitle: "দোকানের দৈনন্দিন খরচ, বেতন, চা-নাস্তা, বিল ও খরচের ভাউচার",
      icon: Receipt,
    },
    returns: {
      title: "Returns & Exchange Desk",
      subtitle: "বই বদল, বিনিময় ও ত্রুটিযুক্ত কপি পরিবর্তন",
      icon: ArrowLeftRight,
    },
    reports: {
      title: "Profit & Loss Reports",
      subtitle: "দৈনিক, মাসিক ও বাৎসরিক লাভ-ক্ষতি হিসাব",
      icon: TrendingUp,
    },
    settings: {
      title: "System Settings & Backup",
      subtitle: "দোকানের বিবরণ ও ডাটা ব্যাকআপ",
      icon: Settings,
    },
  };

  const currentTabInfo = tabTitles[activeTab] || {
    title: "SR Telecom & Library",
    subtitle: "Management System",
    icon: LayoutDashboard,
  };

  const TabIcon = currentTabInfo.icon;

  return (
    <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs select-none">
      <div className="px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Sidebar Toggles & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Sidebar Hamburger Toggle */}
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Open Mobile Navigation"
            aria-label="Open Mobile Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Current Page Title & Subtitle */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="hidden sm:flex w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 items-center justify-center text-slate-700 shrink-0">
              <TabIcon className="w-4 h-4 text-slate-700" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight leading-tight truncate">
                {currentTabInfo.title}
              </h2>
              <p className="text-[11px] text-slate-500 hidden sm:block truncate">
                {currentTabInfo.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Interactive Calendar, Live Clock, Sales Stat, Fullscreen, and Session Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Clickable Calendar Date Selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
            {/* Shift Previous Day */}
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
              title="Previous Day"
              aria-label="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Clickable Date with Hidden Native Date Picker */}
            <label
              className={`relative flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono transition cursor-pointer select-none ${
                isToday
                  ? "text-slate-700 hover:bg-slate-200/70"
                  : "bg-amber-100/90 text-amber-900 font-semibold"
              }`}
              title="Click to select another date from calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{formattedSelectedDate}</span>
              <input
                type="date"
                value={activeDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(e.target.value);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>

            {/* Shift Next Day */}
            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
              title="Next Day"
              aria-label="Next Day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Reset to Today Button (when on a past/future date) */}
            {!isToday && (
              <button
                type="button"
                onClick={resetSelectedDate}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 transition"
                title="Reset back to Today"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Today</span>
              </button>
            )}
          </div>

          {/* Live Clock */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold">{timeStr || "00:00:00"}</span>
          </div>

          {/* Sales Stat Pill - Bengali Taka ৳ badge and balanced left alignment */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs shadow-2xs">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              ৳
            </div>
            <div className="flex flex-col text-left justify-center">
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider leading-none mb-1">
                {isToday ? "Today's Sale" : "Date Sale"}
              </span>
              <span className="font-bold font-mono text-emerald-950 text-xs leading-none">
                {formatBDT(selectedDateSalesTotal)}
              </span>
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStockCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-mono font-bold"
              title={`${lowStockCount} items have reached low stock limit`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{lowStockCount}</span>
            </div>
          )}

          {/* Full Screen Mode Toggle Button (Icon only) */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg border text-xs font-medium transition ${
              isFullscreen
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            }`}
            title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen Mode"}
            aria-label="Toggle Full Screen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 shrink-0" />
            ) : (
              <Maximize2 className="w-4 h-4 shrink-0" />
            )}
          </button>

          {/* Lock Screen / Logout Button (Icon only) */}
          <button
            type="button"
            onClick={logout}
            className="p-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 rounded-lg transition"
            title="Lock system session"
            aria-label="Lock Screen"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
