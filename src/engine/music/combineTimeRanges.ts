import { MUSIC_TIME_WEIGHTS } from "@/src/config/recommendationWeights";
import type { MusicProfile, MusicTimeRange, WeightedSignal } from "@/src/domain/music/types";

export type MusicTimeWeights = {
  longTerm: number;
  mediumTerm: number;
  shortTerm: number;
};

function mergeSignals(entries: Array<{ signal: WeightedSignal; multiplier: number }>) {
  const totals = new Map<string, WeightedSignal>();
  for (const { signal, multiplier } of entries) {
    const existing = totals.get(signal.id) ?? { ...signal, weight: 0 };
    existing.weight += signal.weight * multiplier;
    totals.set(signal.id, existing);
  }
  const max = Math.max(...Array.from(totals.values()).map((signal) => signal.weight), 1);
  return Array.from(totals.values())
    .map((signal) => ({ ...signal, weight: Math.round((signal.weight / max) * 100) }))
    .sort((a, b) => b.weight - a.weight);
}

export function combineTimeRanges(
  profile: Omit<MusicProfile, "combinedGenres" | "combinedEras">,
  weights: MusicTimeWeights = MUSIC_TIME_WEIGHTS,
): MusicProfile {
  const ranges: Array<{ range: MusicTimeRange; multiplier: number }> = [
    { range: profile.longTerm, multiplier: weights.longTerm },
    { range: profile.mediumTerm, multiplier: weights.mediumTerm },
    { range: profile.shortTerm, multiplier: weights.shortTerm },
  ];

  return {
    ...profile,
    combinedGenres: mergeSignals(ranges.flatMap(({ range, multiplier }) => range.genres.map((signal) => ({ signal, multiplier })))),
    combinedEras: mergeSignals(ranges.flatMap(({ range, multiplier }) => range.eras.map((signal) => ({ signal, multiplier })))),
  };
}
