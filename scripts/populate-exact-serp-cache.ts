import { readFileSync } from "node:fs";
import type { ProductCandidate } from "@/src/domain/commerce/types";
import type { GarmentCategory, GarmentIntent } from "@/src/domain/style/types";
import { writeProductSearchCache } from "@/src/services/commerce/productSearchCache";

const resultsPerSearch = 40;
const cacheTtlDays = 60;

loadLocalEnv();

const apiKey = process.env.SERPAPI_API_KEY;
if (!apiKey) throw new Error("SERPAPI_API_KEY is missing.");

const searches = [
  intent("top", "flannel shirt", ["burgundy"], ["flannel", "cotton"], ["grunge", "alt-rock", "worn-in"], "womenswear burgundy distressed flannel shirt"),
  intent("top", "distressed fitted graphic tee", ["washed black", "black"], ["cotton"], ["grunge", "post-grunge", "punk"], "womenswear washed black distressed graphic tee"),
  intent("bottom", "baggy jeans", ["faded denim", "denim"], ["denim"], ["grunge", "90s hip-hop", "worn-in"], "womenswear faded denim baggy jeans"),
  intent("shoes", "combat boots", ["black"], ["leather"], ["punk", "grunge", "hardcore"], "womenswear black leather combat boots"),
  intent("outerwear", "oversized knit", ["cream"], ["fuzzy knit"], ["shoegaze", "indie", "bedroom pop"], "womenswear cream fuzzy oversized cardigan"),
  intent("accessory", "studded belt", ["black"], ["leather"], ["punk", "emo", "post-grunge"], "womenswear black studded leather belt"),
  intent("outerwear", "cropped bomber jacket", ["black"], ["nylon"], ["hip-hop", "y2k", "street"], "womenswear black cropped bomber jacket"),
  intent("outerwear", "varsity jacket", ["dark denim", "denim"], ["denim"], ["regional hip-hop", "street", "heritage"], "womenswear dark denim varsity jacket"),
  intent("shoes", "chunky sneakers", ["black"], ["leather"], ["hip-hop", "street", "bold"], "womenswear black chunky sneakers"),
  intent("outerwear", "track jacket", ["black"], ["nylon"], ["trap", "drill", "electronic"], "womenswear black nylon track jacket"),
  intent("shoes", "platform boots", ["silver"], ["metallic"], ["hyperpop", "rave", "electronic"], "womenswear silver platform boots"),
  intent("outerwear", "windbreaker", ["black"], ["nylon"], ["uk garage", "dnb", "club"], "womenswear black nylon windbreaker"),
  intent("top", "crochet top", ["cream"], ["crochet"], ["neo-soul", "folk", "boho"], "womenswear cream crochet fitted top"),
  intent("outerwear", "suede jacket", ["rust"], ["suede"], ["soul", "folk", "70s rock"], "womenswear rust suede jacket"),
  intent("bottom", "bootcut jeans", ["denim"], ["denim"], ["70s rock", "psychedelic", "western"], "womenswear denim bootcut jeans"),
  intent("shoes", "oxfords", ["black"], ["leather"], ["experimental", "art-pop", "jazz"], "womenswear black leather oxfords"),
  intent("top", "button-up shirt", ["cream"], ["satin"], ["jazz", "sophisti-pop", "soul"], "womenswear cream satin button-up shirt"),
  intent("bag", "top-handle bag", ["black"], ["leather"], ["jazz", "classic", "vintage soul"], "womenswear black top handle bag vintage"),
];

async function main() {
  for (const [index, search] of searches.entries()) {
    const products = await fetchProducts(search);
    await writeProductSearchCache(search.searchQuery, "serpapi", products, cacheTtlDays, {
      canonicalKey: search.searchQuery,
      intentCategory: search.category,
      intentGarmentType: search.garmentType,
    });
    console.log(`${String(index + 1).padStart(2, "0")}. ${search.searchQuery} -> ${products.length} products`);
  }
}

async function fetchProducts(intent: GarmentIntent) {
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: intent.searchQuery,
    api_key: apiKey!,
    num: String(resultsPerSearch),
    hl: "en",
    gl: "us",
  });
  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`SerpAPI request failed for ${intent.searchQuery}: ${response.status}`);
  const payload = await response.json() as { shopping_results?: Array<{
    product_id?: string;
    title?: string;
    source?: string;
    price?: string;
    extracted_price?: number;
    thumbnail?: string;
    product_link?: string;
    link?: string;
    availability?: string;
  }> };
  return (payload.shopping_results ?? [])
    .map((result, index) => productFromResult(result, intent, index))
    .filter((product): product is ProductCandidate => Boolean(product));
}

function productFromResult(result: {
  product_id?: string;
  title?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  thumbnail?: string;
  product_link?: string;
  link?: string;
  availability?: string;
}, intent: GarmentIntent, index: number): ProductCandidate | null {
  const title = clean(result.title);
  const imageUrl = safeUrl(result.thumbnail);
  const productUrl = safeUrl(result.product_link ?? result.link);
  if (!title || !imageUrl || !productUrl) return null;
  const price = typeof result.extracted_price === "number" ? result.extracted_price : parsePrice(result.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    id: result.product_id ?? `serpapi-exact-${slug(intent.searchQuery)}-${index}`,
    retailer: clean(result.source) ?? "Google Shopping",
    title,
    price,
    currency: "USD",
    imageUrl,
    productUrl,
    availability: result.availability?.toLowerCase().includes("out") ? "out_of_stock" : "in_stock",
    attributes: {
      category: intent.category,
      garmentType: intent.garmentType,
      colors: inferMatches(title, intent.colors),
      materials: inferMatches(title, intent.materials),
      silhouettes: intent.silhouettes,
      aesthetics: inferMatches(title, intent.aesthetics),
      eras: intent.eras,
    },
  };
}

function intent(category: GarmentCategory, garmentType: string, colors: string[], materials: string[], aesthetics: string[], searchQuery: string): GarmentIntent {
  return {
    id: `exact-cache-${searchQuery.replaceAll(" ", "-")}`,
    category,
    garmentType,
    colors,
    materials,
    silhouettes: [],
    aesthetics,
    eras: [],
    musicSources: [{ kind: "intent", id: "exact-cache", label: "exact cache warmer", weight: 1 }],
    priority: 50,
    searchQuery,
    department: "womenswear",
  };
}

function inferMatches(title: string, values: string[]) {
  const normalized = title.toLowerCase();
  return values.filter((value) => normalized.includes(value.toLowerCase()));
}

function clean(value?: string) {
  return value?.replace(/\s+/g, " ").trim() || undefined;
}

function safeUrl(value?: string) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function parsePrice(value?: string) {
  if (!value) return 0;
  return Number(value.replace(/[^0-9.]/g, ""));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function loadLocalEnv() {
  const content = readFileSync(".env.local", "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    process.env[match[1]] ??= match[2];
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
