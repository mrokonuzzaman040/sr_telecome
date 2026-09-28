"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Product,
  Customer,
  Sale,
  ReturnRecord,
  DuePayment,
  Expense,
  ShopSettings,
  AppUser,
  Publisher,
  DailyBackup,
  StoreNotification,
  NotificationType,
} from "@/types";
import {
  initialProducts,
  initialCustomers,
  initialShopSettings,
  initialUsers,
  initialPublishers,
} from "@/utils/mockData";
import { getTodayDateString } from "@/utils/formatters";
import { useModal, ModalOptions } from "@/context/ModalContext";
import { inferItemTypeFromProduct } from "@/utils/commissionHelper";
import { soundService } from "@/utils/soundHelper";
import { notificationService } from "@/utils/notificationHelper";

interface StoreContextType {
  isHydrated: boolean;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  returns: ReturnRecord[];
  duePayments: DuePayment[];
  expenses: Expense[];
  settings: ShopSettings;
  users: AppUser[];
  currentUser: AppUser | null;
  publishers: Publisher[];
  dailyBackups: DailyBackup[];

  // Auth Actions
  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserPin: (newPin: string, currentPin?: string, targetUserId?: string) => Promise<{ success: boolean; error?: string }>;

  // Product Actions
  addProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => Product;
  bulkAddProducts: (productList: Omit<Product, "id" | "createdAt" | "updatedAt">[]) => Promise<number>;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  restockProduct: (id: string, qtyToAdd: number, newBuyPrice?: number) => void;

  // Publisher Actions
  addPublisher: (publisher: Omit<Publisher, "id" | "createdAt">) => Promise<Publisher>;
  updatePublisher: (id: string, updates: Partial<Publisher>) => Promise<Publisher | null>;
  deletePublisher: (id: string) => Promise<boolean>;

  // Daily DB Backup Actions
  createDailyBackup: (type?: "auto_daily" | "manual", notes?: string) => Promise<boolean>;
  loadDailyBackups: () => Promise<void>;

  // Customer Actions
  addCustomer: (
    customer: Omit<Customer, "id" | "totalPurchased" | "totalPaid" | "currentDue" | "createdAt">
  ) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  recordDuePayment: (
    customerId: string,
    amount: number,
    paymentMethod: "cash" | "bkash" | "nagad" | "bank",
    trxId?: string,
    notes?: string,
    invoiceNo?: string
  ) => DuePayment | null;

  // Sale Actions
  createSale: (saleData: Omit<Sale, "id" | "invoiceNo" | "createdAt">) => Sale;
  updateSale: (id: string, updates: Partial<Sale>) => void;
  getSaleById: (id: string) => Sale | undefined;
  getSaleByInvoice: (invoiceNo: string) => Sale | undefined;

  // Return Actions
  processReturn: (returnData: Omit<ReturnRecord, "id" | "createdAt">) => ReturnRecord;

  // Expense Actions
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  deleteExpense: (id: string) => void;

  // Settings & Utilities
  updateSettings: (newSettings: Partial<ShopSettings>) => void;
  exportBackupJSON: () => string;
  importBackupJSON: (jsonStr: string) => boolean;
  resetToDefaultData: () => void;

  // Selected Date Filter (for Navbar calendar & store-wide views)
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  resetSelectedDate: () => void;

  // Notifications & Sound Alerts
  notifications: StoreNotification[];
  unreadNotificationsCount: number;
  addNotification: (notification: Omit<StoreNotification, "id" | "createdAt" | "read">) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  desktopNotificationsEnabled: boolean;
  requestDesktopNotificationPermission: () => Promise<boolean>;
  testSaleNotification: () => void;

