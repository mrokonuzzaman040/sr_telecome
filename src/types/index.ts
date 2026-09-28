export type ProductCategory = 'book' | 'stationery';

export type BookClass = 
  | 'Play / Nursery'
  | 'Class 1'
  | 'Class 2'
  | 'Class 3'
  | 'Class 4'
  | 'Class 5'
  | 'Class 6'
  | 'Class 7'
  | 'Class 8'
  | 'Class 9'
  | 'Class 10 (SSC)'
  | 'HSC 1st Year'
  | 'HSC 2nd Year'
  | 'Degree / Honours'
  | 'General';

export type BookPublisher = 
  | 'Panjeree'
  | 'Lecture'
  | 'Anupam'
  | 'Jupiter'
  | 'NCTB (Board)'
  | 'Nobodut'
  | 'Popy'
  | 'Royal'
  | 'Other';

export interface Product {
  id: string;
  name: string;
  bengaliName?: string;
  category: ProductCategory;
  barcode: string;
  sku: string;
  // Book specific fields
  publisher?: BookPublisher | string;
  bookClass?: BookClass | string;
  subject?: string;
  itemType?: string; // e.g. 'Guide', 'English Grammar', 'Bangla Grammar', 'Model Test', 'Textbook', etc.
  customCommissionRate?: number; // Specific commission override for this individual product
  editionYear?: string;
  // Pricing & Stock
  imageUrl?: string; // Optional book cover or product photo
  buyPrice: number; // Cost / ক্রয় মূল্য
  mrp: number; // Retail selling price / গায়ের মূল্য
  stockQty: number; // Current available stock
  minStockAlert: number; // Low stock threshold
  unit: string; // 'Piece', 'Dozen', 'Pkt', 'Box'
  createdAt: string;
  updatedAt: string;
}

export interface PublisherItemCommission {
  itemType: string; // e.g. "Guide", "English Grammar", "Bangla Grammar", "Textbook", etc.
  commissionRate: number; // % commission (e.g. 35, 40)
  notes?: string;
}

export const STANDARD_BOOK_ITEM_TYPES = [
  "Guide",
  "English Grammar",
  "Bangla Grammar",
  "Textbook (Board)",
  "Model Test / Test Paper",
  "Made Easy / Solution",
  "Dictionary",
  "General Knowledge",
  "Practical Notebook",
  "Islamic / Religious",
  "Literature / Story",
  "Other",
] as const;

export interface Publisher {
  id: string;
  name: string;
  bengaliName?: string;
  code: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  notes?: string;
  defaultCommissionRate?: number; // General default commission % for this publisher (e.g. 35%)
  itemCommissions?: PublisherItemCommission[]; // Item-type specific commission rules (e.g. Guide: 35%, Eng Grammar: 40%, Ban Grammar: 40%)
  createdAt: string;
}

export interface DailyBackup {
  id: string;
  backupDate: string; // YYYY-MM-DD
  backupType: 'auto_daily' | 'manual';
  dataSnapshot: any;
  summary: {
    totalProducts?: number;
    totalCustomers?: number;
    totalSales?: number;
    totalStockValue?: number;
    totalDue?: number;
    savedAt?: string;
  };
  notes?: string;
  createdAt: string;
}

export type CustomerType = 'agent' | 'single';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  type: CustomerType;
  defaultCommissionRate?: number; // e.g. 30% for agent
  totalPurchased: number;
  totalPaid: number;
  currentDue: number; // মোট বাকি
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  category: ProductCategory;
  quantity: number;
  buyPrice: number; // Historical cost at the moment of sale
  mrp: number;
  unitDiscount: number; // Discount per unit (for retail or agent)
  unitPrice: number; // Effective selling price per unit
  total: number; // quantity * unitPrice
  commissionRate?: number; // % if agent
}

export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'rocket' | 'bank' | 'due';

