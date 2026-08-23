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
import { calculateGenreWeights } from "@/src/engine/music/calculateGenreWeights";
import testProductCatalog from "@/src/fixtures/products/testProductCatalog.json";
import { GARMENT_CATEGORY } from "@/src/knowledge/garmentCompatibility";
import { genreFashionAssociations } from "@/src/knowledge/genreFashionMap";
import { intentPriority } from "@/src/repositories/supabaseProductSearchCache";

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
  genreEraInteractionTest();
  sceneLevelFashionMapTest();
  singleSignalTest();
  mixedSignalTest();
  multiIntentShoeTest();
  altRiotShoePriorityTest();
  y2kGlamShoeIntentTest();
  earthySoulWardrobeTest();
  eightiesPopVintageTest();
  artistStyleSignalTest();
  obscureTagTest();
  await retrievalTest();
  rankingTest();
  productContextScoringTest();
  outfitCoherenceTest();
  await endToEndMutationTest();
  await preAwinDeterminismTest();
  await preAwinSensitivityTest();
  await preAwinStabilityTest();
  await preAwinRelevanceTest();
  repositoryIntentOrderingTest();
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
  assert(jaccard(baseProducts.slice(0, 10).map((rec) => rec.product.id), similarProducts.slice(0, 10).map((rec) => rec.product.id)) >= 0.3, "similar users keep overlapping product recommendations");
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

function genreEraInteractionTest() {
  const alt2000s = styleForGenres(["neo-soul", "punk", "r&b", "alternative rock"], ["2000s"]);
  const rock70s = styleForGenres(["rock", "folk", "blues", "classic rock"], ["1970s"]);
  const y2kPop = styleForGenres(["pop", "dance pop", "electropop", "y2k"], ["2000s"]);

  assert(alt2000s.garmentTypes.some((signal) => ["graphic baby tee", "distressed fitted graphic tee", "low-rise jeans", "moto jacket", "cropped leather jacket"].includes(signal.id)), "2000s alternative mix produces 2000s alt garments without leaning on hoodies");
  assert(rock70s.garmentTypes.some((signal) => ["bell bottoms", "crochet top", "fitted knit top", "suede jacket", "vintage boots"].includes(signal.id)), "70s rock/folk/blues produces era-specific vintage garments");
  assert(jaccard(labels(alt2000s.garmentTypes, 10), labels(rock70s.garmentTypes, 10)) < 0.55, "rock profiles in different eras produce different garments");
  assert(jaccard(labels(alt2000s.materials, 8), labels(rock70s.materials, 8)) < 0.75, "rock profiles in different eras produce different materials");
  assert(jaccard(labels(alt2000s.silhouettes, 6), labels(rock70s.silhouettes, 6)) < 0.8, "rock profiles in different eras produce different silhouettes");
  assert(y2kPop.garmentTypes.some((signal) => ["platform heels", "mini skirt", "mini dress", "halter top"].includes(signal.id)), "Y2K pop remains a distinct positive control");
}