  // Custom Modal Alerts and Confirmations
  showAlert: (
    message: string,
    options?: Omit<ModalOptions, "message">
  ) => Promise<void>;
  showConfirm: (
    message: string,
    options?: Omit<ModalOptions, "message">
  ) => Promise<boolean>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: "sr_pos_products_v1",
  CUSTOMERS: "sr_pos_customers_v1",
  SALES: "sr_pos_sales_v1",
  RETURNS: "sr_pos_returns_v1",
  DUE_PAYMENTS: "sr_pos_due_payments_v1",
  EXPENSES: "sr_pos_expenses_v1",
  SETTINGS: "sr_pos_settings_v1",
  USERS: "sr_pos_users_v1",
  CURRENT_USER: "sr_pos_current_user_v1",
  PUBLISHERS: "sr_pos_publishers_v1",
  DAILY_BACKUPS: "sr_pos_daily_backups_v1",
  NOTIFICATIONS: "sr_pos_notifications_v1",
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { showAlert, showConfirm } = useModal();
  const [isHydrated, setIsHydrated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [duePayments, setDuePayments] = useState<DuePayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(initialShopSettings);
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [publishers, setPublishers] = useState<Publisher[]>(initialPublishers);
  const [dailyBackups, setDailyBackups] = useState<DailyBackup[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Notification & Sound Alerts State
  const [notifications, setNotifications] = useState<StoreNotification[]>([]);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState<boolean>(false);
  const knownSaleIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialSyncRef = React.useRef<boolean>(true);

  const resetSelectedDate = () => setSelectedDate(getTodayDateString());

  const syncLiveStoreData = useCallback((userRole?: string) => {
    const fetchPromises = [
      fetch("/api/products").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/customers").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/sales").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/returns").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/due-payments").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/expenses").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/publishers").then((r) => (r.ok ? r.json() : null)),
    ];

    if (userRole === "admin") {
      fetchPromises.push(
        fetch("/api/backups").then((r) => (r.ok ? r.json() : null))
      );
    }

    Promise.allSettled(fetchPromises).then(([pRes, cRes, sRes, rRes, dRes, eRes, pubRes, bkpRes]) => {
      if (pRes?.status === "fulfilled" && Array.isArray(pRes.value) && pRes.value.length > 0) {
        setProducts(pRes.value);
      }
      if (cRes?.status === "fulfilled" && Array.isArray(cRes.value) && cRes.value.length > 0) {
        setCustomers(cRes.value);
      }
      if (sRes?.status === "fulfilled" && Array.isArray(sRes.value)) {
        const fetchedSales: Sale[] = sRes.value;
        setSales(fetchedSales);

        // Detect newly arrived sales from other devices/cashiers
        if (!isInitialSyncRef.current && knownSaleIdsRef.current.size > 0) {
          const newRemoteSales = fetchedSales.filter(
            (s) => !knownSaleIdsRef.current.has(s.id)
          );
          if (newRemoteSales.length > 0) {
            const latest = newRemoteSales[0];
            notificationService.triggerSaleAlert({
              invoiceNo: latest.invoiceNo,
              amount: latest.payableAmount,
              customerName: latest.customerName,
              itemCount: latest.items?.length || 1,
            });
            setNotifications((prev) => [
              ...newRemoteSales.map((s) => ({
                id: `notif-${Date.now()}-${s.id}`,
                type: "sale" as NotificationType,
                title: `নতুন বিক্রয় সম্পন্ন (#${s.invoiceNo})`,
                message: `${s.customerName ? `${s.customerName} - ` : ""}মোট ৳${s.payableAmount.toLocaleString()}${s.dueAmount > 0 ? ` | বাকি: ৳${s.dueAmount}` : ""}`,
                metadata: {
                  saleId: s.id,
                  invoiceNo: s.invoiceNo,
                  amount: s.payableAmount,
                  customerName: s.customerName,
                },
                read: false,
                createdAt: s.createdAt || new Date().toISOString(),
              })),
              ...prev,
            ].slice(0, 50));
          }
        }

        fetchedSales.forEach((s) => knownSaleIdsRef.current.add(s.id));
        isInitialSyncRef.current = false;
      }
      if (rRes?.status === "fulfilled" && Array.isArray(rRes.value)) {
        setReturns(rRes.value);
      }
      if (dRes?.status === "fulfilled" && Array.isArray(dRes.value)) {
        setDuePayments(dRes.value);
      }
      if (eRes?.status === "fulfilled" && Array.isArray(eRes.value)) {
        setExpenses(eRes.value);
      }
      if (pubRes?.status === "fulfilled" && Array.isArray(pubRes.value) && pubRes.value.length > 0) {
        setPublishers(pubRes.value);
      }
      if (bkpRes && bkpRes.status === "fulfilled" && Array.isArray(bkpRes.value)) {
        setDailyBackups(bkpRes.value);
      }

      // If admin, trigger daily auto-backup to Supabase silently
      if (userRole === "admin") {
        fetch("/api/backups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ backupType: "auto_daily" }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data?.backup) {
              setDailyBackups((prev) => [data.backup, ...prev.filter((b) => b.id !== data.backup.id)]);
            }
          })
          .catch(() => {});
      }
    }).catch((err) => {
      console.warn("Live store sync fallback:", err);
    });
  }, []);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const storedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      const storedSales = localStorage.getItem(STORAGE_KEYS.SALES);
      const storedReturns = localStorage.getItem(STORAGE_KEYS.RETURNS);
      const storedDuePayments = localStorage.getItem(STORAGE_KEYS.DUE_PAYMENTS);
      const storedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      const storedCurrentUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      const storedPublishers = localStorage.getItem(STORAGE_KEYS.PUBLISHERS);
      const storedDailyBackups = localStorage.getItem(STORAGE_KEYS.DAILY_BACKUPS);

      let parsedProducts: Product[] = storedProducts ? JSON.parse(storedProducts) : initialProducts;
      parsedProducts = parsedProducts.map((p) => {
        if (!p.itemType && p.category === "book") {
          return {
            ...p,
            itemType: inferItemTypeFromProduct(p.name, p.bengaliName, p.subject),
          };
        }
        return p;
      });

      let parsedPublishers: Publisher[] = storedPublishers ? JSON.parse(storedPublishers) : initialPublishers;
      parsedPublishers = parsedPublishers.map((p) => {
        const initPub = initialPublishers.find(
          (ip) => ip.name.toLowerCase() === p.name.toLowerCase() || ip.code.toLowerCase() === p.code.toLowerCase()
        );
        if (initPub) {
          return {
            ...p,
            defaultCommissionRate: p.defaultCommissionRate ?? initPub.defaultCommissionRate ?? 35,
            itemCommissions:
              p.itemCommissions && p.itemCommissions.length > 0
                ? p.itemCommissions
                : initPub.itemCommissions,
          };
        }
        return {
          ...p,
          defaultCommissionRate: p.defaultCommissionRate ?? 35,
        };
      });

      setProducts(parsedProducts);
      setCustomers(storedCustomers ? JSON.parse(storedCustomers) : initialCustomers);
      setSales(storedSales ? JSON.parse(storedSales) : []);
      setReturns(storedReturns ? JSON.parse(storedReturns) : []);
      setDuePayments(storedDuePayments ? JSON.parse(storedDuePayments) : []);
      setExpenses(storedExpenses ? JSON.parse(storedExpenses) : []);
      setSettings(
        storedSettings ? { ...initialShopSettings, ...JSON.parse(storedSettings) } : initialShopSettings
      );
      setPublishers(parsedPublishers);
      setDailyBackups(storedDailyBackups ? JSON.parse(storedDailyBackups) : []);
      
      const loadedUsers: AppUser[] = storedUsers ? JSON.parse(storedUsers) : initialUsers;
      setUsers(loadedUsers);

      // Load stored notifications
      const storedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (storedNotifs) {
        try {
          setNotifications(JSON.parse(storedNotifs));
        } catch {}
      }
      setSoundEnabledState(soundService.isEnabled());
      if (typeof window !== "undefined" && "Notification" in window) {
        setDesktopNotificationsEnabled(Notification.permission === "granted");
      }

      if (storedCurrentUser) {
        try {
          setCurrentUser(JSON.parse(storedCurrentUser));
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }

      // Verify session with server and only sync protected data if authenticated
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data.user));
            syncLiveStoreData(data.user.role);
          } else {
            setCurrentUser(null);
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          }
        })
        .catch(() => {
          if (storedCurrentUser) {
            try {
              const u = JSON.parse(storedCurrentUser);
              setCurrentUser(u);
              syncLiveStoreData(u.role);
            } catch {
              setCurrentUser(null);
            }
          }
        });
    } catch (e) {
      console.error("Failed to load storage data:", e);
      setProducts(initialProducts);
      setCustomers(initialCustomers);
      setSettings(initialShopSettings);
      setUsers(initialUsers);
      setPublishers(initialPublishers);
      setCurrentUser(null);
    } finally {
      setIsHydrated(true);
    }
  }, [syncLiveStoreData]);

  // Periodic polling for multi-device sync (e.g., sales made on Android mobile app)
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      syncLiveStoreData(currentUser.role);
    }, 20000);
    return () => clearInterval(interval);
  }, [currentUser, syncLiveStoreData]);

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
      localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(returns));
      localStorage.setItem(STORAGE_KEYS.DUE_PAYMENTS, JSON.stringify(duePayments));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      localStorage.setItem(STORAGE_KEYS.PUBLISHERS, JSON.stringify(publishers));
      localStorage.setItem(STORAGE_KEYS.DAILY_BACKUPS, JSON.stringify(dailyBackups));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications.slice(0, 50)));
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.error("Failed to persist data to localStorage:", e);
    }
  }, [products, customers, sales, returns, duePayments, expenses, settings, users, currentUser, publishers, dailyBackups, notifications, isHydrated]);

  // Auth Methods
  const login = async (
    username: string,
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data.user));
        syncLiveStoreData(data.user.role);
        return { success: true };
      }
      return {
        success: false,
        error: data.error || "Invalid username or PIN code.",
      };
    } catch (err: any) {
      console.error("Login failed:", err);
      return {
        success: false,
        error: err?.message || "Authentication network error.",
      };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  };

  const updateUserPin = async (
    newPin: string,
    currentPin?: string,
    targetUserId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPin, currentPin, targetUserId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return {
        success: false,
        error: data.error || "Failed to update PIN.",
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Network error updating PIN.",
      };
    }
  };

  // Product Actions
  const addProduct = (productData: Omit<Product, "id" | "createdAt" | "updatedAt">): Product => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);

    // Supabase DB Sync
    fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProduct),
    }).catch((err) => console.error("API product add sync error:", err));

    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      )
    );

    // Supabase DB Sync
    fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    }).catch((err) => console.error("API product update sync error:", err));
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));

    // Supabase DB Sync
    fetch(`/api/products?id=${id}`, {
      method: "DELETE",
    }).catch((err) => console.error("API product delete sync error:", err));
  };

  const restockProduct = (id: string, qtyToAdd: number, newBuyPrice?: number) => {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updatedQty = Math.max(0, item.stockQty + qtyToAdd);
        const updatedBuyPrice = newBuyPrice !== undefined && newBuyPrice > 0 ? newBuyPrice : item.buyPrice;

        // Supabase DB Sync
        fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, stockQty: updatedQty, buyPrice: updatedBuyPrice }),
        }).catch((err) => console.error("API product restock sync error:", err));

        return {
          ...item,
          stockQty: updatedQty,
          buyPrice: updatedBuyPrice,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const bulkAddProducts = async (
    productList: Omit<Product, "id" | "createdAt" | "updatedAt">[]
  ): Promise<number> => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: productList }),
      });
      const data = await res.json();
      if (data.products && Array.isArray(data.products)) {
        setProducts((prev) => {
          const map = new Map(prev.map((p) => [p.barcode, p]));
          for (const item of data.products) {
            map.set(item.barcode, item);
          }
          return Array.from(map.values());
        });
        return data.count || data.products.length;
      }
      return 0;
    } catch (err) {
      console.error("bulkAddProducts error:", err);
      const newItems: Product[] = productList.map((item) => ({
        ...item,
        id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setProducts((prev) => [...newItems, ...prev]);
      return newItems.length;
    }
  };

  // Publisher Actions
  const addPublisher = async (
    publisherData: Omit<Publisher, "id" | "createdAt">
  ): Promise<Publisher> => {
    const newPub: Publisher = {
      ...publisherData,
      id: `pub-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setPublishers((prev) => [
      newPub,
      ...prev.filter((p) => p.name.toLowerCase() !== newPub.name.toLowerCase()),
    ]);

    try {
      const res = await fetch("/api/publishers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPub),
      });
      const data = await res.json();
      if (data.publisher) {
        setPublishers((prev) => [
          data.publisher,
          ...prev.filter((p) => p.id !== newPub.id && p.name !== data.publisher.name),
        ]);
        return data.publisher;
      }
    } catch (err) {
      console.error("Publisher add sync error:", err);
    }
    return newPub;
  };

  const updatePublisher = async (
    id: string,
    updates: Partial<Publisher>
  ): Promise<Publisher | null> => {
    let targetPub: Publisher | null = null;
    setPublishers((prev) =>
      prev.map((pub) => {
        if (pub.id === id) {
          targetPub = { ...pub, ...updates };
          return targetPub;
        }
        return pub;
      })
    );

    if (targetPub) {
      try {
        const res = await fetch("/api/publishers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(targetPub),
        });
        const data = await res.json();
        if (data.publisher) {
          setPublishers((prev) =>
            prev.map((p) => (p.id === id ? data.publisher : p))
          );
          return data.publisher;
        }
      } catch (err) {
        console.error("Publisher update sync error:", err);
      }
    }
    return targetPub;
  };

  const deletePublisher = async (id: string): Promise<boolean> => {
    setPublishers((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/publishers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      return true;
    } catch (err) {
      console.error("Publisher delete sync error:", err);
      return false;
    }
  };

  // Daily DB Backup Actions
  const loadDailyBackups = async () => {
    try {
      const res = await fetch("/api/backups");
      const data = await res.json();
      if (Array.isArray(data)) {
        setDailyBackups(data);
        localStorage.setItem(STORAGE_KEYS.DAILY_BACKUPS, JSON.stringify(data));
      }
    } catch (err) {
      console.error("Failed to load daily backups:", err);
    }
  };

  const createDailyBackup = async (
    type: "auto_daily" | "manual" = "manual",
    notes?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch("/api/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupType: type, notes, force: type === "manual" }),
      });
      const data = await res.json();
      if (data.success && data.backup) {
        setDailyBackups((prev) => [
          data.backup,
          ...prev.filter((b) => b.id !== data.backup.id),
        ]);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Create daily backup error:", err);
      return false;
    }
  };

  // Customer Actions
  const addCustomer = (
    customerData: Omit<Customer, "id" | "totalPurchased" | "totalPaid" | "currentDue" | "createdAt">
  ): Customer => {
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      totalPurchased: 0,
      totalPaid: 0,
      currentDue: 0,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);

    // Supabase DB Sync
    fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer),
    }).catch((err) => console.error("API customer add sync error:", err));

    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((cust) => (cust.id === id ? { ...cust, ...updates } : cust))
    );
  };

  const recordDuePayment = (
    customerId: string,
    amount: number,
    paymentMethod: "cash" | "bkash" | "nagad" | "bank",
    trxId?: string,
    notes?: string,
    invoiceNo?: string
  ): DuePayment | null => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return null;

    const previousDue = customer.currentDue;
    const remainingDue = Math.max(0, previousDue - amount);

    // If payment is linked to a specific invoice, update the sale and mark modified
    if (invoiceNo) {
      const modReason = `Due payment of ৳${amount} collected (${paymentMethod})`;
      setSales((prev) =>
        prev.map((s) => {
          if (s.invoiceNo === invoiceNo) {
            return {
              ...s,
              paidAmount: s.paidAmount + amount,
              dueAmount: Math.max(0, s.dueAmount - amount),
              isModified: true,
              modifiedAt: new Date().toISOString(),
              modifiedReason: modReason,
            };
          }
          return s;
        })
      );
    }

    const payment: DuePayment = {
      id: `pay-${Date.now()}`,
      customerId,
      customerName: customer.name,
      amount,
      paymentMethod,
      trxId,
      previousDue,
      remainingDue,
      notes,
      invoiceNo: invoiceNo || undefined,
      createdAt: new Date().toISOString(),
    };

    setDuePayments((prev) => [payment, ...prev]);

    // Update customer due
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              totalPaid: c.totalPaid + amount,
              currentDue: remainingDue,
            }
          : c
      )
    );

    // Supabase DB Sync
    fetch("/api/due-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payment),
    }).catch((err) => console.error("API due payment sync error:", err));

    return payment;
  };

  const updateSale = (id: string, updates: Partial<Sale>) => {
    setSales((prev) =>
      prev.map((s) =>
        s.id === id || s.invoiceNo === id
          ? {
              ...s,
              ...updates,
              isModified: true,
              modifiedAt: new Date().toISOString(),
            }
          : s
      )
    );

    fetch("/api/sales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates, isModified: true }),
    }).catch((err) => console.error("API update sale sync error:", err));
  };

  // Notification Actions
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const setSoundEnabled = (enabled: boolean) => {
    soundService.setEnabled(enabled);
    setSoundEnabledState(enabled);
  };

  const requestDesktopNotificationPermission = async (): Promise<boolean> => {
    const granted = await notificationService.requestPermission();
    setDesktopNotificationsEnabled(granted);
    return granted;
  };

  const addNotification = (
    notifData: Omit<StoreNotification, "id" | "createdAt" | "read">
  ) => {
    const newNotif: StoreNotification = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const testSaleNotification = () => {
    notificationService.triggerSaleAlert({
      invoiceNo: "TEST-9922",
      amount: 1540,
      customerName: "পরীক্ষামূলক ক্রেতা",
      itemCount: 3,
    });
    addNotification({
      type: "sale",
      title: "টেস্ট বিক্রয় নোটিফিকেশন",
      message: "ইনভয়েস #TEST-9922 - মোট: ৳1,540 (পরীক্ষামূলক ক্রেতা)",
      metadata: { invoiceNo: "TEST-9922", amount: 1540, customerName: "পরীক্ষামূলক ক্রেতা" },
    });
  };

  // Sale Actions
  const createSale = (saleData: Omit<Sale, "id" | "invoiceNo" | "createdAt">): Sale => {
    const prefix = settings.invoicePrefix?.trim() || "INV";
    const padding = settings.invoicePadding ?? 4;
    const runningNo = String(sales.length + 1).padStart(padding, "0");
    const invoiceNumber = settings.invoiceIncludeYear
      ? `${prefix}-${new Date().getFullYear()}-${runningNo}`
      : `${prefix}-${runningNo}`;
    const newSale: Sale = {
      ...saleData,
      id: `sale-${Date.now()}`,
      invoiceNo: invoiceNumber,
      createdAt: new Date().toISOString(),
    };

    setSales((prev) => [newSale, ...prev]);
    knownSaleIdsRef.current.add(newSale.id);

    // 1. Audio chime & Desktop push alert
    notificationService.triggerSaleAlert({
      invoiceNo: newSale.invoiceNo,
      amount: newSale.payableAmount,
      customerName: newSale.customerName,
      itemCount: newSale.items.length,
    });

    // 2. Add to in-app notification center
    const notifMessage = `${newSale.customerName ? `${newSale.customerName} - ` : ""}মোট ৳${newSale.payableAmount.toLocaleString()} (${newSale.items.length} টি পণ্য)${
      newSale.dueAmount > 0 ? ` | বাকি: ৳${newSale.dueAmount.toLocaleString()}` : " | নগদ পরিশোধ"
    }`;
    addNotification({
      type: "sale",
      title: `নতুন বিক্রয় সম্পন্ন (#${newSale.invoiceNo})`,
      message: notifMessage,
      metadata: {
        saleId: newSale.id,
        invoiceNo: newSale.invoiceNo,
        amount: newSale.payableAmount,
        customerName: newSale.customerName,
      },
    });

    // 3. Deduct stock for each sold item in state & check low-stock thresholds
    setProducts((prev) =>
      prev.map((prod) => {
        const soldItem = newSale.items.find((item) => item.productId === prod.id);
        if (soldItem) {
          const remaining = Math.max(0, prod.stockQty - soldItem.quantity);
          if (remaining <= prod.minStockAlert) {
            notificationService.triggerLowStockAlert({
              productName: prod.name,
              stockQty: remaining,
            });
            addNotification({
              type: "low_stock",
              title: `কম স্টক সতর্কতা: ${prod.name}`,
              message: `"${prod.name}" বইয়ের স্টক কমে মাত্র ${remaining} টি অবশিষ্ট রয়েছে!`,
              metadata: {
                productId: prod.id,
                productName: prod.name,
                stockQty: remaining,
              },
            });
          }
          return {
            ...prod,
            stockQty: remaining,
            updatedAt: new Date().toISOString(),
          };
        }
        return prod;
      })
    );

    // Update customer totals in state if sale is linked to a customer
    if (newSale.customerId) {
      setCustomers((prev) =>
        prev.map((cust) => {
          if (cust.id === newSale.customerId) {
            return {
              ...cust,
              totalPurchased: cust.totalPurchased + newSale.payableAmount,
              totalPaid: cust.totalPaid + newSale.paidAmount,
              currentDue: cust.currentDue + newSale.dueAmount,
            };
          }
          return cust;
        })
      );
    }

    // Supabase DB Sync (Atomic transaction for sales, stock deduction, and ledger update)
    fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSale),
    }).catch((err) => console.error("API sale sync error:", err));

    return newSale;
  };

  const getSaleById = (id: string) => sales.find((s) => s.id === id);
  const getSaleByInvoice = (invoiceNo: string) => sales.find((s) => s.invoiceNo === invoiceNo);

  // Return Actions
  const processReturn = (returnData: Omit<ReturnRecord, "id" | "createdAt">): ReturnRecord => {
    const returnedItems = returnData.returnedItems && returnData.returnedItems.length > 0
      ? returnData.returnedItems
      : [returnData.returnedItem];

    const replacementItems = returnData.replacementItems && returnData.replacementItems.length > 0
      ? returnData.replacementItems
      : (returnData.replacementItem ? [returnData.replacementItem] : []);

    const primaryReturnedItem = returnedItems[0];
    const primaryReplacementItem = replacementItems[0];

    const newReturn: ReturnRecord = {
      ...returnData,
      returnedItems,
      returnedItem: primaryReturnedItem,
      replacementItems,
      replacementItem: primaryReplacementItem,
      id: `ret-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setReturns((prev) => [newReturn, ...prev]);

    // Restock all returned items & deduct replacement items
    setProducts((prev) => {
      // Build lookup maps for stock adjustment
      const returnQtyMap: Record<string, number> = {};
      returnedItems.forEach((it) => {
        if (it?.productId) {
          returnQtyMap[it.productId] = (returnQtyMap[it.productId] || 0) + Number(it.quantity || 0);
        }
      });

      const replaceQtyMap: Record<string, number> = {};
      replacementItems.forEach((it) => {
        if (it?.productId) {
          replaceQtyMap[it.productId] = (replaceQtyMap[it.productId] || 0) + Number(it.quantity || 0);
        }
      });

      return prev.map((prod) => {
        const addedStock = returnQtyMap[prod.id] || 0;
        const deductedStock = replaceQtyMap[prod.id] || 0;

        if (addedStock > 0 || deductedStock > 0) {
          const nextStock = Math.max(0, prod.stockQty + addedStock - deductedStock);
          return {
            ...prod,
            stockQty: nextStock,
            updatedAt: new Date().toISOString(),
          };
        }
        return prod;
      });
    });

    // Update customer due if customer specified and not walkin
    if (newReturn.customerId && newReturn.customerId !== 'walkin' && newReturn.priceDifference !== 0) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === newReturn.customerId) {
            const updatedDue = Math.max(0, c.currentDue + newReturn.priceDifference);
            return {
              ...c,
              currentDue: updatedDue,
            };
          }
          return c;
        })
      );
    }

    // Mark invoice as modified if attached to an existing sale
    if (newReturn.invoiceNo && newReturn.invoiceNo !== 'DIRECT-COUNTER' && newReturn.invoiceNo !== 'COUNTER-RETURN') {
      const returnModReason = `Items returned/exchanged (${newReturn.returnType})`;
      setSales((prev) =>
        prev.map((s) => {
          if (s.invoiceNo === newReturn.invoiceNo || s.id === newReturn.invoiceId) {
            return {
              ...s,
              isModified: true,
              modifiedAt: new Date().toISOString(),
              modifiedReason: returnModReason,
            };
          }
          return s;
        })
      );
    }

    // Supabase DB Sync
    fetch("/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newReturn),
    }).catch((err) => console.error("API return sync error:", err));

    return newReturn;
  };

  // Expense Actions
  const addExpense = (expenseData: Omit<Expense, "id" | "createdAt">) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExpense, ...prev]);

    // Supabase DB Sync
    fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newExpense),
    }).catch((err) => console.error("API expense add sync error:", err));
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    // Supabase DB Sync
    fetch(`/api/expenses?id=${id}`, {
      method: "DELETE",
    }).catch((err) => console.error("API expense delete sync error:", err));
  };

  // Settings & Utilities
  const updateSettings = (newSettings: Partial<ShopSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const exportBackupJSON = (): string => {
    const backupData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      shopSettings: settings,
      products,
      customers,
      sales,
      returns,
      duePayments,
      expenses,
    };
    return JSON.stringify(backupData, null, 2);
  };

  const importBackupJSON = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.products || !data.customers) {
        throw new Error("Invalid backup format");
      }
      if (data.products) setProducts(data.products);
      if (data.customers) setCustomers(data.customers);
      if (data.sales) setSales(data.sales);
      if (data.returns) setReturns(data.returns);
      if (data.duePayments) setDuePayments(data.duePayments);
      if (data.expenses) setExpenses(data.expenses);
      if (data.shopSettings) setSettings(data.shopSettings);
      return true;
    } catch (err) {
      console.error("Import backup error:", err);
      return false;
    }
  };

  const resetToDefaultData = () => {
    setProducts(initialProducts);
    setCustomers(initialCustomers);
    setSales([]);
    setReturns([]);
    setDuePayments([]);
    setExpenses([]);
    setSettings(initialShopSettings);
  };

  return (
    <StoreContext.Provider
      value={{
        isHydrated,
        products,
        customers,
        sales,
        returns,
        duePayments,
        expenses,
        settings,
        users,
        currentUser,
        publishers,
        dailyBackups,
        login,
        logout,
        updateUserPin,
        addProduct,
        bulkAddProducts,
        updateProduct,
        deleteProduct,
        restockProduct,
        addPublisher,
        updatePublisher,
        deletePublisher,
        createDailyBackup,
        loadDailyBackups,
        addCustomer,
        updateCustomer,
        recordDuePayment,
        createSale,
        updateSale,
        getSaleById,
        getSaleByInvoice,
        processReturn,
        addExpense,
        deleteExpense,
        updateSettings,
        exportBackupJSON,
        importBackupJSON,
        resetToDefaultData,
        selectedDate,
        setSelectedDate,
        resetSelectedDate,
        notifications,
        unreadNotificationsCount,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        soundEnabled,
        setSoundEnabled,
        desktopNotificationsEnabled,
        requestDesktopNotificationPermission,
        testSaleNotification,
        showAlert,
        showConfirm,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
