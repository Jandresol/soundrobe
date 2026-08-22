import { strict as assert } from "node:assert";
import type { ProductCandidate, ProductRecommendation } from "@/src/domain/commerce/types";
import type { MusicProfile, MusicTimeRange, WeightedSignal } from "@/src/domain/music/types";
import type { GarmentCategory, GarmentIntent } from "@/src/domain/style/types";
import { assembleOutfits } from "@/src/engine/outfit/assembleOutfits";
import { rankProducts } from "@/src/engine/ranking/rankProducts";
import { scoreProduct } from "@/src/engine/ranking/scoreProduct";
import { buildStyleProfile } from "@/src/engine/style/buildStyleProfile";
import { generateGarmentIntents } from "@/src/engine/style/generateGarmentIntents";
import { generatePalette } from "@/src/engine/style/generatePalette";
import { DemoCommerceProvider } from "@/src/services/commerce/DemoCommerceProvider";
import { TestCatalogCommerceProvider } from "@/src/services/commerce/TestCatalogCommerceProvider";
import { DemoMusicProvider } from "@/src/services/music/DemoMusicProvider";
import { combineTimeRanges } from "@/src/engine/music/combineTimeRanges";
import testProductCatalog from "@/src/fixtures/products/testProductCatalog.json";
import { GARMENT_CATEGORY } from "@/src/knowledge/garmentCompatibility";
import { genreFashionAssociations } from "@/src/knowledge/genreFashionMap";

const requiredCategories = ["outerwear", "top", "bottom", "shoes", "bag", "jewelry", "accessory"] satisfies GarmentCategory[];

async function profile(id: string) {
  const music = await new DemoMusicProvider(id).getMusicProfile();
  return { music, style: buildStyleProfile(music) };
}

async function ranked(id: string) {
  const { style } = await profile(id);
  return rankForStyle(style, new DemoCommerceProvider());
}

async function rankForStyle(style: ReturnType<typeof buildStyleProfile>, commerce: DemoCommerceProvider | TestCatalogCommerceProvider) {
  const intents = generateGarmentIntents(style);
  return rankProducts(await Promise.all(intents.map(async (intent) => ({ intent, candidates: await commerce.search(intent) }))));
}

void (async () => {
  await existingMvpTests();
  await oppositeUserTest();
  await similarUserTest();
  await timeWeightTest();
  singleSignalTest();
  mixedSignalTest();
  obscureTagTest();
  await retrievalTest();
  rankingTest();
  outfitCoherenceTest();
  await endToEndMutationTest();
  await preAwinDeterminismTest();
  await preAwinSensitivityTest();
  await preAwinStabilityTest();
  await preAwinRelevanceTest();
  console.log("Recommendation tests passed");
})();

async function existingMvpTests() {
  const rock70s = await profile("demo-70s");
  const rock00s = await profile("demo-jasmine");
  assert.notDeepEqual(rock70s.style.garmentTypes.slice(0, 3), rock00s.style.garmentTypes.slice(0, 3), "era should change fashion signals");

  assert(rock00s.style.materials.some((signal) => signal.label === "leather"));
  assert(rock00s.style.materials.some((signal) => signal.label === "knit" || signal.label === "rib knit"), "multidimensional profile keeps multiple genres");

  assert(rock00s.music.combinedGenres[0].label !== rock00s.music.shortTerm.genres[0]?.label || rock00s.music.combinedGenres[0].weight >= rock00s.music.shortTerm.genres[0]?.weight, "long-term listening should dominate spikes");
  assert.notDeepEqual(generatePalette(rock70s.style).map((color) => color.name), generatePalette(rock00s.style).map((color) => color.name), "palette is generated from style signals");
  assert.notDeepEqual(generateGarmentIntents(rock70s.style).map((intent) => intent.searchQuery), generateGarmentIntents(rock00s.style).map((intent) => intent.searchQuery), "garment intents change with music");

  const recs = await ranked("demo-jasmine");
  assert(recs[0].reasons.some((reason) => reason.source === "garment type"), "ranking favors generated intent matches");

  const outfits = assembleOutfits(recs);
  assert(outfits.every((outfit) => outfit.products.filter((entry) => entry.intent.category === "shoes").length <= 1), "outfits respect category constraints");
  assert(outfits.some((outfit) => outfit.reasons.some((reason) => reason.signal === "musicInfluenceCoverage" && reason.contribution > 20)), "outfits reward influence coverage");

  assert(testProductCatalog.length >= 50, "test catalog has enough products to exercise retrieval");
  assert.deepEqual(unmappedGenreMapGarments(), [], "genre map garments are category-mapped");
}

