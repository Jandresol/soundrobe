import type { MusicTimeRange, WeightedSignal } from "@/src/domain/music/types";

const STYLE_TAGS = new Set([
  "sensual",
  "romantic",
  "queer",
  "feminist",
  "riot-grrrl",
  "gothic",
  "femme",
  "moody",
  "dramatic",
  "expressive",
  "offbeat",
  "soft",
  "dreamy",
  "experimental",
  "club",
  "sleek",
]);

export function calculateGenreWeights(range: MusicTimeRange): WeightedSignal[] {
  const totals = new Map<string, WeightedSignal>();
  for (const artist of range.artists) {
    for (const genre of artist.genres) {
      const id = genre.toLowerCase();
      const current = totals.get(id) ?? { id, label: genre, weight: 0 };
      current.weight += (artist.weight * signalMultiplier(id, "artist")) / Math.max(artist.genres.length, 1);
      totals.set(id, current);
    }
  }
  for (const track of range.tracks) {
    for (const tag of track.tags ?? []) {
      const id = tag.toLowerCase();
      const current = totals.get(id) ?? { id, label: tag, weight: 0 };
      current.weight += (track.weight * signalMultiplier(id, "track")) / Math.max(track.tags?.length ?? 1, 1);
      totals.set(id, current);
    }
  }
  return Array.from(totals.values()).sort((a, b) => b.weight - a.weight);
}

function signalMultiplier(id: string, source: "artist" | "track") {
  if (source === "track") return STYLE_TAGS.has(id) ? 1.05 : 0.62;
  return STYLE_TAGS.has(id) ? 1.45 : 1;
}
