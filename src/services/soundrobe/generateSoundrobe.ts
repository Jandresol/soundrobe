import type { SoundrobeResult } from "@/src/domain/soundrobe/types";
import type { ProductRecommendation } from "@/src/domain/commerce/types";
import type { MusicProfile } from "@/src/domain/music/types";
import type { ShoppingPreferences } from "@/src/domain/style/types";
import { combineTimeRanges, type MusicTimeWeights } from "@/src/engine/music/combineTimeRanges";
import { assembleOutfits } from "@/src/engine/outfit/assembleOutfits";
import { rankProducts } from "@/src/engine/ranking/rankProducts";
import { extractAlbumPalette } from "@/src/engine/style/extractAlbumPalette";
import { buildStyleProfile } from "@/src/engine/style/buildStyleProfile";
import { generateGarmentIntents } from "@/src/engine/style/generateGarmentIntents";
import { generatePalette } from "@/src/engine/style/generatePalette";
import { generateStyleThread } from "@/src/engine/style/generateStyleThread";
import type { CommerceProvider } from "@/src/services/commerce/CommerceProvider";
import type { MusicProvider } from "@/src/services/music/MusicProvider";

export async function generateSoundrobe(
  musicProvider: MusicProvider,
  commerceProvider: CommerceProvider,
  preferences: ShoppingPreferences = {},
  timeWeights?: MusicTimeWeights,
): Promise<SoundrobeResult> {
  const musicProfile = await musicProvider.getMusicProfile();
  return generateSoundrobeFromMusicProfile(musicProfile, commerceProvider, preferences, musicProvider.source, timeWeights);
}

export async function generateSoundrobeFromMusicProfile(
  musicProfile: MusicProfile,
  commerceProvider: CommerceProvider,
  preferences: ShoppingPreferences = {},
  musicSource: SoundrobeResult["metadata"]["musicSource"] = "demo",
  timeWeights?: MusicTimeWeights,
): Promise<SoundrobeResult> {
  const baseMusicProfile = {
    id: musicProfile.id,
    displayName: musicProfile.displayName,
    shortTerm: musicProfile.shortTerm,
    mediumTerm: musicProfile.mediumTerm,
    longTerm: musicProfile.longTerm,
  };
  const weightedMusicProfile = combineTimeRanges(baseMusicProfile, timeWeights);
  const styleProfile = buildStyleProfile(weightedMusicProfile);
  const styleThread = generateStyleThread(styleProfile);
  const albumPalette = await extractAlbumPalette(weightedMusicProfile, timeWeights);
  const palette = generatePalette(styleProfile, albumPalette);
  const garmentIntents = generateGarmentIntents(styleProfile, palette);
  const candidatesByIntent = await searchCommerceOncePerKey(garmentIntents, commerceProvider);
  const rankedProducts = rankProducts(candidatesByIntent, preferences);
  const outfits = assembleOutfits(rankedProducts);
  const signaturePieces = selectSignaturePieces(rankedProducts, 48);
  return {
    user: { id: weightedMusicProfile.id, displayName: weightedMusicProfile.displayName },
    musicProfile: weightedMusicProfile,
    styleProfile,
    styleThread,
    palette,
    garmentIntents,
    signaturePieces,
    outfits,
    metadata: {
      musicSource,
      commerceSource: commerceProvider.source,
      generatedAt: new Date().toISOString(),
      shoppingPreferences: preferences,
      diagnostics: {
        combinedGenreCount: weightedMusicProfile.combinedGenres.length,
        artistGenreCount: [weightedMusicProfile.shortTerm, weightedMusicProfile.mediumTerm, weightedMusicProfile.longTerm]
          .flatMap((range) => range.artists)
          .filter((artist) => artist.genres.length > 0).length,
        timeWeights,
        commerce: commerceProvider.diagnostics?.(),
      },
    },
  };
}

async function searchCommerceOncePerKey(garmentIntents: ReturnType<typeof generateGarmentIntents>, commerceProvider: CommerceProvider) {
  const groups = new Map<string, ReturnType<typeof generateGarmentIntents>>();
  for (const intent of garmentIntents) {
    const key = commerceProvider.searchKey?.(intent) ?? intent.searchQuery.toLowerCase().replace(/\s+/g, " ").trim();
    groups.set(key, [...(groups.get(key) ?? []), intent]);
  }

  const searchedGroups = await Promise.all(Array.from(groups.values()).map(async (intents) => {
    const anchorIntent = intents[0];
    const candidates = await commerceProvider.search(anchorIntent).catch(() => []);
    return intents.map((intent) => ({ intent, candidates }));
  }));

  return searchedGroups.flat();
}

function selectSignaturePieces(rankedProducts: ProductRecommendation[], limit: number) {
  const selected: ProductRecommendation[] = [];
  const seenProducts = new Set<string>();
  const seenCategories = new Set<string>();
  const seenIntents = new Set<string>();

  const add = (recommendation: ProductRecommendation) => {
    if (selected.length >= limit || seenProducts.has(recommendation.product.id)) return false;
    selected.push(recommendation);
    seenProducts.add(recommendation.product.id);
    seenCategories.add(recommendation.intent.category);
    seenIntents.add(recommendation.intent.id);
    return true;
  };

  for (const recommendation of rankedProducts) {
    if (!seenCategories.has(recommendation.intent.category)) add(recommendation);
  }
  for (const recommendation of rankedProducts) {
    if (!seenIntents.has(recommendation.intent.id)) add(recommendation);
  }
  for (const recommendation of rankedProducts) add(recommendation);

  return selected;
}