async function oppositeUserTest() {
  const punkIndustrial = styleForGenres(["punk", "industrial", "dark electro"], ["2000s"]);
  const neoSoulRnb = styleForGenres(["neo-soul", "r&b", "quiet storm"], ["1990s"]);
  const punkIntents = generateGarmentIntents(punkIndustrial);
  const rnbIntents = generateGarmentIntents(neoSoulRnb);
  const punkProducts = await rankForStyle(punkIndustrial, new TestCatalogCommerceProvider({ maxPrice: 250 }));
  const rnbProducts = await rankForStyle(neoSoulRnb, new TestCatalogCommerceProvider({ maxPrice: 250 }));

  assert(jaccard(labels(punkIndustrial.garmentTypes, 8), labels(neoSoulRnb.garmentTypes, 8)) < 0.45, "opposite users get different style profiles");
  assert(jaccard(punkIntents.map((intent) => intent.garmentType), rnbIntents.map((intent) => intent.garmentType)) < 0.55, "opposite users get different garment intents");
  assert(jaccard(punkProducts.slice(0, 8).map((rec) => rec.product.id), rnbProducts.slice(0, 8).map((rec) => rec.product.id)) < 0.5, "opposite users retrieve different products");
  assert.notDeepEqual(assembleOutfits(punkProducts)[0]?.products.map((rec) => rec.product.id), assembleOutfits(rnbProducts)[0]?.products.map((rec) => rec.product.id), "opposite users get different outfits");
}

async function similarUserTest() {
  const base = styleForGenres(["r&b", "neo-soul", "soul", "pop", "club"], ["2000s"]);
  const similar = styleForGenres(["r&b", "neo-soul", "soul", "pop", "sensual"], ["2000s"]);
  const baseProducts = await rankForStyle(base, new TestCatalogCommerceProvider({ maxPrice: 250 }));
  const similarProducts = await rankForStyle(similar, new TestCatalogCommerceProvider({ maxPrice: 250 }));
  assert(jaccard(labels(base.garmentTypes, 10), labels(similar.garmentTypes, 10)) >= 0.5, "similar users keep similar style signals");
  assert(jaccard(baseProducts.slice(0, 10).map((rec) => rec.product.id), similarProducts.slice(0, 10).map((rec) => rec.product.id)) >= 0.35, "similar users keep overlapping product recommendations");
}

function timeWeightTest() {
  const raw = {
    id: "time-test",
    displayName: "Time Test",
    shortTerm: range(["club", "hyperpop", "rave"], ["2020s"]),
    mediumTerm: range(["r&b", "soul"], ["2000s"]),
    longTerm: range(["folk", "blues", "country"], ["1970s"]),
  };
  const recentHeavy = buildStyleProfile(combineTimeRanges(raw, { longTerm: 0.05, mediumTerm: 0.15, shortTerm: 0.8 }));
  const longHeavy = buildStyleProfile(combineTimeRanges(raw, { longTerm: 0.8, mediumTerm: 0.15, shortTerm: 0.05 }));
  assert(recentHeavy.traits.some((signal) => ["club", "digital", "electric"].includes(signal.id)), "recent-heavy mix follows recent taste");
  assert(longHeavy.traits.some((signal) => ["heritage", "worn-in", "earthy"].includes(signal.id)), "long-heavy mix reflects established taste");
}

function singleSignalTest() {
  const punk = styleForGenres(["punk"]);
  const rnb = styleForGenres(["r&b"]);
  const club = styleForGenres(["club"]);
  assert(punk.materials.some((signal) => signal.id === "leather") && punk.garmentTypes.some((signal) => signal.id === "moto jacket"), "punk maps to leather and moto jacket");
  assert(rnb.materials.some((signal) => signal.id === "satin" || signal.id === "rib knit") && rnb.accessories.some((signal) => signal.id === "gold hoops"), "r&b maps to sleek materials and hoops");
  assert(club.materials.some((signal) => signal.id === "patent" || signal.id === "mesh") && club.aesthetics.some((signal) => signal.id === "club"), "club maps to club materials/aesthetic");
}

function mixedSignalTest() {
  const mixed = styleForGenres(["r&b", "punk"]);
  assert(mixed.materials.some((signal) => signal.id === "leather"), "mixed profile keeps punk material");
  assert(mixed.accessories.some((signal) => signal.id === "gold hoops"), "mixed profile keeps r&b accessory");
}

function obscureTagTest() {
  const obscure = styleForGenres(["crystalline basement pop", "moon mall wave", "r&b"]);
  assert(obscure.garmentTypes.some((signal) => ["white tee", "straight jeans", "sneakers", "tote bag"].includes(signal.id)), "unknown tags get reasonable fallback staples");
  assert(obscure.accessories.some((signal) => signal.id === "gold hoops"), "known signal is not overpowered by unknown fallback");
}

