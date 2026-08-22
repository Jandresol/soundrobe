import type { ProductCandidate } from "@/src/domain/commerce/types";
import type { GarmentIntent, ShoppingPreferences } from "@/src/domain/style/types";
import type { CommerceProvider } from "@/src/services/commerce/CommerceProvider";
import { readProductSearchCache, writeProductSearchCache } from "@/src/services/commerce/productSearchCache";

type SerpApiShoppingResult = {
  product_id?: string;
  title?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  thumbnail?: string;
  product_link?: string;
  link?: string;
  availability?: string;
};

type SerpApiResponse = {
  shopping_results?: SerpApiShoppingResult[];
};

const DEFAULT_RESULTS_PER_SEARCH = 20;
const DEFAULT_MAX_LIVE_SEARCHES = 3;
const DEFAULT_CACHE_TTL_DAYS = 30;

export class SerpApiCommerceProvider implements CommerceProvider {
  readonly source = "live" as const;
  private liveSearches = 0;

  constructor(
    private readonly apiKey: string,
    private readonly preferences: ShoppingPreferences = {},
    private readonly options = {
      resultsPerSearch: numberFromEnv("SERPAPI_RESULTS_PER_SEARCH", DEFAULT_RESULTS_PER_SEARCH),
      maxLiveSearches: numberFromEnv("SERPAPI_MAX_LIVE_SEARCHES_PER_GENERATION", DEFAULT_MAX_LIVE_SEARCHES),
      cacheTtlDays: numberFromEnv("PRODUCT_CACHE_TTL_DAYS", DEFAULT_CACHE_TTL_DAYS),
    },
  ) {}

  async search(intent: GarmentIntent): Promise<ProductCandidate[]> {
    const query = normalizeQuery(intent.searchQuery);
    const cached = await readProductSearchCache(query, "serpapi");
    if (cached) return filterProducts(cached, intent, this.preferences);

    if (this.liveSearches >= this.options.maxLiveSearches) return [];
    this.liveSearches += 1;

    const response = await fetch(serpApiUrl(query, this.apiKey, this.options.resultsPerSearch), { cache: "no-store" });
    if (!response.ok) throw new Error(`SerpAPI request failed: ${response.status}`);
    const payload = await response.json() as SerpApiResponse;
    const products = (payload.shopping_results ?? [])
      .map((result, index) => productFromSerpResult(result, intent, query, index))
      .filter((product): product is ProductCandidate => Boolean(product));

    await writeProductSearchCache(query, "serpapi", products, this.options.cacheTtlDays);
    return filterProducts(products, intent, this.preferences);
  }
}

function productFromSerpResult(result: SerpApiShoppingResult, intent: GarmentIntent, query: string, index: number): ProductCandidate | null {
  const title = cleanText(result.title);
  const imageUrl = safeUrl(result.thumbnail);
  const productUrl = safeUrl(result.product_link ?? result.link);
  if (!title || !imageUrl || !productUrl) return null;
  const price = typeof result.extracted_price === "number" ? result.extracted_price : parsePrice(result.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    id: result.product_id ?? `serpapi-${slug(query)}-${index}`,
    retailer: cleanText(result.source) ?? "Google Shopping",
    title,
    price,
    currency: "USD",
    imageUrl,
    productUrl,
    availability: result.availability?.toLowerCase().includes("out") ? "out_of_stock" : "in_stock",
    attributes: {
      category: intent.category,
      garmentType: intent.garmentType,
      colors: intent.colors,
      materials: intent.materials,
      silhouettes: intent.silhouettes,
      aesthetics: intent.aesthetics,
      eras: intent.eras,
    },
  };
}

function filterProducts(products: ProductCandidate[], intent: GarmentIntent, preferences: ShoppingPreferences) {
  return products
    .filter((product) => product.attributes.category === intent.category)
    .filter((product) => preferences.minPrice === undefined || product.price >= preferences.minPrice)
    .filter((product) => preferences.maxPrice === undefined || product.price <= preferences.maxPrice)
    .filter((product) => !preferences.excludedRetailers?.includes(product.retailer))
    .filter((product) => !preferences.preferredRetailers?.length || preferences.preferredRetailers.includes(product.retailer));
}

function serpApiUrl(query: string, apiKey: string, limit: number) {
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    api_key: apiKey,
    gl: "us",
    hl: "en",
    num: String(limit),
  });
  return `https://serpapi.com/search.json?${params.toString()}`;
}

function normalizeQuery(query: string) {
  return query.toLowerCase().replace(/\s+/g, " ").trim();
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

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
}

function numberFromEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
