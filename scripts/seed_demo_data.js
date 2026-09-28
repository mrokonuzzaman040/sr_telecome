// Seeds demo products, customers and sales via the running Next.js API
// so all app-side logic (stock deduction, customer ledger) runs the same
// way it would for real data entry. Run with the dev server already up.
const BASE = process.env.SEED_BASE_URL || "http://localhost:3001";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

const PUBLISHERS = ["Panjeree", "Lecture", "Anupam", "Jupiter", "NCTB", "Nobodut", "Royal", "Popy"];

const PRODUCTS = [
  { name: "Panjeree SSC English Guide", bengaliName: "পাঞ্জেরী এসএসসি ইংরেজি গাইড", publisher: "Panjeree", bookClass: "Class 10 (SSC)", subject: "English", itemType: "Guide", buyPrice: 180, mrp: 280, stockQty: 40 },
  { name: "Lecture HSC Bangla Grammar", bengaliName: "লেকচার এইচএসসি বাংলা ব্যাকরণ", publisher: "Lecture", bookClass: "Class 12 (HSC)", subject: "Bangla", itemType: "Bangla Grammar", buyPrice: 120, mrp: 190, stockQty: 35 },
  { name: "Anupam Model Test Physics", bengaliName: "অনুপম মডেল টেস্ট পদার্থবিজ্ঞান", publisher: "Anupam", bookClass: "Class 11-12", subject: "Physics", itemType: "Test Paper", buyPrice: 90, mrp: 150, stockQty: 25 },
  { name: "Jupiter Commerce Guide", bengaliName: "জুপিটার কমার্স গাইড", publisher: "Jupiter", bookClass: "Class 11-12", subject: "Accounting", itemType: "Guide", buyPrice: 200, mrp: 320, stockQty: 30 },
  { name: "NCTB Class 9 Science Textbook", bengaliName: "এনসিটিবি নবম শ্রেণি বিজ্ঞান", publisher: "NCTB", bookClass: "Class 9", subject: "Science", itemType: "Textbook", buyPrice: 60, mrp: 95, stockQty: 60 },
  { name: "Nobodut SSC Math Solution", bengaliName: "নবদূত এসএসসি গণিত সমাধান", publisher: "Nobodut", bookClass: "Class 10 (SSC)", subject: "Math", itemType: "Guide", buyPrice: 150, mrp: 240, stockQty: 28 },
  { name: "Royal Chemistry Practical Book", bengaliName: "রয়্যাল রসায়ন ব্যবহারিক খাতা", publisher: "Royal", bookClass: "Class 11-12", subject: "Chemistry", itemType: "Practical Book", buyPrice: 70, mrp: 120, stockQty: 45 },
  { name: "Popy English to Bangla Dictionary", bengaliName: "পপি ইংরেজি টু বাংলা অভিধান", publisher: "Popy", bookClass: "General", subject: "Dictionary", itemType: "Reference", buyPrice: 100, mrp: 180, stockQty: 20 },
  { name: "Gel Pen (Blue) - Box of 10", bengaliName: "জেল কলম (নীল) - ১০ পিস বক্স", category: "stationery", publisher: null, bookClass: null, subject: null, itemType: null, buyPrice: 80, mrp: 120, stockQty: 100, unit: "Box" },
  { name: "A4 Exercise Notebook 100pg", bengaliName: "এ৪ খাতা ১০০ পাতা", category: "stationery", publisher: null, bookClass: null, subject: null, itemType: null, buyPrice: 25, mrp: 40, stockQty: 150, unit: "Piece" },
];

const CUSTOMERS = [
  { name: "Karim Book Agency", phone: "01711000111", address: "Mirpur-10, Dhaka", type: "agent", defaultCommissionRate: 30 },
  { name: "Rahim Traders", phone: "01911000222", address: "Mohammadpur, Dhaka", type: "agent", defaultCommissionRate: 25 },
  { name: "Fahim Uddin (Student)", phone: "01611000333", address: "Dhanmondi, Dhaka", type: "single", defaultCommissionRate: 0 },
];

function barcode() {
  return `BC${Date.now()}${Math.floor(Math.random() * 9000 + 1000)}`;
}

