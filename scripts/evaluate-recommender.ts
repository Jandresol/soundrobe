import crypto from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ProductCandidate } from "@/src/domain/commerce/types";
import type { ArtistSignal, MusicProfile, TrackSignal } from "@/src/domain/music/types";
import type { GarmentIntent, ShoppingPreferences } from "@/src/domain/style/types";
import { normalizeMusicProfile } from "@/src/engine/music/normalizeMusicProfile";
import { generateSoundrobeFromMusicProfile } from "@/src/services/soundrobe/generateSoundrobe";
import type { CommerceProvider } from "@/src/services/commerce/CommerceProvider";

const cacheDir = path.join(process.cwd(), ".cache", "products");
const topN = 20;

type LocalSearchCache = {
  query: string;
  provider: string;
  products: ProductCandidate[];
};

type SearchPool = {
  query: string;
  products: ProductCandidate[];
};

type SyntheticProfile = {
  id: string;
  label: string;
  genres: string[];
  tags: string[];
  era: number;
};

class CachedCatalogCommerceProvider implements CommerceProvider {
  readonly source = "demo" as const;

  constructor(
    private readonly products: ProductCandidate[],
    private readonly preferences: ShoppingPreferences = {},
  ) {}

  async search(intent: GarmentIntent): Promise<ProductCandidate[]> {
    return this.products
      .filter((product) => product.attributes.category === intent.category)
      .filter((product) => this.preferences.maxPrice === undefined || product.price <= this.preferences.maxPrice)
      .map((product) => ({ product, score: productRelevance(product, intent) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map(({ product }) => product);
  }
}

const syntheticProfiles: SyntheticProfile[] = [
  { id: "drain", label: "Bladee / Ecco2k / Yung Lean", genres: ["cloud rap", "hyperpop", "experimental"], tags: ["digital", "ethereal", "icy"], era: 2020 },
  { id: "soft-pop", label: "Taylor / Gracie / Sabrina", genres: ["pop", "singer-songwriter", "soft pop"], tags: ["romantic", "polished", "soft"], era: 2020 },
  { id: "rage", label: "Carti / Ken Carson / Destroy Lonely", genres: ["rage rap", "trap", "hip-hop"], tags: ["dark", "street", "rebellious"], era: 2020 },
  { id: "sad-indie", label: "Radiohead / Smiths / Jeff Buckley", genres: ["alternative rock", "indie rock", "art rock"], tags: ["moody", "romantic", "worn-in"], era: 1990 },
  { id: "reggaeton", label: "Bad Bunny / Rauw / Feid", genres: ["reggaeton", "latin pop", "latin"], tags: ["club", "sleek", "colorful"], era: 2020 },
  { id: "americana", label: "Zach Bryan / Tyler Childers / Noah Kahan", genres: ["country", "folk", "americana"], tags: ["heritage", "earthy", "worn-in"], era: 2010 },
  { id: "brat-club", label: "Charli xcx / The Dare / Snow Strippers", genres: ["electropop", "club", "dance pop"], tags: ["glossy", "party", "electric"], era: 2020 },
  { id: "coquette-indie", label: "Laufey / Clairo / Beabadoobee", genres: ["jazz pop", "indie pop", "bedroom pop"], tags: ["romantic", "soft", "preppy"], era: 2020 },
  { id: "punk", label: "Bikini Kill / The Slits / X-Ray Spex", genres: ["punk", "riot-grrrl", "post-punk"], tags: ["rebellious", "raw", "distressed"], era: 1990 },
  { id: "neo-soul", label: "Erykah / Sade / D'Angelo", genres: ["neo-soul", "r&b", "soul"], tags: ["sensual", "warm", "sleek"], era: 1990 },
  { id: "shoegaze", label: "Slowdive / MBV / Cocteau Twins", genres: ["shoegaze", "dream pop", "indie"], tags: ["dreamy", "soft", "ethereal"], era: 1990 },
  { id: "industrial", label: "NIN / Ministry / Skinny Puppy", genres: ["industrial", "dark electro", "goth"], tags: ["black", "hardware", "technical"], era: 1990 },
  { id: "k-pop", label: "NewJeans / aespa / LE SSERAFIM", genres: ["k-pop", "dance pop", "electropop"], tags: ["playful", "glossy", "sporty"], era: 2020 },
  { id: "classic-rock", label: "Fleetwood / Zeppelin / Bowie", genres: ["rock", "folk rock", "glam rock"], tags: ["vintage", "suede", "bohemian"], era: 1970 },
  { id: "hip-hop-90s", label: "A Tribe Called Quest / Nas / TLC", genres: ["hip-hop", "r&b", "rap"], tags: ["street", "relaxed", "gold"], era: 1990 },
  { id: "metal", label: "Deftones / Korn / System", genres: ["metal", "nu metal", "alternative metal"], tags: ["dark", "oversized", "hardware"], era: 2000 },
  { id: "house", label: "Kaytranada / Peggy Gou / Honey Dijon", genres: ["house", "dance", "electronic"], tags: ["club", "sleek", "minimal"], era: 2020 },
  { id: "preppy-pop", label: "Vampire Weekend / Phoenix / HAIM", genres: ["indie pop", "pop rock", "alternative"], tags: ["preppy", "polished", "bright"], era: 2010 },
  { id: "goth", label: "Bauhaus / Siouxsie / The Cure", genres: ["goth", "post-punk", "darkwave"], tags: ["black", "dramatic", "velvet"], era: 1980 },
  { id: "y2k-rnb", label: "Aaliyah / Ashanti / Destiny's Child", genres: ["r&b", "pop", "dance pop"], tags: ["y2k", "sensual", "glossy"], era: 2000 },
];

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const pools = await loadSearchPools();
  const allProducts = dedupeProducts(pools.flatMap((pool) => pool.products));
  const provider = new CachedCatalogCommerceProvider(allProducts, { maxPrice: 350 });

  console.log("\nCATALOG DIVERSITY");
  printCatalogDiversity(pools, allProducts);
  console.log("\nSEARCH OVERLAP");
  printSearchOverlap(pools);
  console.log("\nSYNTHETIC USER RECOMMENDATIONS");
  const results = await runSyntheticProfiles(provider);
  printRecommendationOverlap(results);
  printExposure(results, allProducts.length);
  printExampleProducts(results);
}

async function loadSearchPools(): Promise<SearchPool[]> {
  const files = (await readdir(cacheDir)).filter((file) => file.endsWith(".json")).sort();
  const pools: SearchPool[] = [];
  for (const file of files) {
    const payload = JSON.parse(await readFile(path.join(cacheDir, file), "utf8")) as LocalSearchCache;
    pools.push({ query: payload.query, products: dedupeProducts(payload.products) });
  }
  return pools;
}

function printCatalogDiversity(pools: SearchPool[], products: ProductCandidate[]) {
  const productUrls = new Set(products.map((product) => product.productUrl));
  const rawCount = pools.reduce((sum, pool) => sum + pool.products.length, 0);
  const duplicateRate = rawCount ? 1 - productUrls.size / rawCount : 0;
  const retailers = new Set(products.map((product) => product.retailer));
  const categories = countValues(products.map((product) => product.attributes.category ?? "unknown"));
  const colors = countValues(products.flatMap((product) => product.attributes.colors ?? []));
  const priceBands = countValues(products.map(priceBand));
  console.log(`raw rows: ${rawCount}`);
  console.log(`unique products: ${productUrls.size}`);
  console.log(`duplicate / overlap rate: ${percent(duplicateRate)}`);
  console.log(`retailers: ${retailers.size}`);
  console.log(`categories: ${formatCounts(categories, 8)}`);
  console.log(`colors: ${formatCounts(colors, 10)}`);
  console.log(`price bands: ${formatCounts(priceBands, 8)}`);
}

function printSearchOverlap(pools: SearchPool[]) {
  const pairs: Array<{ pair: string; score: number }> = [];
  for (let i = 0; i < pools.length; i += 1) {
    for (let j = i + 1; j < pools.length; j += 1) {
      pairs.push({ pair: `${shortQuery(pools[i].query)} <> ${shortQuery(pools[j].query)}`, score: jaccard(productIds(pools[i].products), productIds(pools[j].products)) });
    }
  }
  for (const item of pairs.sort((a, b) => b.score - a.score).slice(0, 12)) console.log(`${percent(item.score).padStart(4)}  ${item.pair}`);
}

async function runSyntheticProfiles(provider: CommerceProvider) {
  const rows: Array<{ profile: SyntheticProfile; products: string[]; labels: string[] }> = [];
  for (const profile of syntheticProfiles) {
    const result = await generateSoundrobeFromMusicProfile(musicProfile(profile), provider, { maxPrice: 350 }, "demo");
    const recs = result.signaturePieces.slice(0, topN);
    rows.push({
      profile,
      products: recs.map((rec) => rec.product.productUrl),
      labels: recs.slice(0, 5).map((rec) => rec.product.title),
    });
    console.log(`\n${profile.label}`);
    for (const title of rows.at(-1)?.labels ?? []) console.log(`  - ${title}`);
  }
  return rows;
}

function printRecommendationOverlap(results: Array<{ profile: SyntheticProfile; products: string[] }>) {
  console.log("\nRECOMMENDATION OVERLAP, TOP 20");
  const pairs: Array<{ pair: string; score: number }> = [];
  for (let i = 0; i < results.length; i += 1) {
    for (let j = i + 1; j < results.length; j += 1) {
      pairs.push({ pair: `${results[i].profile.id} <> ${results[j].profile.id}`, score: jaccard(results[i].products, results[j].products) });
    }
  }
  console.log("highest overlap:");
  for (const item of pairs.sort((a, b) => b.score - a.score).slice(0, 10)) console.log(`${percent(item.score).padStart(4)}  ${item.pair}`);
  console.log("lowest overlap:");
  for (const item of pairs.sort((a, b) => a.score - b.score).slice(0, 10)) console.log(`${percent(item.score).padStart(4)}  ${item.pair}`);
}

function printExposure(results: Array<{ products: string[] }>, catalogSize: number) {
  console.log("\nPRODUCT EXPOSURE");
  const exposures = countValues(results.flatMap((row) => row.products));
  const exposureCounts = Array.from(exposures.values()).sort((a, b) => b - a);
  const surfaced = exposures.size;
  const totalSlots = results.reduce((sum, row) => sum + row.products.length, 0);
  const topOnePercentCount = Math.max(1, Math.ceil(catalogSize * 0.01));
  const topTenPercentCount = Math.max(1, Math.ceil(catalogSize * 0.1));
  console.log(`slots: ${totalSlots}`);
  console.log(`surfaced at least once: ${surfaced}/${catalogSize} (${percent(surfaced / catalogSize)})`);
  console.log(`zero-impression products: ${catalogSize - surfaced}`);
  console.log(`median impressions/surfaced product: ${median(exposureCounts)}`);
  console.log(`top 1% products share: ${percent(sum(exposureCounts.slice(0, topOnePercentCount)) / totalSlots)}`);
  console.log(`top 10% products share: ${percent(sum(exposureCounts.slice(0, topTenPercentCount)) / totalSlots)}`);
}

function printExampleProducts(results: Array<{ profile: SyntheticProfile; products: string[]; labels: string[] }>) {
  console.log("\nSPOT CHECK: WHO GETS THE MOST COMMON PRODUCT?");
  const exposures = countValues(results.flatMap((row) => row.products));
  const [productUrl] = Array.from(exposures.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!productUrl) return;
  for (const result of results.filter((row) => row.products.includes(productUrl)).slice(0, 8)) console.log(`- ${result.profile.label}`);
}

function musicProfile(profile: SyntheticProfile): MusicProfile {
  return normalizeMusicProfile({
    id: profile.id,
    displayName: profile.label,
    ranges: {
      longTerm: range(profile, 100),
      mediumTerm: range(profile, 80),
      shortTerm: range(profile, 60),
    },
  });
}

function range(profile: SyntheticProfile, weight: number): { artists: ArtistSignal[]; tracks: TrackSignal[] } {
  const names = profile.label.split(" / ");
  return {
    artists: names.map((name, index) => ({
      id: slug(name),
      name,
      genres: profile.genres,
      weight: weight - index * 8,
    })),
    tracks: names.map((name, index) => ({
      id: `${slug(name)}-track`,
      name: `${name} synthetic top track`,
      artistIds: [slug(name)],
      tags: profile.tags,
      releaseYear: profile.era,
      weight: weight - index * 8,
    })),
  };
}

function productRelevance(product: ProductCandidate, intent: GarmentIntent) {
  return [
    product.attributes.garmentType === intent.garmentType ? 12 : 0,
    overlap(intent.colors, product.attributes.colors) * 3,
    overlap(intent.materials, product.attributes.materials) * 4,
    overlap(intent.silhouettes, product.attributes.silhouettes) * 2,
    overlap(intent.aesthetics, product.attributes.aesthetics) * 2,
    tokenOverlap(product.title, intent.garmentType) * 4,
  ].reduce((total, value) => total + value, 0);
}

function dedupeProducts(products: ProductCandidate[]) {
  const byUrl = new Map<string, ProductCandidate>();
  for (const product of products) byUrl.set(product.productUrl || product.id, product);
  return Array.from(byUrl.values());
}

function productIds(products: ProductCandidate[]) {
  return products.map((product) => product.productUrl || product.id);
}

function overlap(wanted: string[], actual?: string[]) {
  const actualSet = new Set(actual?.map((value) => value.toLowerCase()) ?? []);
  return wanted.filter((value) => actualSet.has(value.toLowerCase())).length;
}

function tokenOverlap(text: string, value: string) {
  const tokens = value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2);
  if (!tokens.length) return 0;
  const normalized = text.toLowerCase();
  return tokens.filter((token) => normalized.includes(token)).length / tokens.length;
}

function jaccard(left: string[], right: string[]) {
  const a = new Set(left);
  const b = new Set(right);
  const intersection = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 1;
}

function countValues(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function formatCounts(counts: Map<string, number>, limit: number) {
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, value]) => `${key}:${value}`).join(", ");
}

function priceBand(product: ProductCandidate) {
  if (product.price < 50) return "under $50";
  if (product.price < 100) return "$50-99";
  if (product.price < 200) return "$100-199";
  return "$200+";
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function shortQuery(query: string) {
  return query.replace(/^womenswear /, "").slice(0, 34);
}

function slug(value: string) {
  return crypto.createHash("sha1").update(value.toLowerCase()).digest("hex").slice(0, 12);
}
