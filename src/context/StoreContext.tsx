"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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
  login: (username: string, pin: string) => boolean;
  logout: () => void;
  updateUserPin: (userId: string, newPin: string) => boolean;

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
    notes?: string
  ) => DuePayment | null;

  // Sale Actions
  createSale: (saleData: Omit<Sale, "id" | "invoiceNo" | "createdAt">) => Sale;
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

  const resetSelectedDate = () => setSelectedDate(getTodayDateString());

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

      if (storedCurrentUser) {
        setCurrentUser(JSON.parse(storedCurrentUser));
      } else {
        setCurrentUser(null);
      }

      // Live asynchronous sync with Supabase PostgreSQL Database
      Promise.allSettled([
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()),
        fetch("/api/sales").then((r) => r.json()),
        fetch("/api/returns").then((r) => r.json()),
        fetch("/api/due-payments").then((r) => r.json()),
        fetch("/api/expenses").then((r) => r.json()),
        fetch("/api/publishers").then((r) => r.json()),
        fetch("/api/backups").then((r) => r.json()),
      ]).then(([pRes, cRes, sRes, rRes, dRes, eRes, pubRes, bkpRes]) => {
        if (pRes.status === "fulfilled" && Array.isArray(pRes.value) && pRes.value.length > 0) {
          setProducts(pRes.value);
        }
        if (cRes.status === "fulfilled" && Array.isArray(cRes.value) && cRes.value.length > 0) {
          setCustomers(cRes.value);
        }
        if (sRes.status === "fulfilled" && Array.isArray(sRes.value)) {
          setSales(sRes.value);
        }
        if (rRes.status === "fulfilled" && Array.isArray(rRes.value)) {
          setReturns(rRes.value);
        }
        if (dRes.status === "fulfilled" && Array.isArray(dRes.value)) {
          setDuePayments(dRes.value);
        }
        if (eRes.status === "fulfilled" && Array.isArray(eRes.value)) {
          setExpenses(eRes.value);
        }
        if (pubRes.status === "fulfilled" && Array.isArray(pubRes.value) && pubRes.value.length > 0) {
          setPublishers(pubRes.value);
        }
        if (bkpRes.status === "fulfilled" && Array.isArray(bkpRes.value)) {
          setDailyBackups(bkpRes.value);
        }

        // Trigger daily auto-backup to Supabase silently
        fetch("/api/backups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ backupType: "auto_daily" }),
        }).then(res => res.json()).then(data => {
          if (data?.backup) {
            setDailyBackups(prev => [data.backup, ...prev.filter(b => b.id !== data.backup.id)]);
          }
        }).catch(() => {});
      }).catch((err) => {
        console.warn("Supabase initial fetch fallback to local cache:", err);
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
  }, []);

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
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.error("Failed to persist data to localStorage:", e);
    }
  }, [products, customers, sales, returns, duePayments, expenses, settings, users, currentUser, publishers, dailyBackups, isHydrated]);

  // Auth Methods
  const login = (username: string, pin: string): boolean => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPin = pin.trim();
    const matched = users.find(
      (u) => (u.username.toLowerCase() === cleanUser || u.role.toLowerCase() === cleanUser) && u.pin === cleanPin
    );
    if (matched) {
      setCurrentUser(matched);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(matched));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  };

  const updateUserPin = (userId: string, newPin: string): boolean => {
    if (!newPin || newPin.length < 4) return false;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, pin: newPin } : u))
    );
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, pin: newPin } : null));
    }
    return true;
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
    notes?: string
  ): DuePayment | null => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return null;

    const previousDue = customer.currentDue;
    const remainingDue = Math.max(0, previousDue - amount);

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

    // Deduct stock for each sold item in state
    setProducts((prev) =>
      prev.map((prod) => {
        const soldItem = newSale.items.find((item) => item.productId === prod.id);
        if (soldItem) {
          return {
            ...prod,
            stockQty: Math.max(0, prod.stockQty - soldItem.quantity),
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
