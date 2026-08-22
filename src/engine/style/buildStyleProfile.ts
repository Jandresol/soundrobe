import type { MusicProfile } from "@/src/domain/music/types";
import type { StyleProfile } from "@/src/domain/style/types";
import { scoreFashionSignals } from "@/src/engine/style/scoreFashionSignals";

export function buildStyleProfile(musicProfile: MusicProfile): StyleProfile {
  const { buckets, sourcesBySignal } = scoreFashionSignals(musicProfile.combinedGenres, musicProfile.combinedEras);
  return {
    traits: buckets.traits,
    colors: buckets.colors,
    materials: buckets.materials,
    silhouettes: buckets.silhouettes,
    garmentTypes: buckets.garmentTypes,
    accessories: buckets.accessories,
    aesthetics: buckets.aesthetics,
    eraInfluences: musicProfile.combinedEras,
    sourcesBySignal,
  };
}
