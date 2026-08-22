import { strict as assert } from "node:assert";
import { DemoCommerceProvider } from "@/src/services/commerce/DemoCommerceProvider";
import { DemoMusicProvider } from "@/src/services/music/DemoMusicProvider";
import { buildStyleProfile } from "@/src/engine/style/buildStyleProfile";
import { generateGarmentIntents } from "@/src/engine/style/generateGarmentIntents";
import { generatePalette } from "@/src/engine/style/generatePalette";
import { rankProducts } from "@/src/engine/ranking/rankProducts";
import { assembleOutfits } from "@/src/engine/outfit/assembleOutfits";

async function profile(id: string) {
  const music = await new DemoMusicProvider(id).getMusicProfile();
  return { music, style: buildStyleProfile(music) };
}

async function ranked(id: string) {
  const { style } = await profile(id);
  const intents = generateGarmentIntents(style);
  const commerce = new DemoCommerceProvider();
  return rankProducts(await Promise.all(intents.map(async (intent) => ({ intent, candidates: await commerce.search(intent) }))));
}

void (async () => {
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
})();
