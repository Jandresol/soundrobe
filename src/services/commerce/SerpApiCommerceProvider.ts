import type { ProductCandidate } from "@/src/domain/commerce/types";
import type { GarmentIntent, ShoppingPreferences } from "@/src/domain/style/types";
import type { CommerceDiagnostics, CommerceProvider } from "@/src/services/commerce/CommerceProvider";
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
const DEFAULT_MAX_LIVE_SEARCHES = 5;
const DEFAULT_CACHE_TTL_DAYS = 30;

export class SerpApiCommerceProvider implements CommerceProvider {
  readonly source = "live" as const;
  private liveSearches = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private skippedByLimit = 0;
  private queries: string[] = [];

  constructor(
    private readonly apiKey: string,
    private readonly preferences: ShoppingPreferences = {},
    private readonly options = {
      resultsPerSearch: numberFromEnv("SERPAPI_RESULTS_PER_SEARCH", DEFAULT_RESULTS_PER_SEARCH),
      maxLiveSearches: numberFromEnv("SERPAPI_MAX_LIVE_SEARCHES_PER_GENERATION", DEFAULT_MAX_LIVE_SEARCHES),
      cacheTtlDays: numberFromEnv("PRODUCT_CACHE_TTL_DAYS", DEFAULT_CACHE_TTL_DAYS),
    },
  ) {}

  searchKey(intent: GarmentIntent) {
    return canonicalSearchQuery(intent);
  }

  async search(intent: GarmentIntent): Promise<ProductCandidate[]> {
    const queryCandidates = unique(canonicalQueries(intent));
    this.queries.push(...queryCandidates);

    for (const candidateQuery of queryCandidates) {
      const cached = await readProductSearchCache(candidateQuery, "serpapi");
      if (cached) {
        this.cacheHits += 1;
        const filtered = filterProducts(cached, intent, this.preferences);
        if (filtered.length) return filtered;
      }
    }

    this.cacheMisses += 1;
    if (this.liveSearches >= this.options.maxLiveSearches) {
      this.skippedByLimit += 1;
      return [];
    }
    this.liveSearches += 1;

    const liveQuery = queryCandidates[0];
    const response = await fetch(serpApiUrl(liveQuery, this.apiKey, this.options.resultsPerSearch), { cache: "no-store" });
    if (!response.ok) throw new Error(`SerpAPI request failed: ${response.status}`);
    const payload = await response.json() as SerpApiResponse;
    const products = (payload.shopping_results ?? [])
      .map((result, index) => productFromSerpResult(result, intent, liveQuery, index))
      .filter((product): product is ProductCandidate => Boolean(product));

    await writeProductSearchCache(liveQuery, "serpapi", products, this.options.cacheTtlDays, {
      canonicalKey: canonicalSearchQuery(intent),
      intentCategory: intent.category,
      intentGarmentType: intent.garmentType,
    });
    return filterProducts(products, intent, this.preferences);
  }

  diagnostics(): CommerceDiagnostics {
    return {
      provider: "serpapi",
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      liveSearches: this.liveSearches,
      skippedByLimit: this.skippedByLimit,
      queries: Array.from(new Set(this.queries)),
    };
  }
}

function canonicalSearchQuery(intent: GarmentIntent) {
  return canonicalQueries(intent)[0] ?? normalizeQuery(intent.searchQuery);
}

function canonicalQueries(intent: GarmentIntent) {
  const color = selectCanonicalColor(intent);
  const material = selectCanonicalMaterial(intent);
  const garment = canonicalGarment(intent.garmentType, intent.category);
  const categoryQuery = categoryFallbackQuery(intent.category, color);
  return [
    normalizeQuery(["womenswear", color, material, garment].filter(Boolean).join(" ")),
    normalizeQuery(["womenswear", color, garment].filter(Boolean).join(" ")),
    normalizeQuery(intent.searchQuery),
    categoryQuery,
  ].filter(Boolean);
}

function canonicalGarment(garmentType: string, category: string) {
  const value = garmentType.toLowerCase();
  if (value.includes("denim") && value.includes("jacket")) return "cropped denim jacket";
  if (value.includes("moto") || value.includes("leather jacket")) return "moto jacket";
  if (value.includes("blazer")) return "tailored blazer";
  if (value.includes("rib knit")) return "rib knit long sleeve";
  if (value.includes("mesh") && (value.includes("top") || value.includes("sleeve") || value.includes("tank"))) return "mesh top";
  if (value.includes("graphic") || value.includes("baby tee") || value.includes("band tee")) return "graphic baby tee";
  if (value.includes("low-rise") || value.includes("low rise")) return "low rise jeans";
  if (value.includes("wide-leg") || value.includes("wide leg") || value.includes("trouser")) return "wide leg trouser";
  if (value.includes("slip skirt")) return "slip skirt";
  if (value.includes("slip dress")) return "slip dress";
  if (value.includes("mini dress")) return "mini dress";
  if (value.includes("boot")) return "boots";
  if (value.includes("ballet")) return "ballet flats";
  if (value.includes("sneaker")) return "retro sneakers";
  if (value.includes("shoulder bag") || value.includes("compact")) return "compact shoulder bag";
  if (value.includes("tote")) return "canvas tote bag";
  if (value.includes("hoop")) return "hoop earrings";
  if (value.includes("scarf")) return "patterned silk scarf";
  if (category === "bag") return "shoulder bag";
  if (category === "jewelry") return "jewelry";
  return value;
}

