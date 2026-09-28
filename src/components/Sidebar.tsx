"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  BookOpen,
  Users,
  ArrowLeftRight,
  TrendingUp,
  Settings,
  LogOut,
  Store,
  ShieldCheck,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Barcode,
  Receipt,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  CreditCard,
  ChevronsUpDown,
} from "lucide-react";

export type DashboardTab =
  | "dashboard"
  | "pos"
  | "invoices"
  | "inventory"
  | "publishers"
  | "barcodes"
  | "customers"
  | "expenses"
  | "returns"
  | "reports"
  | "settings";

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavSubItem {
  id: DashboardTab;
  label: string;
  bengali: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  hasAlert?: boolean;
  isNew?: boolean;
  adminOnly?: boolean;
}

interface NavGroup {
  groupId: string;
  title: string;
  bengaliTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  items: NavSubItem[];
}

export function Sidebar({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { settings, products, currentUser, logout } = useStore();

  const lowStockCount = products.filter((p) => p.stockQty <= p.minStockAlert).length;
  const isAdmin = currentUser?.role === "admin";

  // Dropdown groups configuration
  const navGroups: NavGroup[] = [
    {
      groupId: "sales",
      title: "Sales & Orders",
      bengaliTitle: "বিক্রয় ও বিলিং",
      icon: ShoppingCart,
      adminOnly: false,
      items: [
        {
          id: "pos",
          label: "POS Billing",
          bengali: "বিক্রয় কেন্দ্র",
          shortLabel: "POS",
          icon: ShoppingCart,
          adminOnly: false,
        },
        {
          id: "invoices",
          label: "Invoices Log",
          bengali: "বিক্রয় চালান",
          shortLabel: "Invoices",
          icon: FileText,
          adminOnly: false,
        },
        {
          id: "returns",
          label: "Returns & Exchange",
          bengali: "বই ফেরত ও বদল",
          shortLabel: "Returns",
          icon: ArrowLeftRight,
          adminOnly: false,
        },
      ],
    },
    {
      groupId: "inventory",
      title: "Stock & Catalog",
      bengaliTitle: "স্টক ও ক্যাটালগ",
      icon: BookOpen,
      adminOnly: false,
      items: [
        {
          id: "inventory",
          label: "Inventory & Books",
          bengali: "স্টক ও বইসমূহ",
          shortLabel: "Stock",
          icon: BookOpen,
          badge: lowStockCount > 0 ? `${lowStockCount} Low` : undefined,
          hasAlert: lowStockCount > 0,
          adminOnly: false,
        },
        {
          id: "publishers",
          label: "Publishers & Brands",
          bengali: "প্রকাশনী ও লোগো",
          shortLabel: "Publishers",
          icon: Building2,
          adminOnly: false,
        },
        {
          id: "barcodes",
          label: "Barcode & Labels",
          bengali: "বারকোড ও স্টিকার",
          shortLabel: "Barcodes",
          icon: Barcode,
          isNew: true,
          adminOnly: false,
        },
      ],
    },
    {
      groupId: "finance",
      title: "Accounts & Ledger",
      bengaliTitle: "হিসাব ও খাতা",
      icon: Users,
      adminOnly: false,
      items: [
        {
          id: "customers",
          label: "Customer Ledger",
          bengali: "বাকি খাতা ও এজেন্ট",
          shortLabel: "Ledger",
          icon: Users,
          adminOnly: false,
        },
        {
          id: "expenses",
          label: "Daily Expenses",
          bengali: "খরচ খাতা ও ভাউচার",
          shortLabel: "Expenses",
          icon: Receipt,
          isNew: true,
          adminOnly: false,
        },
      ],
    },
    {
      groupId: "reports",
      title: "Reports & Analytics",
      bengaliTitle: "রিপোর্ট ও লাভ-ক্ষতি",
      icon: TrendingUp,
      adminOnly: true,
      items: [
        {
          id: "reports",
          label: "P&L Reports",
          bengali: "লাভ-ক্ষতি ও আয়-ব্যয়",
          shortLabel: "Reports",
          icon: TrendingUp,
          adminOnly: true,
        },
      ],
    },
    {
      groupId: "system",
      title: "System & Settings",
      bengaliTitle: "সেটিংস ও ব্যাকআপ",
      icon: Settings,
      adminOnly: true,
      items: [
        {
          id: "settings",
          label: "Shop Settings",
          bengali: "দোকান সেটিংস",
          shortLabel: "Settings",
          icon: Settings,
          adminOnly: true,
        },
      ],
    },
  ];

  // Open/Close state for each dropdown group
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    sales: true,
    inventory: true,
    finance: true,
    reports: true,
    system: false,
  });

  // Hover state for mini collapsed flyout menu
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

  // Auto-expand group when activeTab belongs to it
  useEffect(() => {
    for (const group of navGroups) {
      if (group.items.some((item) => item.id === activeTab)) {
        setOpenGroups((prev) => ({ ...prev, [group.groupId]: true }));
        break;
      }
    }
  }, [activeTab]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleSelectTab = (tabId: DashboardTab) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
    setHoveredGroupId(null);
  };

  // Toggle expand all / collapse all
  const handleToggleAllGroups = () => {
    const areAllOpen = Object.values(openGroups).every(Boolean);
    const nextState: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      nextState[g.groupId] = !areAllOpen;
    });
    setOpenGroups(nextState);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`no-print fixed top-0 bottom-0 left-0 z-50 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-all duration-200 select-none ${
          isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        {/* Top Header / Brand Logo */}
        <div className="flex flex-col flex-1 min-h-0">
          <div
            className={`border-b border-slate-800 flex items-center transition-all ${
              isCollapsed ? "p-3 justify-center" : "px-4 py-3.5 justify-between gap-3"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-100 shrink-0 shadow-inner"
                title={`${settings.shopName} - ${settings.bengaliShopName}`}
              >
                <Store className="w-5 h-5 text-emerald-400" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h1 className="font-bold text-sm text-white truncate tracking-tight">
                    {settings.shopName}
                  </h1>
                  <p className="text-[11px] text-slate-400 truncate">
                    {settings.bengaliShopName}
                  </p>
                </div>
              )}
            </div>

            {/* Desktop Collapse / Expand Toggle */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Expand Button bar when collapsed */}
          {isCollapsed && (
            <div className="hidden lg:flex justify-center py-2 border-b border-slate-800/80">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation Items (Scrollable Body) */}
          <nav className="p-2 space-y-2 overflow-y-auto flex-1">
            {/* 1. Primary Dashboard Item (Single Top Item) */}
            <div>
              <button
                type="button"
                onClick={() => handleSelectTab("dashboard")}
                title="Dashboard Overview"
                className={`w-full flex items-center ${
                  isCollapsed ? "justify-center p-3" : "justify-between px-3 py-2.5"
                } rounded-lg text-xs font-semibold transition ${
                  activeTab === "dashboard"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <LayoutDashboard
                    className={`w-4 h-4 shrink-0 ${
                      activeTab === "dashboard" ? "text-emerald-400" : "text-slate-400"
                    }`}
                  />
                  {!isCollapsed && <span>Dashboard (ড্যাশবোর্ড)</span>}
                </div>
                {!isCollapsed && activeTab === "dashboard" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                )}
              </button>
            </div>

            {/* Section Divider & Expand All button */}
            {!isCollapsed && (
              <div className="flex items-center justify-between px-3 pt-2 pb-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Menu &amp; Modules
                </span>
                <button
                  type="button"
                  onClick={handleToggleAllGroups}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition flex items-center gap-1"
                  title="Toggle all dropdowns"
                >
                  <ChevronsUpDown className="w-3 h-3" />
                  <span>Toggle</span>
                </button>
              </div>
            )}

            {/* 2. Hierarchical Dropdown Groups */}
            {navGroups.map((group) => {
              const GroupIcon = group.icon;
              const isGroupLocked = group.adminOnly && !isAdmin;
              const isGroupOpen = Boolean(openGroups[group.groupId]);
              const hasActiveChild = group.items.some((i) => i.id === activeTab);
              const groupHasAlert = group.items.some((i) => i.hasAlert);

              // Render in Collapsed Mode (Icon with floating flyout on desktop)
              if (isCollapsed) {
                return (
                  <div
                    key={group.groupId}
                    className="relative group/mini"
                    onMouseEnter={() => setHoveredGroupId(group.groupId)}
                    onMouseLeave={() => setHoveredGroupId(null)}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        // In collapsed mode, clicking takes user to first child item
                        if (!isGroupLocked && group.items.length > 0) {
                          handleSelectTab(group.items[0].id);
                        }
                      }}
                      className={`relative w-full flex items-center justify-center p-3 rounded-lg transition ${
                        hasActiveChild
                          ? "bg-slate-800 text-white font-semibold shadow-xs border-l-2 border-emerald-400"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                      title={`${group.title} (${group.bengaliTitle})`}
                    >
                      <GroupIcon
                        className={`w-5 h-5 shrink-0 ${
                          hasActiveChild
                            ? "text-emerald-400"
                            : isGroupLocked
                            ? "text-slate-600"
                            : "text-slate-400"
                        }`}
                      />

                      {/* Stock Alert Badge Dot */}
                      {groupHasAlert && (
                        <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-slate-900" />
                      )}

                      {/* Lock indicator */}
                      {isGroupLocked && (
                        <span className="absolute bottom-1.5 right-2 text-slate-600">
                          <Lock className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </button>

                    {/* Desktop Floating Flyout Menu when hovered in collapsed mode */}
                    {hoveredGroupId === group.groupId && (
                      <div className="hidden lg:block absolute left-full top-0 ml-2 w-56 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-2.5 py-1.5 border-b border-slate-800 mb-1.5 flex items-center justify-between">
                          <span className="font-bold text-xs text-white">
                            {group.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {group.bengaliTitle}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {group.items.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = activeTab === sub.id;
                            const isSubLocked = sub.adminOnly && !isAdmin;

                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleSelectTab(sub.id)}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition ${
                                  isSubActive
                                    ? "bg-emerald-500/20 text-emerald-400 font-semibold"
                                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <SubIcon
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      isSubActive ? "text-emerald-400" : "text-slate-400"
                                    }`}
                                  />
                                  <span className="truncate">{sub.label}</span>
                                </div>
                                {sub.badge && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 text-[9px] font-mono">
                                    {sub.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Render in Normal Expanded Mode (Dropdown Accordion)
              return (
                <div key={group.groupId} className="space-y-1">
                  {/* Dropdown Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.groupId)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                      hasActiveChild
                        ? "text-slate-200 bg-slate-800/80"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GroupIcon
                        className={`w-4 h-4 shrink-0 ${
                          hasActiveChild ? "text-emerald-400" : "text-slate-400"
                        }`}
                      />
                      <span className="truncate">{group.title}</span>
                      <span className="text-[10px] text-slate-500 font-normal truncate">
                        ({group.bengaliTitle})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {groupHasAlert && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      )}
                      {isGroupLocked ? (
                        <Lock className="w-3 h-3 text-slate-600" />
                      ) : (
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                            isGroupOpen ? "rotate-0" : "-rotate-90"
                          }`}
                        />
                      )}
                    </div>
                  </button>

                  {/* Dropdown Sub-Items List */}
                  {isGroupOpen && (
                    <div className="pl-4 pr-1 space-y-1 relative before:absolute before:left-5 before:top-1 before:bottom-1 before:w-[1px] before:bg-slate-800">
                      {group.items.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = activeTab === sub.id;
                        const isSubLocked = sub.adminOnly && !isAdmin;

                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSelectTab(sub.id)}
                            className={`relative w-full flex items-center justify-between pl-4 pr-2.5 py-2 rounded-lg text-xs transition ${
                              isSubActive
                                ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30 shadow-xs"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <SubIcon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isSubActive ? "text-emerald-400" : "text-slate-500"
                                }`}
                              />
                              <span className="truncate">{sub.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {sub.isNew && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 text-[9px] font-mono font-bold uppercase tracking-wider">
                                  NEW
                                </span>
                              )}
                              {sub.badge && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 text-[10px] font-mono font-bold">
                                  {sub.badge}
                                </span>
                              )}
                              {isSubLocked && <Lock className="w-3 h-3 text-slate-600" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile & Controls */}
        <div className="p-2 border-t border-slate-800 bg-slate-950/70">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <div
                className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 relative"
                title={`${currentUser?.name || "User"} (${
                  currentUser?.role === "admin" ? "Admin" : "Staff"
                })`}
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span
                  className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-950 ${
                    currentUser?.role === "admin" ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                title="Lock System / Logout"
                aria-label="Lock System / Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {currentUser?.name || "User"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold ${
                          currentUser?.role === "admin"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-blue-950 text-blue-400 border border-blue-800"
                        }`}
                      >
                        {currentUser?.role === "admin" ? "Admin" : "Staff"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                  title="Lock System / Logout"
                  aria-label="Lock System"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center text-[10px] text-slate-500 font-mono py-0.5">
                Classic ERP v2.5 • Offline Ready
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
