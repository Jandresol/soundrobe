import { readFileSync } from "node:fs";
import type { GarmentCategory, GarmentIntent } from "@/src/domain/style/types";
import { SerpApiCommerceProvider } from "@/src/services/commerce/SerpApiCommerceProvider";

const maxSearches = 27;

loadLocalEnv();

const apiKey = process.env.SERPAPI_API_KEY;
if (!apiKey) throw new Error("SERPAPI_API_KEY is missing.");

const intents: Array<Pick<GarmentIntent, "category" | "garmentType" | "colors" | "materials" | "aesthetics" | "searchQuery">> = [
  intent("shoes", "strappy heels", ["black"], ["leather"], ["club", "glam"], "womenswear black strappy heels"),
  intent("shoes", "metallic heels", ["silver"], ["metallic"], ["glam"], "womenswear metallic heels"),
  intent("shoes", "platform sandals", ["black"], ["leather"], ["party", "y2k"], "womenswear platform sandals"),
  intent("shoes", "hiking boots", ["brown"], ["leather"], ["technical", "outdoor"], "womenswear hiking boots"),
  intent("shoes", "cowboy boots", ["brown"], ["leather"], ["western"], "womenswear cowboy boots"),
  intent("shoes", "mary janes", ["black"], ["leather"], ["preppy", "romantic"], "womenswear mary janes"),
  intent("top", "corset top", ["black"], ["satin"], ["sensual", "y2k"], "womenswear corset top"),
  intent("top", "lace blouse", ["cream"], ["lace"], ["romantic"], "womenswear lace blouse"),
  intent("top", "band tee", ["black"], ["cotton"], ["rock", "worn-in"], "womenswear band tee"),
  intent("top", "sequin top", ["silver"], ["metallic"], ["party", "glam"], "womenswear sequin top"),
  intent("top", "halter top", ["black"], ["cotton"], ["club", "summer"], "womenswear halter top"),
  intent("top", "polo shirt", ["white"], ["cotton"], ["preppy", "sporty"], "womenswear polo shirt"),
  intent("bottom", "cargo pants", ["black"], ["cotton"], ["street", "utility"], "womenswear cargo pants"),
  intent("bottom", "maxi skirt", ["cream"], ["cotton"], ["bohemian", "soft"], "womenswear maxi skirt"),
  intent("bottom", "plaid mini skirt", ["black"], ["cotton"], ["preppy"], "womenswear plaid mini skirt"),
  intent("bottom", "leather pants", ["black"], ["leather"], ["rock", "club"], "womenswear leather pants"),
  intent("bottom", "parachute pants", ["black"], ["nylon"], ["rave", "street"], "womenswear parachute pants"),
  intent("bottom", "pleated skirt", ["black"], ["cotton"], ["preppy", "coquette"], "womenswear pleated skirt"),
  intent("dress", "bodycon mini dress", ["black"], ["satin"], ["club", "sensual"], "womenswear bodycon mini dress"),
  intent("dress", "denim mini dress", ["denim"], ["denim"], ["y2k", "playful"], "womenswear denim mini dress"),
  intent("dress", "wrap dress", ["black"], ["satin"], ["romantic", "polished"], "womenswear wrap dress"),
  intent("outerwear", "utility jacket", ["green"], ["cotton"], ["utility", "technical"], "womenswear utility jacket"),
  intent("outerwear", "faux fur jacket", ["black"], ["faux fur"], ["glam"], "womenswear faux fur jacket"),
  intent("outerwear", "puffer jacket", ["black"], ["nylon"], ["street", "sporty"], "womenswear puffer jacket"),
  intent("bag", "metallic shoulder bag", ["silver"], ["metallic"], ["club", "glam"], "womenswear metallic shoulder bag"),
  intent("bag", "slouchy tote bag", ["cream"], ["canvas"], ["indie", "casual"], "womenswear slouchy tote bag"),
  intent("jewelry", "statement jewelry", ["silver"], ["metallic"], ["glam", "maximalist"], "womenswear statement jewelry"),
];

async function main() {
  const provider = new SerpApiCommerceProvider(apiKey!, { maxPrice: 300 }, {
    resultsPerSearch: 20,
    maxLiveSearches: maxSearches,
    cacheTtlDays: 60,
  });

  for (const [index, baseIntent] of intents.slice(0, maxSearches).entries()) {
    const products = await provider.search(toGarmentIntent(baseIntent, index));
    console.log(`${String(index + 1).padStart(2, "0")}. ${baseIntent.searchQuery} -> ${products.length} products`);
  }

  console.log(JSON.stringify(provider.diagnostics(), null, 2));
}

function intent(category: GarmentCategory, garmentType: string, colors: string[], materials: string[], aesthetics: string[], searchQuery: string) {
  return { category, garmentType, colors, materials, aesthetics, searchQuery };
}

function toGarmentIntent(base: Pick<GarmentIntent, "category" | "garmentType" | "colors" | "materials" | "aesthetics" | "searchQuery">, index: number): GarmentIntent {
  return {
    id: `cache-warm-${index}`,
    category: base.category,
    garmentType: base.garmentType,
    colors: base.colors,
    materials: base.materials,
    silhouettes: [],
    aesthetics: base.aesthetics,
    eras: [],
    musicSources: [{ kind: "intent", id: "cache-warm", label: "cache warmer", weight: 1 }],
    priority: 50,
    searchQuery: base.searchQuery,
    department: "womenswear",
  };
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
