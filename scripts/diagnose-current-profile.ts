import { buildStyleProfile } from "@/src/engine/style/buildStyleProfile";
import { loadEnvConfig } from "@next/env";
import { generateGarmentIntents } from "@/src/engine/style/generateGarmentIntents";
import { generatePalette } from "@/src/engine/style/generatePalette";
import { scoreProduct } from "@/src/engine/ranking/scoreProduct";
import { combineTimeRanges } from "@/src/engine/music/combineTimeRanges";
import type { MusicProfile, MusicTimeRange, WeightedSignal } from "@/src/domain/music/types";
import type { ProductCandidate } from "@/src/domain/commerce/types";
import { listSupabaseProducts } from "@/src/repositories/supabaseProductSearchCache";
import { calculateGenreWeights } from "@/src/engine/music/calculateGenreWeights";

loadEnvConfig(process.cwd());

type RangeInput = Array<[string, string[], number]>;

const artistId = (name: string) => name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "").replaceAll("'", "");
const signals = (items: Array<[string, number]>): WeightedSignal[] => items.map(([label, weight]) => ({ id: label.toLowerCase(), label, weight }));

function range(artists: RangeInput, genres: Array<[string, number]>, tags: string[] = []): MusicTimeRange {
  const base = {
    artists: artists.map(([name, artistGenres, weight]) => ({ id: artistId(name), name, genres: artistGenres, weight })),
    tracks: tags.map((tag, index) => ({
      id: `track-tag-${index}`,
      name: tag,
      artistIds: [],
      tags: [tag],
      weight: 100 - index * 8,
    })),
    genres: signals(genres),
    eras: signals([["2020s", 100]]),
  };
  return { ...base, genres: calculateGenreWeights(base) };
}

function candidate(title: string, category: string, garmentType: string, aesthetics: string[], materials: string[] = [], colors: string[] = ["black"]): ProductCandidate {
  return {
    id: title.toLowerCase().replace(/\W+/g, "-").slice(0, 60),
    retailer: title.includes("Fashion Nova") ? "Fashion Nova" : title.includes("ZARA") ? "Zara USA" : title.includes("Kohl") ? "Kohl's" : title.includes("Etsy") ? "Etsy - Seller" : "Diagnostic",
    title,
    price: 50,
    currency: "USD",
    imageUrl: "",
    productUrl: `https://example.com/${encodeURIComponent(title)}`,
    availability: "in_stock",
    attributes: { category, garmentType, colors, materials, aesthetics },
  };
}

