import { readFileSync } from "node:fs";
import type { GarmentCategory, GarmentIntent } from "@/src/domain/style/types";
import { SerpApiCommerceProvider } from "@/src/services/commerce/SerpApiCommerceProvider";

const maxSearches = 18;

loadLocalEnv();

const apiKey = process.env.SERPAPI_API_KEY;
if (!apiKey) throw new Error("SERPAPI_API_KEY is missing.");

const intents: Array<Pick<GarmentIntent, "category" | "garmentType" | "colors" | "materials" | "aesthetics" | "searchQuery">> = [
  intent("outerwear", "cropped denim jacket", ["denim"], ["denim"], ["worn-in"], "womenswear cropped denim jacket"),
  intent("outerwear", "black leather moto jacket", ["black"], ["leather"], ["rebellious"], "womenswear black leather moto jacket"),
  intent("outerwear", "tailored blazer", ["black"], ["wool"], ["classic"], "womenswear black tailored blazer"),
  intent("top", "rib knit long sleeve", ["burgundy"], ["rib knit"], ["sensual"], "womenswear burgundy rib knit long sleeve"),
  intent("top", "mesh long sleeve", ["black"], ["mesh"], ["club"], "womenswear black mesh long sleeve top"),
  intent("top", "graphic baby tee", ["black"], ["cotton"], ["playful"], "womenswear black graphic baby tee"),
  intent("bottom", "low-rise jeans", ["denim"], ["denim"], ["2000s"], "womenswear low rise jeans"),
  intent("bottom", "wide-leg trouser", ["camel"], ["cotton"], ["relaxed"], "womenswear camel wide leg trouser"),
  intent("bottom", "slip skirt", ["black"], ["satin"], ["sleek"], "womenswear black satin slip skirt"),
  intent("dress", "slip dress", ["black"], ["satin"], ["sensual"], "womenswear black satin slip dress"),
  intent("dress", "mini dress", ["silver"], ["metallic"], ["party"], "womenswear silver mini dress"),
  intent("shoes", "black boots", ["black"], ["leather"], ["rebellious"], "womenswear black leather boots"),
  intent("shoes", "ballet flats", ["black"], ["leather"], ["romantic"], "womenswear black ballet flats"),
  intent("shoes", "retro sneakers", ["white"], ["cotton"], ["casual"], "womenswear white retro sneakers"),
  intent("bag", "compact shoulder bag", ["black"], ["leather"], ["sleek"], "womenswear black compact shoulder bag"),
  intent("bag", "tote bag", ["cream"], ["canvas"], ["casual"], "womenswear cream canvas tote bag"),
  intent("jewelry", "gold hoop earrings", ["gold"], ["metallic"], ["polished"], "womenswear gold hoop earrings"),
  intent("accessory", "patterned scarf", ["green"], ["silk"], ["artful"], "womenswear patterned silk scarf"),
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