async function main() {
  console.log(`Seeding demo data against ${BASE} ...`);

  const insertedProducts = [];
  for (const p of PRODUCTS) {
    const payload = {
      name: p.name,
      bengaliName: p.bengaliName,
      category: p.category || "book",
      barcode: barcode(),
      sku: `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      publisher: p.publisher,
      bookClass: p.bookClass,
      subject: p.subject,
      itemType: p.itemType,
      buyPrice: p.buyPrice,
      mrp: p.mrp,
      stockQty: p.stockQty,
      minStockAlert: 5,
      unit: p.unit || "Piece",
    };
    const res = await post("/api/products", payload);
    console.log(`  product: ${res.product.name} (${res.product.id})`);
    insertedProducts.push(res.product);
  }

  const insertedCustomers = [];
  for (const c of CUSTOMERS) {
    const res = await post("/api/customers", c);
    console.log(`  customer: ${res.customer.name} (${res.customer.id})`);
    insertedCustomers.push(res.customer);
  }

  // Sale 1: Agent buying with commission across two books
  const agent = insertedCustomers[0];
  const [p1, p2] = insertedProducts;
  const s1Items = [
    {
      productId: p1.id,
      productName: p1.name,
      category: "book",
      quantity: 5,
      buyPrice: p1.buyPrice,
      mrp: p1.mrp,
      unitDiscount: Math.round((p1.mrp * agent.defaultCommissionRate) / 100),
      unitPrice: p1.mrp - Math.round((p1.mrp * agent.defaultCommissionRate) / 100),
      total: 0,
      commissionRate: agent.defaultCommissionRate,
    },
    {
      productId: p2.id,
      productName: p2.name,
      category: "book",
      quantity: 3,
      buyPrice: p2.buyPrice,
      mrp: p2.mrp,
      unitDiscount: Math.round((p2.mrp * agent.defaultCommissionRate) / 100),
      unitPrice: p2.mrp - Math.round((p2.mrp * agent.defaultCommissionRate) / 100),
      total: 0,
      commissionRate: agent.defaultCommissionRate,
    },
  ];
  s1Items.forEach((it) => (it.total = it.unitPrice * it.quantity));
  const s1Subtotal = s1Items.reduce((s, it) => s + it.mrp * it.quantity, 0);
  const s1Discount = s1Items.reduce((s, it) => s + it.unitDiscount * it.quantity, 0);
  const s1Payable = s1Subtotal - s1Discount;
  const s1Paid = Math.round(s1Payable * 0.6);
  const s1Due = s1Payable - s1Paid;
  const s1Cost = s1Items.reduce((s, it) => s + it.buyPrice * it.quantity, 0);

  const sale1 = await post("/api/sales", {
    invoiceNo: `INV-${Date.now()}-1`,
    customerId: agent.id,
    customerName: agent.name,
    customerPhone: agent.phone,
    customerType: agent.type,
    items: s1Items,
    subtotal: s1Subtotal,
    totalDiscount: s1Discount,
    payableAmount: s1Payable,
    paidAmount: s1Paid,
    dueAmount: s1Due,
    paymentMethod: "due",
    paymentDetails: {},
    totalCost: s1Cost,
    grossProfit: s1Payable - s1Cost,
    status: "completed",
    notes: "Seeded demo sale (agent, partial due)",
  });
  console.log(`  sale: ${sale1.sale.invoice_no} (agent, due ${s1Due})`);

  // Sale 2: Retail walk-in style customer, full cash, single item
  const retail = insertedCustomers[2];
  const p3 = insertedProducts[2];
  const s2Item = {
    productId: p3.id,
    productName: p3.name,
    category: "book",
    quantity: 2,
    buyPrice: p3.buyPrice,
    mrp: p3.mrp,
    unitDiscount: 0,
    unitPrice: p3.mrp,
    total: p3.mrp * 2,
    commissionRate: 0,
  };
  const sale2 = await post("/api/sales", {
    invoiceNo: `INV-${Date.now()}-2`,
    customerId: retail.id,
    customerName: retail.name,
    customerPhone: retail.phone,
    customerType: retail.type,
    items: [s2Item],
    subtotal: s2Item.mrp * s2Item.quantity,
    totalDiscount: 0,
    payableAmount: s2Item.total,
    paidAmount: s2Item.total,
    dueAmount: 0,
    paymentMethod: "cash",
    paymentDetails: {},
    totalCost: p3.buyPrice * s2Item.quantity,
    grossProfit: s2Item.total - p3.buyPrice * s2Item.quantity,
    status: "completed",
    notes: "Seeded demo sale (retail, full cash)",
  });
  console.log(`  sale: ${sale2.sale.invoice_no} (retail, cash)`);

  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