async function retrievalTest() {
  const style = styleForGenres(["r&b", "punk", "club"], ["2000s"]);
  const intents = generateGarmentIntents(style);
  for (const commerce of [new DemoCommerceProvider({ maxPrice: 250 }), new TestCatalogCommerceProvider({ maxPrice: 250 })]) {
    for (const intent of intents) {
      const products = await commerce.search(intent);
      assert(products.every((product) => product.attributes.category === intent.category), `${commerce.constructor.name} returns ${intent.category} products for ${intent.garmentType}`);
    }
  }
  const testCatalogRecs = await rankForStyle(style, new TestCatalogCommerceProvider({ maxPrice: 250 }));
  const categories = new Set(testCatalogRecs.map((recommendation) => recommendation.intent.category));
  for (const category of requiredCategories) assert(categories.has(category), `test catalog retrieves ${category} recommendations`);
}

function rankingTest() {
  const intent = intentFor("top", "rib knit long sleeve", ["burgundy"], ["rib knit"], ["sensual"]);
  const good = product("good-top", "top", "rib knit long sleeve", ["burgundy"], ["rib knit"], ["sensual"]);
  const bad = product("bad-top", "top", "graphic baby tee", ["white"], ["cotton"], ["casual"]);
  assert(scoreProduct(good, intent, { maxPrice: 250 }).score > scoreProduct(bad, intent, { maxPrice: 250 }).score, "obviously better product ranks higher");
}

function outfitCoherenceTest() {
  const recommendations: ProductRecommendation[] = [
    recommendation("top", "rib knit long sleeve", ["black"], ["rib knit"], 92),
    recommendation("top", "graphic baby tee", ["hot pink"], ["cotton"], 90),
    recommendation("bottom", "low-rise jeans", ["black"], ["washed denim"], 88),
    recommendation("shoes", "boots", ["black"], ["leather"], 86),
    recommendation("bag", "compact shoulder bag", ["black"], ["leather"], 82),
  ];
  const outfits = assembleOutfits(recommendations);
  assert(outfits.every((outfit) => outfit.products.filter((entry) => entry.intent.category === "top").length <= 1), "assembler avoids duplicate top nonsense in one outfit");
  assert(outfits.every((outfit) => outfit.products.some((entry) => entry.intent.category === "shoes")), "assembler requires shoes for valid outfits");
}

async function endToEndMutationTest() {
  const baseMusic = musicProfile(["r&b", "soul", "pop"], ["2000s"]);
  const mutatedMusic = musicProfile(["r&b", "soul", "punk"], ["2000s"]);
  const baseStyle = buildStyleProfile(baseMusic);
  const mutatedStyle = buildStyleProfile(mutatedMusic);
  const baseIntents = generateGarmentIntents(baseStyle);
  const mutatedIntents = generateGarmentIntents(mutatedStyle);
  const commerce = new TestCatalogCommerceProvider({ maxPrice: 250 });
  const baseRanked = await rankProducts(await Promise.all(baseIntents.map(async (intent) => ({ intent, candidates: await commerce.search(intent) }))));
  const mutatedRanked = await rankProducts(await Promise.all(mutatedIntents.map(async (intent) => ({ intent, candidates: await commerce.search(intent) }))));
  const baseOutfits = assembleOutfits(baseRanked);
  const mutatedOutfits = assembleOutfits(mutatedRanked);

  assert.notDeepEqual(baseMusic.combinedGenres.map((signal) => signal.id), mutatedMusic.combinedGenres.map((signal) => signal.id), "music input changes");
  assert.notDeepEqual(labels(baseStyle.garmentTypes, 8), labels(mutatedStyle.garmentTypes, 8), "style profile changes");
  assert.notDeepEqual(baseIntents.map((intent) => intent.searchQuery), mutatedIntents.map((intent) => intent.searchQuery), "garment searches change");
  assert.notDeepEqual(baseRanked.slice(0, 10).map((rec) => rec.product.id), mutatedRanked.slice(0, 10).map((rec) => rec.product.id), "retrieved/ranked products change");
  assert.notDeepEqual(baseOutfits[0]?.products.map((rec) => rec.product.id), mutatedOutfits[0]?.products.map((rec) => rec.product.id), "assembled outfit changes");
}

async function preAwinDeterminismTest() {
  const style = styleForGenres(["r&b", "neo-soul", "club"], ["2000s"]);
  const first = await rankForStyle(style, new TestCatalogCommerceProvider({ maxPrice: 250 }));
  const second = await rankForStyle(style, new TestCatalogCommerceProvider({ maxPrice: 250 }));
  assert.deepEqual(first.slice(0, 12).map((rec) => [rec.product.id, rec.intent.id, rec.score]), second.slice(0, 12).map((rec) => [rec.product.id, rec.intent.id, rec.score]), "test_catalog recommendations are deterministic");
}