function sceneLevelFashionMapTest() {
  const grunge90s = styleForGenres(["grunge", "slacker rock", "alternative rock"], ["1990s"]);
  const postGrunge00s = styleForGenres(["post-grunge", "modern rock", "alternative rock"], ["2000s"]);
  const shoegaze = styleForGenres(["shoegaze", "dream pop"], ["1990s"]);
  const riot = styleForGenres(["riot-grrrl", "punk", "alternative rock"], ["1990s"]);
  const indieSleaze = styleForGenres(["indie sleaze", "garage rock", "dance-punk"], ["2000s"]);

  assert(grunge90s.materials.some((signal) => ["washed denim", "flannel", "fuzzy knit", "distressed denim"].includes(signal.id)), "90s grunge prioritizes lived-in denim/flannel/knit textures");
  assert(grunge90s.garmentTypes.some((signal) => ["flannel shirt", "faded tee", "baggy jeans", "cardigan", "slip dress", "worn sneakers"].includes(signal.id)), "90s grunge produces relaxed layered garments");
  assert(!labels(grunge90s.garmentTypes, 5).includes("moto jacket"), "90s grunge is not primarily moto/leather fashion");

  assert(postGrunge00s.garmentTypes.some((signal) => ["thermal top", "distressed fitted graphic tee", "low-rise jeans", "moto boots"].includes(signal.id)), "2000s post-grunge produces distinct post-grunge garments without hoodie filler");
  assert(shoegaze.garmentTypes.some((signal) => ["oversized knit", "soft camisole", "maxi skirt", "mary janes", "ballet flats"].includes(signal.id)), "shoegaze/dream-pop produces soft hazy garments");
  assert(riot.garmentTypes.some((signal) => ["graphic baby tee", "band tee", "slip dress", "combat boots", "flannel shirt"].includes(signal.id)), "riot grrrl/90s alternative gets DIY alt pieces");
  assert(indieSleaze.garmentTypes.some((signal) => ["low-rise jeans", "leather pants", "moto jacket", "skinny scarf"].includes(signal.id)), "indie sleaze keeps downtown 2000s pieces");
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

function multiIntentShoeTest() {
  const style = styleForGenres(["dirty south rap", "southern hip hop", "r&b", "dance pop", "pop rap", "club", "sexy", "confident"], ["2010s", "2000s"]);
  const shoeIntents = generateGarmentIntents(style).filter((intent) => intent.category === "shoes");
  assert(shoeIntents.length > 1, "shoe intents include alternatives instead of one winner");
  assert(shoeIntents.some((intent) => ["heel", "boot", "sandal"].some((word) => intent.garmentType.includes(word))), "club/sexy/confident signals add dressier shoe alternatives");
  assert(!shoeIntents[0]?.garmentType.includes("sneaker"), "baddie/dirty-south profiles do not lead with sneakers");
}

function altRiotShoePriorityTest() {
  const style = styleForGenres(["rock", "alternative rock", "pop", "rap", "hip-hop", "punk", "riot-grrrl", "club"], ["2020s"]);
  const shoeIntents = generateGarmentIntents(style).filter((intent) => intent.category === "shoes");
  const boots = shoeIntents.find((intent) => intent.garmentType.includes("boots"));
  const sneakers = shoeIntents.find((intent) => intent.garmentType.includes("sneakers"));
  assert(boots && sneakers && boots.priority > sneakers.priority, "alt-rock/riot profiles prioritize boots over sneakers");
}

function y2kGlamShoeIntentTest() {
  const style = styleForGenres(["pop", "dance pop", "y2k", "glam", "club"], ["2000s"]);
  const shoeIntents = generateGarmentIntents(style).filter((intent) => intent.category === "shoes");
  assert(shoeIntents.some((intent) => intent.garmentType === "platform heels"), "2000s glam-pop profiles can request platform heels");
}

function earthySoulWardrobeTest() {
  const style = styleForGenres(["sza", "neo-soul", "alternative r&b", "chill", "earthy"], ["2020s"]);
  const garmentTypes = labels(style.garmentTypes, 12);
  const colors = labels(style.colors, 8);
  assert(garmentTypes.some((garment) => ["crochet top", "linen top", "flowy maxi skirt", "wide-leg lounge pants"].includes(garment)), "earthy SZA/neo-soul profiles produce flowy earthy garments");
  assert(colors.some((color) => ["olive green", "burnt umber", "brown", "cream"].includes(color)), "earthy SZA/neo-soul profiles produce warm earth tones");
}

function eightiesPopVintageTest() {
  const style = styleForGenres(["pop", "funk", "disco", "r&b"], ["1980s"]);
  const garmentTypes = labels(style.garmentTypes, 12);
  const aesthetics = labels(style.aesthetics, 8);
  assert(garmentTypes.some((garment) => ["fitted leather jacket", "satin pants", "fitted blazer", "bodycon dress"].includes(garment)), "1980s pop/funk/r&b profiles produce vintage statement pieces");
  assert(aesthetics.includes("vintage") || aesthetics.includes("retro"), "1980s pop/funk/r&b profiles surface vintage/retro styling");
}

function artistStyleSignalTest() {
  const arianaRange = {
    artists: [{ id: "ariana", name: "Ariana Grande", genres: ["pop", "dance pop"], weight: 100 }],
    tracks: [],
    genres: [],
    eras: [],
  };
  const signals = calculateGenreWeights(arianaRange);
  assert(signals.some((signal) => signal.id === "soft girl"), "Ariana Grande contributes a soft-girl style signal");
  assert(signals.some((signal) => signal.id === "clean girl"), "Ariana Grande contributes a clean-girl style signal");
}

function obscureTagTest() {
  const obscure = styleForGenres(["crystalline basement pop", "moon mall wave", "r&b"]);
  assert(obscure.garmentTypes.some((signal) => ["rib knit long sleeve", "wide-leg trouser", "boots", "compact shoulder bag"].includes(signal.id)), "unknown tags get reasonable non-filler fallback staples");
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

  const motoIntent = intentFor("outerwear", "moto jacket", ["black"], ["leather"], ["rebellious"]);
  const enrichedMoto = product("enriched-moto", "outerwear", "black leather moto jacket", ["black"], ["leather"], ["rebellious"]);
  assert(scoreProduct(enrichedMoto, motoIntent, { maxPrice: 250 }).reasons.some((reason) => reason.source === "garment type"), "enriched cached garment type still matches base intent");
}

function productContextScoringTest() {
  const clubTankIntent = intentFor("top", "layered tank", ["black"], ["mesh"], ["club", "glossy"]);
  const activewearTank = {
    ...product("activewear-tank", "top", "layered tank", ["black"], ["mesh"], ["club"]),
    retailer: "Barry's",
    brand: "lululemon",
    title: "lululemon Black/Vapor Double Layered Mesh Tank",
  };
  const clubTank = {
    ...product("club-tank", "top", "layered tank", ["black"], ["mesh"], ["club"]),
    retailer: "AKIRA",
    title: "Black Sheer Mesh Layered Tank Top",
  };
  assert(scoreProduct(clubTank, clubTankIntent, { maxPrice: 250 }).score > scoreProduct(activewearTank, clubTankIntent, { maxPrice: 250 }).score, "club-coded product beats activewear for a club intent");

  const sexyBottomIntent = intentFor("bottom", "parachute pants", ["black"], ["nylon"], ["sensual", "confident", "street"]);
  const lowRiseParachute = {
    ...product("low-rise-parachute", "bottom", "parachute pants", ["black"], ["nylon"], []),
    retailer: "American Eagle Outfitters",
    title: "AE Low-Rise Baggy Parachute Pants",
  };
  const plainPants = {
    ...product("plain-pants", "bottom", "parachute pants", ["black"], ["nylon"], []),
    title: "Black Nylon Pull-On Pants",
  };
  assert(scoreProduct(lowRiseParachute, sexyBottomIntent).score > scoreProduct(plainPants, sexyBottomIntent).score, "low-rise/baggy/parachute wording adds sexy-confident product context");

  const gothIntent = intentFor("outerwear", "moto jacket", ["black"], ["leather"], ["goth", "dark", "rebellious"]);
  const gothRetailer = {
    ...product("goth-jacket", "outerwear", "moto jacket", ["black"], ["leather"], ["dark"]),
    retailer: "Disturbia",
    title: "Black Faux Leather Moto Jacket",
    attributes: { category: "outerwear", garmentType: "moto jacket", colors: ["black"], materials: ["leather"], aesthetics: [], silhouettes: [], eras: [] },
  };
  const genericRetailer = {
    ...product("generic-jacket", "outerwear", "moto jacket", ["black"], ["leather"], ["dark"]),
    retailer: "Department Store",
    title: "Black Faux Leather Moto Jacket",
    attributes: { category: "outerwear", garmentType: "moto jacket", colors: ["black"], materials: ["leather"], aesthetics: [], silhouettes: [], eras: [] },
  };
  assert(scoreProduct(gothRetailer, gothIntent).score > scoreProduct(genericRetailer, gothIntent).score, "specialized retailers can add light subculture affinity");

  const goldJewelryIntent = intentFor("jewelry", "gold jewelry", ["gold"], ["metallic"], ["polished"]);
  const bodyChain = {
    ...product("body-chain", "jewelry", "body chain", ["gold"], ["metallic"], ["baddie", "club"]),
    title: "Adornia 14K Gold Plated Adjustable Body Chain",
  };
  assert.equal(scoreProduct(bodyChain, goldJewelryIntent).score, 0, "specific body-chain inventory does not leak into generic gold jewelry intent");

  const riotTopIntent = intentFor("top", "graphic baby tee", ["black"], ["cotton"], ["polished", "rebellious", "club"]);
  const polo = {
    ...product("polo", "top", "polo shirt", ["white"], ["cotton"], ["preppy"]),
    title: "H&M Ladies Cotton Polo Shirt",
  };
  assert.equal(scoreProduct(polo, riotTopIntent).score, 0, "polo does not surface for riot/club/rap-coded top intent");
  assert(scoreProduct(polo, intentFor("top", "polo shirt", ["white"], ["cotton"], ["preppy", "classic"])).score > 0, "polo can surface for preppy/classic intent");

  const punkBottomIntent = intentFor("bottom", "mini skirt", ["black"], ["denim"], ["rebellious", "street"]);
  const floralSkirt = {
    ...product("floral-skirt", "bottom", "maxi skirt", ["cream"], ["cotton"], ["romantic"]),
    title: "Floral Print Maxi Skirt",
  };
  assert.equal(scoreProduct(floralSkirt, punkBottomIntent).score, 0, "floral skirt does not surface for punk/rap-coded bottom intent");
  assert(scoreProduct(floralSkirt, intentFor("bottom", "maxi skirt", ["cream"], ["cotton"], ["romantic", "boho"])).score > 0, "floral skirt can surface for romantic/boho intent");

  const floralScarf = {
    ...product("floral-scarf", "jewelry", "silk scarf", ["cream"], ["silk"], ["romantic"]),
    title: "Floral Silk Scarf",
  };
  assert.equal(scoreProduct(floralScarf, goldJewelryIntent).score, 0, "scarf inventory does not satisfy generic jewelry intent");

  const softPopIntent = intentFor("top", "graphic baby tee", ["black"], ["cotton"], ["soft girl", "clean girl", "glossy"]);
  const arianaTee = {
    ...product("ariana-tee", "top", "graphic baby tee", ["black"], ["cotton"], []),
    retailer: "Urban Outfitters",
    title: "Ariana Grande UO Exclusive Yours Truly Graphic Baby Tee in Black Cotton",
  };
  const randomTee = {
    ...product("random-tee", "top", "graphic baby tee", ["black"], ["cotton"], []),
    retailer: "Mall Shop",
    title: "Plain Graphic Baby Tee in Black Cotton",
  };
  assert(scoreProduct(arianaTee, softPopIntent).score > scoreProduct(randomTee, softPopIntent).score, "Ariana product language aligns with soft-pop fans");
  assert.equal(scoreProduct(arianaTee, riotTopIntent).score, 0, "Ariana-specific merch does not leak into riot/club rock intents");
  const dreamPopTeeIntent = intentFor("top", "graphic baby tee", ["cream"], ["cotton"], ["dreamy", "ethereal", "soft"]);
  assert.equal(scoreProduct(arianaTee, dreamPopTeeIntent).score, 0, "artist-specific pop merch does not satisfy unrelated dream-pop softness");

  const mcblingIntent = intentFor("top", "tattoo graphic baby tee", ["black"], ["cotton"], ["mcbling", "y2k", "baddie"]);
  const edHardyTee = {
    ...product("ed-hardy-tee", "top", "tattoo graphic baby tee", ["black"], ["cotton"], []),
    title: "Ed Hardy Women's Eagle Cropped Baby Tee",
  };
  assert(scoreProduct(edHardyTee, mcblingIntent).score > scoreProduct(randomTee, mcblingIntent).score, "Ed Hardy/tattoo language aligns with mcbling-y2k intents");

  const gothBabyTeeIntent = intentFor("top", "goth baby tee", ["black"], ["cotton"], ["goth", "dark", "rebellious"]);
  const gothTee = {
    ...product("goth-tee", "top", "goth baby tee", ["black"], ["cotton"], []),
    retailer: "Minga London",
    title: "Minga London Baby Tee with Goth Crosses & Wings",
  };
  assert(scoreProduct(gothTee, gothBabyTeeIntent).score > scoreProduct(randomTee, gothBabyTeeIntent).score, "goth product language aligns with goth/riot intents");

  const expressiveLayeredTankIntent = intentFor("top", "layered tank", ["black"], ["cotton"], ["club", "digital", "rebellious"]);
  const blandLayeredTank = {
    ...product("bland-layered-tank", "top", "layered tank", ["black"], ["cotton"], []),
    title: "Women's Double Layer Sleeveless Round Neck Cotton Linen Tank Tops",
  };
  const identityLayeredTank = {
    ...product("identity-layered-tank", "top", "layered tank", ["black"], ["cotton"], []),
    retailer: "Edikted",
    title: "Edikted Women's Layered Mesh Camisole",
  };
  assert.equal(scoreProduct(blandLayeredTank, expressiveLayeredTankIntent).score, 0, "plain basics do not satisfy expressive club/riot top intents");
  assert(scoreProduct(identityLayeredTank, expressiveLayeredTankIntent).score > 0, "identity-coded layered tanks can satisfy expressive top intents");

  const frillyCami = {
    ...product("frilly-cami", "top", "layered tank", ["gray"], ["cotton", "lace"], []),
    title: "Handmade gray cotton lace ruffle cami knit long tank layered tiered y2k fashion lacy frilly tank top",
  };
  assert.equal(scoreProduct(frillyCami, expressiveLayeredTankIntent).score, 0, "frilly lace is blocked for expressive club/riot top intents");

  const riotMotoIntent = intentFor("outerwear", "moto jacket", ["black"], ["leather"], ["club", "digital"]);
  riotMotoIntent.musicSources = [{ kind: "genre", id: "riot-grrrl", label: "riot-grrrl", weight: 100 }];
  riotMotoIntent.priority = 94;
  const motoJacket = {
    ...product("moto-jacket", "outerwear", "moto jacket", [], [], []),
    title: "Sam Edelman Women's Black Leather Moto Jacket",
  };
  assert(scoreProduct(motoJacket, riotMotoIntent, { maxPrice: 350 }).score >= 85, "moto/leather title language gets statement weight for riot-grrrl rock intents");

  const clubMiniIntent = intentFor("bottom", "mini skirt", ["black"], ["mesh"], ["polished", "club", "digital", "rebellious"]);
  clubMiniIntent.musicSources = [{ kind: "genre", id: "riot-grrrl", label: "riot-grrrl", weight: 100 }];
  const schoolSkirt = {
    ...product("school-skirt", "bottom", "mini skirt", ["black"], ["cotton"], []),
    retailer: "Rowing Blazers",
    title: "Rowing Blazers Women's Plaid Cotton Pleated Mini Skirt",
  };
  assert.equal(scoreProduct(schoolSkirt, clubMiniIntent, { maxPrice: 350 }).score, 0, "private-school/preppy skirts do not satisfy club/riot mini skirt intents");

  const clubMiniDressIntent = intentFor("dress", "mini dress", ["black"], ["mesh"], ["polished", "club", "digital", "rebellious"]);
  const buttonFrontDress = {
    ...product("button-front-dress", "dress", "mini dress", ["white"], ["cotton"], []),
    retailer: "Lulus",
    title: "Lulus Cotton Button-Front Mini Dress",
  };
  assert.equal(scoreProduct(buttonFrontDress, clubMiniDressIntent, { maxPrice: 350 }).score, 0, "button-front cotton dresses do not satisfy club/riot mini dress intents");
  const dreamyMiniDressIntent = intentFor("dress", "mini dress", ["cream"], ["cotton"], ["dreamy", "ethereal", "soft"]);
  const leopardDress = {
    ...product("leopard-dress", "dress", "mini dress", ["cream"], ["cotton"], []),
    title: "H&M Ladies Cotton Leopard Print Dress",
  };
  assert.equal(scoreProduct(leopardDress, dreamyMiniDressIntent, { maxPrice: 350 }).score, 0, "animal-print dresses do not satisfy unrelated dream-pop dress intents");

  const boxStoreDenim = {
    ...product("box-store-denim", "outerwear", "cropped denim jacket", ["denim"], ["denim"], []),
    retailer: "Walmart",
    title: "Free Assembly Women's Cropped Long Sleeve Denim Jacket",
  };
  assert.equal(scoreProduct(boxStoreDenim, riotMotoIntent, { maxPrice: 350 }).score, 0, "box-store basics do not satisfy expressive punk/riot outerwear intents");
  const genericHoodie = {
    ...product("generic-hoodie", "outerwear", "moto jacket", ["black"], ["cotton"], []),
    retailer: "H&M",
    title: "H&M Ladies Oversized Zip Hoodie",
  };
  assert.equal(scoreProduct(genericHoodie, riotMotoIntent, { maxPrice: 350 }).score, 0, "generic hoodies never satisfy expressive punk/riot outerwear intents");

  const identityMassProduct = {
    ...product("identity-mass-product", "dress", "mini dress", ["black"], ["mesh"], []),
    retailer: "Fashion Nova",
    title: "Fashion Nova Chainmail Cowl Neck Ruched Mini Dress",
  };
  assert(scoreProduct(identityMassProduct, clubMiniDressIntent, { maxPrice: 350 }).score > 0, "mass-market products can still surface when the product itself has strong identity signals");

  const basicRetailerMeshDress = {
    ...product("basic-retailer-mesh-dress", "dress", "mini dress", ["black"], ["mesh"], []),
    retailer: "H&M",
    title: "H&M Ladies Fitted Mesh Dress",
  };
  assert.equal(scoreProduct(basicRetailerMeshDress, clubMiniDressIntent, { maxPrice: 350 }).score, 0, "H&M does not satisfy expressive club/baddie style intents");

  const nightlifeTopIntent = intentFor("top", "satin cowl top", ["plum"], ["satin"], ["nightlife", "polished", "dramatic"]);
  const matureKnitTop = {
    ...product("mature-knit-top", "top", "rib knit long sleeve", ["burgundy"], ["rib knit"], []),
    retailer: "Macy's",
    title: "Womens Yumi Ribbed Knitted Top with Lace Sleeves",
  };
  assert.equal(scoreProduct(matureKnitTop, nightlifeTopIntent, { maxPrice: 350 }).score, 0, "department-store mature basics do not satisfy nightlife-polished discovery intents");

  const pointedBootIntent = intentFor("shoes", "pointed leather boots", ["black"], ["leather"], ["nightlife", "polished"]);
  const macysLeatherBoots = {
    ...product("macys-leather-boots", "shoes", "knee-high boots", ["black"], ["leather"], []),
    retailer: "Macy's",
    title: "I.n.c. International Concepts Fawne Leather Knee High Boots, Created for Macy's - Black Leather",
  };
  assert(scoreProduct(macysLeatherBoots, pointedBootIntent, { maxPrice: 350 }).score > 0, "department-store source can still pass when the item has strong fashion identity");
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

function repositoryIntentOrderingTest() {
  const order = ["boots", "sneakers", "platform sandals"];
  assert(intentPriority("black boots", order) < intentPriority("retro sneakers", order), "fuzzy boot search rows keep boot intent priority");
  assert(intentPriority("black leather moto jacket", ["moto jacket", "cropped denim jacket"]) < intentPriority("cropped denim jacket", ["moto jacket", "cropped denim jacket"]), "fuzzy moto search rows keep moto intent priority");
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