export interface Sale {
  id: string;
  invoiceNo: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerType: CustomerType;
  items: SaleItem[];
  subtotal: number; // Total MRP
  totalDiscount: number; // Total discount or agent commission
  payableAmount: number; // Subtotal - totalDiscount
  paidAmount: number; // Cash or MFS paid
  dueAmount: number; // Remaining due added to customer's account
  paymentMethod: PaymentMethod;
  paymentDetails?: {
    cashAmount?: number;
    mfsAmount?: number;
    mfsType?: 'bkash' | 'nagad' | 'rocket';
    mfsTrxId?: string;
  };
  totalCost: number; // Sum of items' buyPrice * qty
  grossProfit: number; // payableAmount - totalCost
  status: 'completed' | 'returned_partial' | 'returned_full';
  notes?: string;
  isModified?: boolean;
  modifiedAt?: string;
  modifiedReason?: string;
  createdAt: string; // ISO date
}

export type ReturnType = 'exchange' | 'replacement' | 'refund';

export interface ReturnedBookItem {
  productId: string;
  productName: string;
  quantity: number;
  mrp: number;
  commissionRate?: number; // % commission applied when sold
  unitDiscount?: number; // discount per unit in ৳
  unitPrice: number; // Effective refund rate per unit (mrp - unitDiscount)
  totalRefundValue: number; // quantity * unitPrice
  originalSoldQty?: number;
}

export interface ReplacementBookItem {
  productId: string;
  productName: string;
  quantity: number;
  mrp?: number;
  commissionRate?: number; // % commission / discount applied
  unitDiscount?: number; // discount per unit in ৳
  unitPrice: number; // Effective rate per unit (mrp - unitDiscount)
  totalValue: number; // quantity * unitPrice
}

export interface ReturnRecord {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  returnType: ReturnType; // 'exchange' | 'replacement' | 'refund'
  // Support multiple returned items:
  returnedItems: ReturnedBookItem[];
  // Backwards compatibility for single item:
  returnedItem: ReturnedBookItem;
  // Multiple replacement items:
  replacementItems?: ReplacementBookItem[];
  replacementItem?: ReplacementBookItem;
  totalRefundCredit: number; // Total refund value of all returned items
  totalReplacementValue?: number; // Total value of replacement items
  adjustmentType?: 'cash' | 'due_deduct'; // If refund: cash refund or deduct from current due
  reason: string;
  priceDifference: number; // replacementValue - refundValue (positive = customer pays extra, negative = shop refunds)
  createdAt: string;
}

export interface DuePayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: 'cash' | 'bkash' | 'nagad' | 'bank';
  trxId?: string;
  previousDue: number;
  remainingDue: number;
  notes?: string;
  invoiceNo?: string;
  invoiceId?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  category: 'rent' | 'electricity' | 'staff' | 'transport' | 'entertainment' | 'stationery_use' | 'other';
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export type UserRole = 'admin' | 'staff';

export interface AppUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  pin: string;
}

export interface ShopSettings {
  shopName: string;
  bengaliShopName: string;
  tagline: string;
  proprietor: string;
  phone: string;
  secondaryPhone?: string;
  address: string;
  vatRegistrationNo?: string;
  defaultAgentCommission: number; // e.g. 30%
  defaultRetailDiscount: number; // e.g. 10%
  invoiceFooterMessage: string;
  invoicePaperDefault: 'thermal_58mm' | 'thermal_80mm' | 'a4';
  // Document Numbering / Prefixes
  invoicePrefix: string; // e.g. "INV"
  invoiceIncludeYear: boolean; // adds current year into the invoice number
  invoicePadding: number; // digits to zero-pad the running number to, e.g. 4 -> 0001
  expensePrefix: string; // e.g. "EXP" for expense voucher numbers
  skuPrefix: string; // e.g. "BK" for auto-generated product SKUs
  // Appearance & Security
  themeColor?: string; // Hex color for accent/primary theme e.g. "#0f172a"
  fingerprintEnabled?: boolean; // Whether to use biometric/fingerprint login
}

export type NotificationType = 'sale' | 'low_stock' | 'due' | 'system';

export interface StoreNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: {
    saleId?: string;
    invoiceNo?: string;
    amount?: number;
    customerName?: string;
    productId?: string;
    productName?: string;
    stockQty?: number;
    [key: string]: any;
  };
  read: boolean;
  createdAt: string;
}
