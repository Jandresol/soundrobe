import type { ProductCandidate } from "@/src/domain/commerce/types";
import type { GarmentIntent, ShoppingPreferences } from "@/src/domain/style/types";
import type { CommerceProvider } from "@/src/services/commerce/CommerceProvider";

type AwinFeedProduct = {
  id?: string;
  title?: string;
  description?: string;
  link?: string;
  image_link?: string;
  brand?: string;
  price?: string;
  sale_price?: string;
  availability?: string;
  color?: string;
  material?: string;
  product_type?: string;
  google_product_category?: string;
};

const DEFAULT_LOCALE = "en_US";
const DEFAULT_VERTICAL = "retail";
const DEFAULT_MAX_FEED_ITEMS = 8000;
const DEFAULT_PRODUCTS_PER_INTENT = 20;

export class AwinCommerceProvider implements CommerceProvider {
  readonly source = "live" as const;
  private productsPromise?: Promise<ProductCandidate[]>;

  constructor(
    private readonly token: string,
    private readonly publisherId: string,
    private readonly advertiserIds: string[],
    private readonly preferences: ShoppingPreferences = {},
    private readonly options = {
      locale: process.env.AWIN_LOCALE || DEFAULT_LOCALE,
      vertical: process.env.AWIN_VERTICAL || DEFAULT_VERTICAL,
      maxFeedItems: numberFromEnv("AWIN_MAX_FEED_ITEMS", DEFAULT_MAX_FEED_ITEMS),
      productsPerIntent: numberFromEnv("AWIN_PRODUCTS_PER_INTENT", DEFAULT_PRODUCTS_PER_INTENT),
    },
  ) {}

