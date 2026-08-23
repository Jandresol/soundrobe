import { loadEnvConfig } from "@next/env";
import { buildStyleProfile } from "@/src/engine/style/buildStyleProfile";
import { calculateGenreWeights } from "@/src/engine/music/calculateGenreWeights";
import { combineTimeRanges } from "@/src/engine/music/combineTimeRanges";
import { scoreProduct } from "@/src/engine/ranking/scoreProduct";
import { generateGarmentIntents } from "@/src/engine/style/generateGarmentIntents";
import { generatePalette } from "@/src/engine/style/generatePalette";
import type { MusicProfile, MusicTimeRange, WeightedSignal } from "@/src/domain/music/types";
import type { ProductCandidate } from "@/src/domain/commerce/types";
import { listSupabaseProducts } from "@/src/repositories/supabaseProductSearchCache";

loadEnvConfig(process.cwd());

type ArtistInput = [string, string[], number];
type ProfileInput = {
  id: string;
  label: string;
  artists: ArtistInput[];
  tags: string[];
};

const profiles: ProfileInput[] = [
  {
    id: "megan-beyonce",
    label: "Megan Thee Stallion / Beyonce / Y2K Dirty South",
    artists: [
      ["Megan Thee Stallion", ["female rap", "southern hip hop", "dirty south rap", "trap", "pop rap", "baddie"], 100],
      ["Beyonce", ["r&b", "pop", "dance pop", "contemporary r&b", "club", "baddie"], 96],
      ["Nicki Minaj", ["female rap", "pop rap", "hip-hop", "y2k", "baddie"], 82],
      ["Ciara", ["r&b", "dance pop", "crunk", "2010s nostalgia"], 72],
    ],
    tags: ["sexy", "confident", "club", "glossy", "baddie", "y2k", "dirty south rap", "2010s nostalgia"],
  },
  {
    id: "goth-industrial",
    label: "Goth / Industrial / Darkwave",
    artists: [
      ["Nine Inch Nails", ["industrial", "dark electro", "rock"], 100],
      ["Bauhaus", ["goth", "darkwave", "post-punk"], 92],
      ["Siouxsie and the Banshees", ["gothic", "post-punk", "new wave"], 84],
      ["Boy Harsher", ["darkwave", "ebm", "industrial"], 78],
    ],
    tags: ["goth", "dark", "industrial", "moody", "dramatic", "rebellious"],
  },
  {
    id: "neo-soul-rnb",
    label: "Neo-Soul / R&B / Quiet Storm",
    artists: [
      ["Erykah Badu", ["neo-soul", "r&b", "soul"], 100],
      ["Sade", ["quiet storm", "soul", "r&b"], 92],
      ["Solange", ["neo-soul", "r&b", "art pop"], 86],
      ["Aaliyah", ["r&b", "y2k", "sensual"], 76],
    ],
    tags: ["sensual", "smooth", "warm", "soft", "sleek"],
  },
  {
    id: "hyperpop-rave",
    label: "Hyperpop / Rave / Internet Club",
    artists: [
      ["Charli XCX", ["hyperpop", "electropop", "club", "dance pop"], 100],
      ["SOPHIE", ["pc music", "hyperpop", "experimental"], 94],
      ["PinkPantheress", ["pop", "garage", "y2k"], 80],
      ["COBRAH", ["rave", "club", "electropop"], 72],
    ],
    tags: ["digital", "rave", "club", "electric", "experimental", "cyber"],
  },
  {
    id: "folk-country",
    label: "Folk / Country / Americana",
    artists: [
      ["Fleetwood Mac", ["rock", "folk"], 100],
      ["Kacey Musgraves", ["country", "americana"], 90],
      ["Joni Mitchell", ["folk", "singer-songwriter"], 84],
      ["Mitski", ["indie rock", "folk", "soft"], 72],
    ],
    tags: ["earthy", "worn-in", "heritage", "warm", "soft"],
  },
];

const artistId = (name: string) => name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "").replaceAll("'", "");

