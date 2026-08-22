import type { MusicTimeRange, WeightedSignal } from "@/src/domain/music/types";

function eraFromYear(year?: number) {
  if (!year) return undefined;
  return `${Math.floor(year / 10) * 10}s`;
}

export function calculateEraWeights(range: MusicTimeRange): WeightedSignal[] {
  const totals = new Map<string, WeightedSignal>();
  for (const track of range.tracks) {
    const label = eraFromYear(track.releaseYear);
    if (!label) continue;
    const current = totals.get(label) ?? { id: label.toLowerCase(), label, weight: 0 };
    current.weight += track.weight;
    totals.set(label, current);
  }
  return Array.from(totals.values()).sort((a, b) => b.weight - a.weight);
}
