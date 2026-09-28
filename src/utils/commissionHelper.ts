import { Product, Publisher, STANDARD_BOOK_ITEM_TYPES } from "@/types";

/**
 * Infer the item type of a book based on its name, Bengali title, and subject
 */
export function inferItemTypeFromProduct(
  name: string = "",
  bengaliName: string = "",
  subject: string = ""
): string {
  const text = `${name} ${bengaliName} ${subject}`.toLowerCase();

  // 1. English Grammar
  if (
    text.includes("english grammar") ||
    text.includes("ইংলিশ গ্রামার") ||
    text.includes("ইংরেজি ব্যাকরণ") ||
    text.includes("communicative english") ||
    (text.includes("english") && (text.includes("grammar") || text.includes("grammer")))
  ) {
    return "English Grammar";
  }

  // 2. Bangla Grammar
  if (
    text.includes("bangla grammar") ||
    text.includes("বাংলা ব্যাকরণ") ||
    text.includes("ব্যাকরণ ও নির্মিতি") ||
    text.includes("বাংলা ২য়") ||
    text.includes("bangla 2nd") ||
    (text.includes("bangla") && (text.includes("grammar") || text.includes("grammer") || text.includes("byakoron")))
  ) {
    return "Bangla Grammar";
  }

  // 3. Guide / Sahayika
  if (
    text.includes("guide") ||
    text.includes("গাইড") ||
    text.includes("সহায়িকা") ||
    text.includes("সহায়ক") ||
    text.includes("onushiloni") ||
    text.includes("অনুশীলনী")
  ) {
    return "Guide";
  }

  // 4. Model Test / Test Paper
  if (
    text.includes("model test") ||
    text.includes("মডেল টেস্ট") ||
    text.includes("test paper") ||
    text.includes("টেস্ট পেপার") ||
    text.includes("question bank") ||
    text.includes("প্রশ্নব্যাংক")
  ) {
    return "Model Test / Test Paper";
  }

  // 5. Made Easy / Solution
  if (
    text.includes("made easy") ||
    text.includes("মেড ইজি") ||
    text.includes("solution") ||
    text.includes("সমাধান") ||
    text.includes("উত্তরমালা")
  ) {
    return "Made Easy / Solution";
  }

  // 6. Textbook (Board / NCTB)
  if (
    text.includes("nctb") ||
    text.includes("বোর্ড বই") ||
    text.includes("পাঠ্যপুস্তক") ||
    text.includes("textbook") ||
    text.includes("board book")
  ) {
    return "Textbook (Board)";
  }

  // 7. Dictionary
  if (text.includes("dictionary") || text.includes("অভিধান") || text.includes("ডিকশনারি")) {
    return "Dictionary";
  }

  // 8. General Knowledge
  if (text.includes("general knowledge") || text.includes("সাধারণ জ্ঞান") || text.includes("কারেন্ট অ্যাফেয়ার্স")) {
    return "General Knowledge";
  }

  // 9. Practical / Lab Khata
  if (text.includes("practical") || text.includes("ব্যবহারিক") || text.includes("ল্যাব")) {
    return "Practical Notebook";
  }

  return "Guide"; // Default book type in Bangladeshi retail guide publishing
}

/**
 * Match a product's publisher string against publisher database records
 */
export function findPublisherForProduct(
  prodPublisher: string | undefined,
  publishers: Publisher[]
): Publisher | undefined {
  if (!prodPublisher) return undefined;
  const p = prodPublisher.trim().toLowerCase();

  return publishers.find((pub) => {
    const n = pub.name.trim().toLowerCase();
    const c = pub.code.trim().toLowerCase();
    const b = (pub.bengaliName || "").trim().toLowerCase();

    if (p === n || p === c || p === b) return true;
    const firstWord = n.split(" ")[0];
    if (p === firstWord || n.includes(p) || p.includes(firstWord)) return true;
    return false;
  });
}

export interface ResolvedCommission {
  commissionRate: number; // e.g. 40
  source: "product_override" | "publisher_item_rule" | "publisher_default" | "customer_default" | "shop_default";
  itemType: string;
  publisherName?: string;
  ruleLabel: string; // e.g. "Panjeree Eng Grammar (40%)"
}

/**
 * Core commission resolution algorithm:
 * 1. Checks product.customCommissionRate
 * 2. Checks matching Publisher -> Item-wise Commission Rule
 * 3. Checks Publisher -> defaultCommissionRate
 * 4. Checks Customer -> defaultCommissionRate (agent rate)
 * 5. Falls back to shop default
 */
export function resolveProductCommission(
  product: Product,
  publishers: Publisher[],
  customerAgentRate?: number,
  shopDefaultAgentCommission: number = 30
): ResolvedCommission {
  const itemType =
    product.itemType && product.itemType.trim() !== ""
      ? product.itemType.trim()
      : inferItemTypeFromProduct(product.name, product.bengaliName, product.subject);

  // 1. Direct Product Specific Override
  if (
    product.customCommissionRate !== undefined &&
    product.customCommissionRate !== null &&
    !isNaN(Number(product.customCommissionRate)) &&
    Number(product.customCommissionRate) >= 0
  ) {
    const rate = Number(product.customCommissionRate);
    return {
      commissionRate: rate,
      source: "product_override",
      itemType,
      publisherName: product.publisher,
      ruleLabel: `Custom Override (${rate}%)`,
    };
  }

  // 2. Find Publisher
  const pub = findPublisherForProduct(product.publisher, publishers);

  if (pub) {
    // Check Publisher's itemCommissions table
    if (pub.itemCommissions && Array.isArray(pub.itemCommissions) && pub.itemCommissions.length > 0) {
      // Find matching item commission rule
      const normalizedCurrentType = itemType.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchedRule = pub.itemCommissions.find((rule) => {
        const normRuleType = rule.itemType.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          normRuleType === normalizedCurrentType ||
          normRuleType.includes(normalizedCurrentType) ||
          normalizedCurrentType.includes(normRuleType)
        );
      });

      if (matchedRule && matchedRule.commissionRate >= 0) {
        return {
          commissionRate: matchedRule.commissionRate,
          source: "publisher_item_rule",
          itemType,
          publisherName: pub.name,
          ruleLabel: `${pub.name} ${matchedRule.itemType} (${matchedRule.commissionRate}%)`,
        };
      }
    }

    // 3. Publisher Default Commission Rate
    if (
      pub.defaultCommissionRate !== undefined &&
      pub.defaultCommissionRate !== null &&
      Number(pub.defaultCommissionRate) > 0
    ) {
      const rate = Number(pub.defaultCommissionRate);
      return {
        commissionRate: rate,
        source: "publisher_default",
        itemType,
        publisherName: pub.name,
        ruleLabel: `${pub.name} Default (${rate}%)`,
      };
    }
  }

  // 4. Customer Agent Profile Default Rate
  if (
    customerAgentRate !== undefined &&
    customerAgentRate !== null &&
    Number(customerAgentRate) > 0
  ) {
    const rate = Number(customerAgentRate);
    return {
      commissionRate: rate,
      source: "customer_default",
      itemType,
      publisherName: pub?.name || product.publisher,
      ruleLabel: `Agent Profile Rate (${rate}%)`,
    };
  }

  // 5. Fallback Shop Default
  return {
    commissionRate: shopDefaultAgentCommission,
    source: "shop_default",
    itemType,
    publisherName: pub?.name || product.publisher,
    ruleLabel: `Standard Rate (${shopDefaultAgentCommission}%)`,
  };
}
