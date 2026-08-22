import { calculateEraWeights } from "@/src/engine/music/calculateEraWeights";
import { calculateGenreWeights } from "@/src/engine/music/calculateGenreWeights";
import { combineTimeRanges, type MusicTimeWeights } from "@/src/engine/music/combineTimeRanges";
import type { ArtistSignal, MusicProfile, MusicTimeRange, TrackSignal } from "@/src/domain/music/types";

export type RawDemoMusicProfile = {
  id: string;
  displayName: string;
  ranges: Record<"shortTerm" | "mediumTerm" | "longTerm", { artists: ArtistSignal[]; tracks: TrackSignal[] }>;
};

function normalizeRange(range: { artists: ArtistSignal[]; tracks: TrackSignal[] }): MusicTimeRange {
  const base = { artists: range.artists, tracks: range.tracks, genres: [], eras: [] };
  return { ...base, genres: calculateGenreWeights(base), eras: calculateEraWeights(base) };
}

export function normalizeMusicProfile(raw: RawDemoMusicProfile, weights?: MusicTimeWeights): MusicProfile {
  return combineTimeRanges({
    id: raw.id,
    displayName: raw.displayName,
    shortTerm: normalizeRange(raw.ranges.shortTerm),
    mediumTerm: normalizeRange(raw.ranges.mediumTerm),
    longTerm: normalizeRange(raw.ranges.longTerm),
  }, weights);
}
