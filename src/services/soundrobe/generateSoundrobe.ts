import type { SoundrobeResult } from "@/src/domain/soundrobe/types";
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
  const uniqueIntents = Array.from(new Map(garmentIntents.map((intent) => [intent.searchQuery, intent])).values());
  const candidatesByIntent = await Promise.all(uniqueIntents.map(async (intent) => ({ intent, candidates: await commerceProvider.search(intent).catch(() => []) })));
  const rankedProducts = rankProducts(candidatesByIntent, preferences);
  const outfits = assembleOutfits(rankedProducts);
  return {
    user: { id: weightedMusicProfile.id, displayName: weightedMusicProfile.displayName },
    musicProfile: weightedMusicProfile,
    styleProfile,
    styleThread,
    palette,
    garmentIntents,
    signaturePieces: rankedProducts.slice(0, 8),
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
      },
    },
  };
}