async function preAwinSensitivityTest() {
  const punkIndustrial = await rankForStyle(styleForGenres(["punk", "industrial", "hardcore"], ["2000s"]), new TestCatalogCommerceProvider({ maxPrice: 250 }));
  const softSoul = await rankForStyle(styleForGenres(["neo-soul", "r&b", "quiet storm"], ["1990s"]), new TestCatalogCommerceProvider({ maxPrice: 250 }));
  assert(jaccard(punkIndustrial.slice(0, 12).map((rec) => rec.product.id), softSoul.slice(0, 12).map((rec) => rec.product.id)) < 0.5, "test_catalog recommendations respond to meaningfully different music");
}

async function preAwinStabilityTest() {
  const base = await rankForStyle(styleForGenres(["r&b", "neo-soul", "soul", "pop"], ["2000s"]), new TestCatalogCommerceProvider({ maxPrice: 250 }));
  const tinyChange = await rankForStyle(styleForGenres(["r&b", "neo-soul", "soul", "dance pop"], ["2000s"]), new TestCatalogCommerceProvider({ maxPrice: 250 }));
  assert(jaccard(base.slice(0, 12).map((rec) => rec.product.id), tinyChange.slice(0, 12).map((rec) => rec.product.id)) >= 0.45, "tiny music changes do not replace the whole wardrobe");
}

async function preAwinRelevanceTest() {
  const style = styleForGenres(["r&b", "sensual"], ["2000s"]);
  const products = await rankForStyle(style, new TestCatalogCommerceProvider({ maxPrice: 250 }));
  const topIds = products.slice(0, 8).map((rec) => rec.product.id);
  assert(topIds.includes("test-rib-knit") || topIds.includes("test-slip-skirt") || topIds.includes("test-bodycon"), "test_catalog ranker finds obvious r&b/sensual matches");
}

function styleForGenres(genres: string[], eras: string[] = []) {
  return buildStyleProfile(musicProfile(genres, eras));
}

function musicProfile(genres: string[], eras: string[] = []): MusicProfile {
  const timeRange = range(genres, eras);
  return {
    id: `profile-${genres.join("-")}`,
    displayName: "Test Profile",
    shortTerm: timeRange,
    mediumTerm: timeRange,
    longTerm: timeRange,
    combinedGenres: signals(genres),
    combinedEras: signals(eras),
  };
}

function range(genres: string[], eras: string[] = []): MusicTimeRange {
  return {
    artists: genres.map((genre, index) => ({ id: `artist-${genre}-${index}`, name: genre, genres: [genre], weight: 100 - index * 8 })),
    tracks: [],
    genres: signals(genres),
    eras: signals(eras),
  };
}

function signals(labelsToUse: string[]): WeightedSignal[] {
  return labelsToUse.map((label, index) => ({ id: label.toLowerCase(), label, weight: 100 - index * 8 }));
}

function labels(signalsToUse: WeightedSignal[], limit: number) {
  return signalsToUse.slice(0, limit).map((signal) => signal.id);
}

function jaccard(left: string[], right: string[]) {
  const a = new Set(left);
  const b = new Set(right);
  const intersection = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 1;
}

function intentFor(category: GarmentCategory, garmentType: string, colors: string[], materials: string[], aesthetics: string[]): GarmentIntent {
  return {
    id: `intent-${garmentType}`,
    category,
    garmentType,
    colors,
    materials,
    silhouettes: ["fitted"],
    aesthetics,
    eras: ["2000s"],
    musicSources: [{ kind: "genre", id: "r&b", label: "r&b", weight: 100 }],
    priority: 100,
    searchQuery: `womenswear ${colors[0]} ${materials[0]} ${garmentType}`,
    department: "womenswear",
  };
}

function product(id: string, category: GarmentCategory, garmentType: string, colors: string[], materials: string[], aesthetics: string[]): ProductCandidate {
  return {
    id,
    retailer: "Test",
    title: id,
    price: 50,
    currency: "USD",
    imageUrl: "https://example.com/image.jpg",
    productUrl: `https://example.com/${id}`,
    availability: "in_stock",
    attributes: { category, garmentType, colors, materials, aesthetics, silhouettes: ["fitted"], eras: ["2000s"] },
  };
}

function recommendation(category: GarmentCategory, garmentType: string, colors: string[], materials: string[], score: number): ProductRecommendation {
  const intent = intentFor(category, garmentType, colors, materials, ["sleek"]);
  return { product: product(`product-${category}-${garmentType}`, category, garmentType, colors, materials, ["sleek"]), intent, score, reasons: [] };
}

function unmappedGenreMapGarments() {
  return [...new Set(genreFashionAssociations.flatMap((association) => [
    ...(association.signals.garmentTypes ?? []),
    ...(association.signals.accessories ?? []),
  ]).filter((garment) => !GARMENT_CATEGORY[garment]))].sort();
}