function range(profile: ProfileInput): MusicTimeRange {
  const base = {
    artists: profile.artists.map(([name, genres, weight]) => ({ id: artistId(name), name, genres, weight })),
    tracks: profile.tags.map((tag, index) => ({ id: `${profile.id}-${index}`, name: tag, artistIds: [], tags: [tag], weight: 100 - index * 7 })),
    genres: [] as WeightedSignal[],
    eras: [{ id: "2020s", label: "2020s", weight: 100 }],
  };
  return { ...base, genres: calculateGenreWeights(base) };
}

function musicProfile(profile: ProfileInput): MusicProfile {
  const shortTerm = range(profile);
  const empty: MusicTimeRange = { artists: [], tracks: [], genres: [], eras: [] };
  return combineTimeRanges({
    id: profile.id,
    displayName: profile.label,
    shortTerm,
    mediumTerm: empty,
    longTerm: empty,
  }, { longTerm: 0, mediumTerm: 0, shortTerm: 100 });
}

function intentCategoriesForProduct(product: ProductCandidate, category: string) {
  const productCategory = product.attributes.category;
  if (category === "accessory") return productCategory && ["bag", "jewelry", "accessory"].includes(productCategory);
  return productCategory === category;
}

async function statementPieces(profile: ProfileInput) {
  const music = musicProfile(profile);
  const style = buildStyleProfile(music);
  const intents = generateGarmentIntents(style, generatePalette(style));
  const categories = [
    { label: "outerwear", db: ["outerwear"] },
    { label: "top", db: ["top"] },
    { label: "bottom", db: ["bottom"] },
    { label: "dress", db: ["dress"] },
    { label: "shoes", db: ["shoes"] },
    { label: "accessory", db: ["bag", "jewelry", "accessory"] },
  ];
  const productsByCategory = await Promise.all(categories.map(({ label, db }) => {
    const garmentTypes = intents
      .filter((intent) => label === "accessory" ? ["bag", "jewelry", "accessory"].includes(intent.category) : intent.category === label)
      .map((intent) => intent.garmentType);
    return listSupabaseProducts({ categories: db, garmentTypes, limit: 60 });
  }));
  const allProducts = productsByCategory.flat();
  const scored = allProducts.flatMap((product) => intents
    .filter((intent) => intentCategoriesForProduct(product, intent.category === "bag" || intent.category === "jewelry" ? "accessory" : intent.category))
    .map((intent) => ({ product, intent, result: scoreProduct(product, intent, { maxPrice: 350 }) })))
    .sort((a, b) => b.result.score - a.result.score);

  const bestByCategory = new Map<string, typeof scored[number]>();
  for (const entry of scored) {
    const category = entry.product.attributes.category && ["bag", "jewelry", "accessory"].includes(entry.product.attributes.category)
      ? "accessory"
      : entry.product.attributes.category ?? "unknown";
    if (!bestByCategory.has(category) && entry.result.score > 0) bestByCategory.set(category, entry);
  }

  return {
    profile,
    indicators: [
      ...style.aesthetics.slice(0, 4),
      ...style.materials.slice(0, 3),
      ...style.silhouettes.slice(0, 2),
    ].map((signal) => signal.label),
    intents: intents.slice(0, 8).map((intent) => intent.garmentType),
    pieces: Array.from(bestByCategory.entries()).map(([category, entry]) => ({
      category,
      title: entry.product.title,
      retailer: entry.product.retailer,
      score: entry.result.score,
      intent: entry.intent.garmentType,
    })).sort((a, b) => b.score - a.score),
  };
}

async function main() {
  for (const profile of profiles) {
    const result = await statementPieces(profile);
    console.log(`\n## ${result.profile.label}`);
    console.log(`STYLE INDICATORS: ${result.indicators.map((item) => item.toUpperCase()).join(" / ")}`);
    console.log(`INTENTS: ${result.intents.join(" / ")}`);
    for (const piece of result.pieces.slice(0, 7)) {
      console.log(`- ${piece.category.toUpperCase()}: ${piece.title} (${piece.retailer}) — ${piece.score}% via ${piece.intent}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
