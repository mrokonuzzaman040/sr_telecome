"use client";

import React, { useState, useEffect, useRef } from "react";
import { StoreProvider, useStore } from "@/context/StoreContext";
import { ModalProvider } from "@/context/ModalContext";
import { Sidebar, DashboardTab } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { LoginView } from "@/components/auth/LoginView";
import { AccessRestricted } from "@/components/auth/AccessRestricted";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { POSView } from "@/components/pos/POSView";
import { InvoicesListView } from "@/components/invoice/InvoicesListView";
import { InventoryView } from "@/components/inventory/InventoryView";
import { CustomersView } from "@/components/customers/CustomersView";
import { ReturnsView } from "@/components/returns/ReturnsView";
import { ReportsView } from "@/components/reports/ReportsView";
import { PublishersView } from "@/components/publishers/PublishersView";
import { BarcodeGeneratorView } from "@/components/barcodes/BarcodeGeneratorView";
import { ExpensesView } from "@/components/expenses/ExpensesView";
import { InvoiceModal } from "@/components/invoice/InvoiceModal";
import { SettingsView } from "@/components/settings/SettingsView";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Sale } from "@/types";

function MainDashboard() {
  const { isHydrated, currentUser, products } = useStore();
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const lowStockCount = products?.filter((p) => p.stockQty <= p.minStockAlert).length || 0;

  // Active Sale for Invoice Modal
  const [activeInvoiceSale, setActiveInvoiceSale] = useState<Sale | null>(null);
  const [invoicePrintMode, setInvoicePrintMode] = useState<"thermal" | "a4">("thermal");

  // Load saved sidebar collapse preference on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sr_sidebar_collapsed");
      if (saved === "true") {
        setIsSidebarCollapsed(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Track previous tab to intelligently restore user preference when leaving POS Billing
  const prevTabRef = useRef<DashboardTab>(activeTab);

  // Auto collapse sidebar when navigating to POS Billing terminal for maximum screen space
  useEffect(() => {
    if (activeTab === "pos") {
      setIsSidebarCollapsed(true);
    } else if (prevTabRef.current === "pos") {
      // Restore user's saved preference when leaving POS terminal
      try {
        const saved = localStorage.getItem("sr_sidebar_collapsed");
        if (saved !== "true") {
          setIsSidebarCollapsed(false);
        }
      } catch {
        setIsSidebarCollapsed(false);
      }
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sr_sidebar_collapsed", String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Show clean spinner during initial hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-mono text-xs">
        Loading SR Telecom &amp; Library ERP...
      </div>
    );
  }

  // Security Gate: Require authentication
  if (!currentUser) {
    return <LoginView />;
  }

  const handleSaleComplete = (sale: Sale, printType: "thermal" | "a4" | "none") => {
    if (printType === "thermal" || printType === "a4") {
      setInvoicePrintMode(printType);
      setActiveInvoiceSale(sale);
    }
  };

  const handleSelectInvoice = (sale: Sale, mode: "thermal" | "a4") => {
    setInvoicePrintMode(mode);
    setActiveInvoiceSale(sale);
  };

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen flex bg-slate-100/70 text-slate-800">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* Main Content Area (Offset by sidebar width on lg screens) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        {/* Top Header Navbar */}
        <Navbar
          activeTab={activeTab}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenSettings={() => setActiveTab("settings")}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={handleToggleSidebarCollapse}
        />

        {/* View Routing Area */}
        <main className="flex-1 pb-24 lg:pb-12">
          {activeTab === "dashboard" && (
            <DashboardOverview
              onNavigate={handleTabChange}
              onSelectInvoice={handleSelectInvoice}
            />
          )}
          {activeTab === "pos" && (
            <POSView onSaleComplete={handleSaleComplete} />
          )}
          {activeTab === "invoices" && (
            <InvoicesListView onSelectInvoice={handleSelectInvoice} />
          )}
          {activeTab === "inventory" && <InventoryView />}
          {activeTab === "publishers" && <PublishersView />}
          {activeTab === "barcodes" && <BarcodeGeneratorView />}
          {activeTab === "customers" && <CustomersView />}
          {activeTab === "expenses" && <ExpensesView />}
          {activeTab === "returns" && <ReturnsView />}
          {activeTab === "reports" && (
            currentUser.role === "admin" ? (
              <ReportsView onSelectInvoice={handleSelectInvoice} />
            ) : (
              <AccessRestricted onBackToSafeTab={() => setActiveTab("pos")} />
            )
          )}
          {activeTab === "settings" && (
            currentUser.role === "admin" ? (
              <SettingsView />
            ) : (
              <AccessRestricted onBackToSafeTab={() => setActiveTab("pos")} />
            )
          )}
        </main>
      </div>

      {/* Mobile Native Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        lowStockCount={lowStockCount}
      />

      {/* Invoice Viewer & Print Modal */}
      {activeInvoiceSale && (
        <InvoiceModal
          sale={activeInvoiceSale}
          defaultMode={invoicePrintMode}
          onClose={() => setActiveInvoiceSale(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ModalProvider>
      <StoreProvider>
        <MainDashboard />
      </StoreProvider>
    </ModalProvider>
  );
}