function categoryFallbackQuery(category: string, color: string) {
  const fallbackByCategory: Record<string, string> = {
    outerwear: "womenswear black leather moto jacket",
    top: "womenswear black mesh long sleeve top",
    bottom: "womenswear camel wide leg trouser",
    dress: "womenswear black satin slip dress",
    shoes: "womenswear black leather boots",
    bag: "womenswear black compact shoulder bag",
    jewelry: "womenswear gold hoop earrings",
    accessory: "womenswear patterned silk scarf",
  };
  if (category === "jewelry") return fallbackByCategory.jewelry;
  if (category === "bag") return fallbackByCategory.bag;
  if (category === "shoes") return fallbackByCategory.shoes;
  return normalizeQuery(fallbackByCategory[category]?.replace("black", color || "black") ?? "");
}

function selectCanonicalColor(intent: GarmentIntent) {
  if (intent.category === "jewelry") return intent.colors.find((color) => ["gold", "silver"].includes(color)) ?? "gold";
  if (intent.category === "bag" || intent.category === "shoes") return colorFamily(intent.colors.find((color) => ["black", "brown", "cream", "white", "silver"].includes(colorFamily(color))) ?? intent.colors[0] ?? "black");
  return colorFamily(intent.colors[0] ?? "black");
}

function selectCanonicalMaterial(intent: GarmentIntent) {
  const material = materialFamily(intent.materials[0] ?? "");
  if (!material || ["cotton", "denim", "leather", "satin", "mesh", "rib knit", "silk", "canvas", "nylon", "knit"].includes(material)) return material;
  return "";
}

function colorFamily(color: string) {
  const value = color.toLowerCase();
  if (["charcoal", "midnight", "washed black", "onyx"].some((token) => value.includes(token))) return "black";
  if (["ivory", "cream", "champagne", "bone"].some((token) => value.includes(token))) return "cream";
  if (["chocolate", "espresso", "brown", "camel", "tan"].some((token) => value.includes(token))) return "brown";
  if (["burgundy", "wine", "oxblood", "maroon"].some((token) => value.includes(token))) return "burgundy";
  if (value.includes("silver")) return "silver";
  if (value.includes("gold")) return "gold";
  if (value.includes("white")) return "white";
  if (value.includes("black")) return "black";
  return value;
}

function materialFamily(material: string) {
  const value = material.toLowerCase();
  if (value.includes("denim")) return "denim";
  if (value.includes("faux leather") || value.includes("vegan leather") || value.includes("patent") || value.includes("suede") || value.includes("leather")) return "leather";
  if (value.includes("silk") || value.includes("satin")) return "satin";
  if (value.includes("rib knit")) return "rib knit";
  if (value.includes("knit")) return "knit";
  if (value.includes("mesh")) return "mesh";
  if (value.includes("canvas")) return "canvas";
  if (value.includes("nylon")) return "nylon";
  if (value.includes("cotton")) return "cotton";
  return value;
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
      garmentType: inferGarmentType(title, intent.garmentType),
      colors: inferMatches(title, intent.colors),
      materials: inferMatches(title, intent.materials),
      silhouettes: inferMatches(title, intent.silhouettes),
      aesthetics: inferMatches(title, intent.aesthetics),
      eras: inferMatches(title, intent.eras),
    },
  };
}

function inferGarmentType(title: string, fallback: string) {
  const normalized = title.toLowerCase();
  return normalized.includes(fallback.toLowerCase()) || tokenOverlap(normalized, fallback) >= 0.5 ? fallback : undefined;
}

function inferMatches(title: string, values: string[]) {
  const normalized = title.toLowerCase();
  return values.filter((value) => normalized.includes(value.toLowerCase()) || tokenOverlap(normalized, value) >= 0.7);
}

function tokenOverlap(text: string, value: string) {
  const tokens = value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  if (!tokens.length) return 0;
  return tokens.filter((token) => text.includes(token)).length / tokens.length;
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

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
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