async function main() {
  const profileName = process.argv[2] ?? "jasmine-alt";
  const shortTerm = profileName === "megan-beyonce"
    ? range(
      [
        ["Megan Thee Stallion", ["female rap", "southern hip hop", "dirty south rap", "trap", "pop rap", "baddie"], 100],
        ["Beyoncé", ["r&b", "pop", "dance pop", "contemporary r&b", "club", "baddie"], 96],
        ["Nicki Minaj", ["female rap", "pop rap", "hip-hop", "y2k", "baddie"], 82],
        ["Ciara", ["r&b", "dance pop", "crunk", "2010s nostalgia"], 72],
        ["Destiny's Child", ["r&b", "pop", "2000s r&b", "y2k"], 64],
      ],
      [["female rap", 100], ["baddie", 96], ["dirty south rap", 88], ["southern hip hop", 84], ["r&b", 76], ["dance pop", 70], ["y2k", 68], ["2010s nostalgia", 60]],
      ["sexy", "confident", "club", "glossy", "baddie", "y2k", "dirty south rap", "2010s nostalgia"],
    )
    : range(
      [
        ["WILLOW", ["r&b", "contemporary r&b", "pop", "alternative-rock", "alternative rock", "rock", "femme", "art-pop"], 100],
        ["Michael Jackson", ["pop", "club", "dance pop", "electropop", "soul", "funk", "r&b", "rock", "alternative rock"], 92],
        ["Joan Jett & the Blackhearts", ["rock", "alternative rock", "classic-rock", "femme", "punk", "hard-rock"], 86],
        ["Tyler, The Creator", ["hip-hop", "rap", "horrorcore", "experimental hip hop"], 72],
        ["Jorge Vercillo", ["mpb", "pop", "soft rock", "alternative rock", "rock", "romantic"], 58],
      ],
      [["rock", 100], ["alternative rock", 100], ["pop", 92], ["rap", 71], ["hip-hop", 71], ["punk", 57]],
      ["femme", "riot-grrrl", "club", "feminist", "romantic", "gothic"],
    );
  const empty = range([], [], []);
  const musicProfile: MusicProfile = combineTimeRanges({
    id: `diagnostic-${profileName}`,
    displayName: `Diagnostic ${profileName}`,
    shortTerm,
    mediumTerm: empty,
    longTerm: empty,
  }, { longTerm: 0, mediumTerm: 0, shortTerm: 100 });

  const style = buildStyleProfile(musicProfile);
  const palette = generatePalette(style);
  const intents = generateGarmentIntents(style, palette);
  console.log("\nTOP STYLE");
  console.table({
    genres: musicProfile.combinedGenres.slice(0, 12).map((signal) => `${signal.label}:${signal.weight}`).join(" / "),
    materials: style.materials.slice(0, 8).map((signal) => `${signal.label}:${signal.weight}`).join(" / "),
    garments: style.garmentTypes.slice(0, 12).map((signal) => `${signal.label}:${signal.weight}`).join(" / "),
    aesthetics: style.aesthetics.slice(0, 8).map((signal) => `${signal.label}:${signal.weight}`).join(" / "),
  });

  console.log("\nINTENTS");
  console.table(intents.map((intent) => ({
    category: intent.category,
    type: intent.garmentType,
    priority: intent.priority,
    aesthetics: intent.aesthetics.join(", "),
    sources: intent.musicSources.slice(0, 3).map((source) => source.label).join(", "),
    query: intent.searchQuery,
  })));

  const pastedProducts = [
    candidate("Women's Long Sleeve Denim Jacket with Cargo Pockets", "outerwear", "cropped denim jacket", ["casual"], ["denim"], ["denim"]),
    candidate("Handmade gray cotton lace ruffle cami knit long tank layered tiered y2k 2000's 2010's fashion full length lacy frilly tank top", "top", "layered tank", ["romantic"], ["cotton", "lace", "knit"], ["gray"]),
    candidate("Fashion Nova In The Spotlight Leopard Mini Dress", "dress", "leopard mini dress", ["baddie", "club"], ["mesh"], ["leopard print"]),
    candidate("I.n.c. International Concepts Fawne Leather Knee High Boots, Created for Macy's - Black Leather - Size 5.5M", "shoes", "knee-high boots", ["club"], ["leather"], ["black"]),
  ];

  console.log("\nPASTED PRODUCT BEST SCORES");
  console.table(pastedProducts.map((product) => {
    const scored = intents
      .filter((intent) => intent.category === product.attributes.category)
      .map((intent) => ({ intent, result: scoreProduct(product, intent, { maxPrice: 350 }) }))
      .sort((a, b) => b.result.score - a.result.score)[0];
    return {
      product: product.title.slice(0, 70),
      category: product.attributes.category,
      productType: product.attributes.garmentType,
      bestIntent: scored?.intent.garmentType,
      score: scored?.result.score,
      reasons: scored?.result.reasons.map((reason) => `${reason.source}:${reason.signal}+${reason.contribution}`).join(" | "),
    };
  }));

  const outerwearTypes = intents.filter((intent) => intent.category === "outerwear").map((intent) => intent.garmentType);
  const topTypes = intents.filter((intent) => intent.category === "top").map((intent) => intent.garmentType);
  const bottomTypes = intents.filter((intent) => intent.category === "bottom").map((intent) => intent.garmentType);
  const dressTypes = intents.filter((intent) => intent.category === "dress").map((intent) => intent.garmentType);
  const shoeTypes = intents.filter((intent) => intent.category === "shoes").map((intent) => intent.garmentType);
  const accessoryTypes = intents.filter((intent) => ["bag", "jewelry", "accessory"].includes(intent.category)).map((intent) => intent.garmentType);
  const [outerwear, tops, bottoms, dresses, shoes, accessories] = await Promise.all([
    listSupabaseProducts({ categories: ["outerwear"], garmentTypes: outerwearTypes, limit: 20 }),
    listSupabaseProducts({ categories: ["top"], garmentTypes: topTypes, limit: 20 }),
    listSupabaseProducts({ categories: ["bottom"], garmentTypes: bottomTypes, limit: 20 }),
    listSupabaseProducts({ categories: ["dress"], garmentTypes: dressTypes, limit: 20 }),
    listSupabaseProducts({ categories: ["shoes"], garmentTypes: shoeTypes, limit: 20 }),
    listSupabaseProducts({ categories: ["bag", "jewelry", "accessory"], garmentTypes: accessoryTypes, limit: 20 }),
  ]);

  console.log("\nDB LOAD");
  console.table({
    outerwearTypes: outerwearTypes.join(", "),
    outerwearLoaded: outerwear.length,
    topTypes: topTypes.join(", "),
    topsLoaded: tops.length,
    bottomTypes: bottomTypes.join(", "),
    bottomsLoaded: bottoms.length,
    dressTypes: dressTypes.join(", "),
    dressesLoaded: dresses.length,
    shoeTypes: shoeTypes.join(", "),
    shoesLoaded: shoes.length,
    accessoryTypes: accessoryTypes.join(", "),
    accessoriesLoaded: accessories.length,
  });

  const allScored = [
    ...outerwear,
    ...tops,
    ...bottoms,
    ...dresses,
    ...shoes,
    ...accessories,
  ].map((product) => {
    const scored = intents
      .filter((intent) => intent.category === product.attributes.category || (product.attributes.category && ["bag", "jewelry", "accessory"].includes(product.attributes.category) && ["bag", "jewelry", "accessory"].includes(intent.category)))
      .map((intent) => ({ intent, result: scoreProduct(product, intent, { maxPrice: 350 }) }))
      .sort((a, b) => b.result.score - a.result.score)[0];
    return { product, scored };
  }).filter((entry) => entry.scored);

  console.log("\nOVERALL TOP PRODUCTS");
  console.table(allScored
    .sort((a, b) => b.scored.result.score - a.scored.result.score)
    .slice(0, 18)
    .map(({ product, scored }) => ({
      category: product.attributes.category,
      title: product.title.slice(0, 64),
      retailer: product.retailer,
      type: product.attributes.garmentType,
      score: scored.result.score,
      bestIntent: scored.intent.garmentType,
    })));

  for (const [label, products] of [["outerwear", outerwear], ["tops", tops], ["bottoms", bottoms], ["dresses", dresses], ["shoes", shoes], ["accessories", accessories]] as const) {
    console.log(`\nDB ${label.toUpperCase()} SCORES`);
    console.table(products.slice(0, 12).map((product) => {
      const scored = intents
        .filter((intent) => intent.category === product.attributes.category)
        .map((intent) => ({ intent, result: scoreProduct(product, intent, { maxPrice: 350 }) }))
        .sort((a, b) => b.result.score - a.result.score)[0];
      return {
        title: product.title.slice(0, 60),
        type: product.attributes.garmentType,
        score: scored?.result.score,
        bestIntent: scored?.intent.garmentType,
        reasons: scored?.result.reasons.map((reason) => `${reason.source}+${reason.contribution}`).join(", "),
      };
    }));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