  async search(intent: GarmentIntent): Promise<ProductCandidate[]> {
    const products = await this.getProducts();
    return products
      .map((product) => ({ product, relevance: productRelevance(product, intent) }))
      .filter(({ product, relevance }) => relevance > 0 && product.attributes.category === intent.category)
      .filter(({ product }) => this.matchesPreferences(product))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, this.options.productsPerIntent)
      .map(({ product }) => product);
  }

  private getProducts() {
    this.productsPromise ??= this.fetchProducts();
    return this.productsPromise;
  }

  private async fetchProducts() {
    const feedProducts = await Promise.all(this.advertiserIds.map((advertiserId) => this.fetchAdvertiserFeed(advertiserId)));
    const seen = new Set<string>();
    return feedProducts
      .flat()
      .filter((product) => {
        const key = product.productUrl || product.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private async fetchAdvertiserFeed(advertiserId: string) {
    const response = await fetch(awinFeedUrl(this.publisherId, advertiserId, this.options.vertical, this.options.locale), {
      headers: { Authorization: `Bearer ${this.token}`, accept: "application/x-ndjson, application/jsonlines, text/plain" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`AWIN feed request failed for advertiser ${advertiserId}: ${response.status}`);

    const text = await response.text();
    return text
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(0, this.options.maxFeedItems)
      .map((line, index) => parseAwinLine(line, advertiserId, index))
      .filter((product): product is ProductCandidate => Boolean(product));
  }

  private matchesPreferences(product: ProductCandidate) {
    return (this.preferences.minPrice === undefined || product.price >= this.preferences.minPrice) &&
      (this.preferences.maxPrice === undefined || product.price <= this.preferences.maxPrice) &&
      !this.preferences.excludedRetailers?.includes(product.retailer) &&
      (!this.preferences.preferredRetailers?.length || this.preferences.preferredRetailers.includes(product.retailer));
  }
}

function parseAwinLine(line: string, advertiserId: string, index: number): ProductCandidate | null {
  try {
    const product = JSON.parse(line) as AwinFeedProduct;
    const title = cleanText(product.title);
    const imageUrl = safeUrl(product.image_link);
    const productUrl = safeUrl(product.link);
    const price = parsePrice(product.sale_price ?? product.price);
    if (!title || !imageUrl || !productUrl || !Number.isFinite(price) || price <= 0) return null;

    const categoryText = cleanText([product.product_type, product.google_product_category, product.description].filter(Boolean).join(" ")) ?? "";
    const searchText = `${title} ${categoryText}`.toLowerCase();
    const category = inferCategory(searchText);
    if (!category) return null;

    return {
      id: product.id ?? `awin-${advertiserId}-${index}`,
      retailer: `AWIN ${advertiserId}`,
      brand: cleanText(product.brand),
      title,
      price,
      currency: parseCurrency(product.sale_price ?? product.price) ?? "USD",
      imageUrl,
      productUrl,
      availability: product.availability?.toLowerCase().includes("out") ? "out_of_stock" : "in_stock",
      attributes: {
        category,
        garmentType: inferGarmentType(searchText),
        colors: splitAttribute(product.color),
        materials: splitAttribute(product.material),
        silhouettes: inferSilhouettes(searchText),
        aesthetics: inferAesthetics(searchText),
      },
    };
  } catch {
    return null;
  }
}

function productRelevance(product: ProductCandidate, intent: GarmentIntent) {
  const text = `${product.title} ${product.attributes.garmentType ?? ""} ${product.attributes.colors?.join(" ") ?? ""} ${product.attributes.materials?.join(" ") ?? ""}`.toLowerCase();
  const intentTokens = [
    intent.garmentType,
    ...intent.colors,
    ...intent.materials,
    ...intent.aesthetics,
    ...intent.silhouettes,
  ].flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));
  return intentTokens.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0);
}

function inferCategory(text: string): ProductCandidate["attributes"]["category"] {
  if (/\b(dress|gown)\b/.test(text)) return "dress";
  if (/\b(jacket|coat|blazer|cardigan|hoodie|trench|outerwear)\b/.test(text)) return "outerwear";
  if (/\b(top|tee|shirt|blouse|tank|cami|corset|bodysuit|polo|sweater)\b/.test(text)) return "top";
  if (/\b(jeans|pants|trouser|skirt|shorts|leggings|bottom)\b/.test(text)) return "bottom";
  if (/\b(shoe|sneaker|boot|loafer|flat|heel|sandal|pump|mule|mary jane)\b/.test(text)) return "shoes";
  if (/\b(bag|tote|clutch|purse|backpack|crossbody)\b/.test(text)) return "bag";
  if (/\b(earring|necklace|ring|bracelet|jewelry|jewellery|choker|brooch)\b/.test(text)) return "jewelry";
  if (/\b(scarf|belt|hat|cap|sunglasses|sock|clip|charm)\b/.test(text)) return "accessory";
  return undefined;
}

function inferGarmentType(text: string) {
  const matches = [
    "moto jacket", "leather jacket", "denim jacket", "trench coat", "blazer", "graphic tee", "baby tee",
    "rib knit", "button-up shirt", "mesh long sleeve", "slip dress", "mini dress", "maxi dress", "jeans",
    "wide-leg trouser", "cargo pants", "mini skirt", "ballet flats", "loafers", "boots", "sneakers",
    "shoulder bag", "tote bag", "gold hoops", "scarf",
  ];
  return matches.find((match) => text.includes(match));
}

function inferSilhouettes(text: string) {
  return ["fitted", "oversized", "cropped", "wide-leg", "low-rise", "relaxed", "tailored", "body-skimming"].filter((value) => text.includes(value));
}

function inferAesthetics(text: string) {
  return ["distressed", "sleek", "romantic", "minimal", "western", "sporty", "club", "vintage", "bohemian", "goth", "preppy"].filter((value) => text.includes(value));
}

function splitAttribute(value?: string) {
  return value?.toLowerCase().split(/[,/|]+/).map((item) => item.trim()).filter(Boolean);
}

function awinFeedUrl(publisherId: string, advertiserId: string, vertical: string, locale: string) {
  return `https://api.awin.com/publishers/${publisherId}/awinfeeds/download/${advertiserId}-${vertical}-${locale}.jsonl`;
}

function cleanText(value?: string) {
  return value?.replace(/\s+/g, " ").trim() || undefined;
}

function safeUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function parsePrice(value?: string) {
  return Number(value?.replace(/[^0-9.]/g, "") ?? NaN);
}

function parseCurrency(value?: string) {
  return value?.match(/\b[A-Z]{3}\b/)?.[0];
}

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
