"use client";

import React from "react";
import { DashboardTab } from "@/components/Sidebar";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  BookOpen,
  Menu,
} from "lucide-react";

interface MobileBottomNavProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onOpenMobileMenu: () => void;
  cartCount?: number;
  lowStockCount?: number;
}

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  onOpenMobileMenu,
  cartCount = 0,
  lowStockCount = 0,
}: MobileBottomNavProps) {
  const isPosActive = activeTab === "pos";
  const isDashboardActive = activeTab === "dashboard";
  const isInvoicesActive = activeTab === "invoices";
  const isStockActive = activeTab === "inventory";
  const isMoreActive = [
    "publishers",
    "barcodes",
    "customers",
    "expenses",
    "returns",
    "reports",
    "settings",
  ].includes(activeTab);

  return (
    <nav
      className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] pb-[max(0.35rem,env(safe-area-inset-bottom))]"
      aria-label="Mobile Navigation Bar"
    >
      <div className="grid grid-cols-5 h-14 max-w-lg mx-auto items-center px-1">
        {/* Tab 1: Dashboard */}
        <button
          type="button"
          onClick={() => onSelectTab("dashboard")}
          className={`flex flex-col items-center justify-center py-1 transition-all active:scale-90 ${
            isDashboardActive ? "text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-700"
          }`}
          aria-label="Dashboard"
        >
          <div
            className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
              isDashboardActive ? "bg-slate-900 text-white shadow-2xs" : "bg-transparent text-slate-500"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Home</span>
        </button>

        {/* Tab 2: POS Billing (Highlighted Center/Key Action) */}
        <button
          type="button"
          onClick={() => onSelectTab("pos")}
          className={`relative flex flex-col items-center justify-center py-1 transition-all active:scale-90 ${
            isPosActive ? "text-emerald-800 font-semibold" : "text-slate-500 hover:text-slate-700"
          }`}
          aria-label="POS Billing"
        >
          <div
            className={`relative w-9 h-7 rounded-full flex items-center justify-center transition-all ${
              isPosActive
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 leading-none font-medium">POS</span>
        </button>

        {/* Tab 3: Stock / Inventory */}
        <button
          type="button"
          onClick={() => onSelectTab("inventory")}
          className={`relative flex flex-col items-center justify-center py-1 transition-all active:scale-90 ${
            isStockActive ? "text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-700"
          }`}
          aria-label="Inventory Stock"
        >
          <div
            className={`relative w-9 h-7 rounded-full flex items-center justify-center transition-all ${
              isStockActive ? "bg-slate-900 text-white shadow-2xs" : "bg-transparent text-slate-500"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {lowStockCount > 0 && (
              <span
                className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"
                title={`${lowStockCount} items low in stock`}
              />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Stock</span>
        </button>

        {/* Tab 4: Invoices Log */}
        <button
          type="button"
          onClick={() => onSelectTab("invoices")}
          className={`flex flex-col items-center justify-center py-1 transition-all active:scale-90 ${
            isInvoicesActive ? "text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-700"
          }`}
          aria-label="Invoices"
        >
          <div
            className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
              isInvoicesActive ? "bg-slate-900 text-white shadow-2xs" : "bg-transparent text-slate-500"
            }`}
          >
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">Bills</span>
        </button>

        {/* Tab 5: More Menu */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className={`relative flex flex-col items-center justify-center py-1 transition-all active:scale-90 ${
            isMoreActive ? "text-slate-900 font-semibold" : "text-slate-500 hover:text-slate-700"
          }`}
          aria-label="More Menu"
        >
          <div
            className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
              isMoreActive ? "bg-slate-900 text-white shadow-2xs" : "bg-transparent text-slate-500"
            }`}
          >
            <Menu className="w-4 h-4" />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}
