import type { StyleProfile, StyleThread } from "@/src/domain/style/types";

const take = (items: string[], count: number) => items.filter(Boolean).slice(0, count);
const phrase = (items: string[]) => {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
};

export function generateStyleThread(styleProfile: StyleProfile): StyleThread {
  const influences = aggregateInfluences(styleProfile);
  const traits = take(styleProfile.traits.map((signal) => signal.label), 3);
  const colors = take(styleProfile.colors.map((signal) => signal.label), 3);
  const materials = take(styleProfile.materials.map((signal) => signal.label), 3);
  const shapes = take(styleProfile.silhouettes.map((signal) => signal.label), 2);
  const pieces = take(styleProfile.garmentTypes.map((signal) => signal.label), 3);
  const colorSentence = colors.length ? `The palette is anchored by ${phrase(colors)}` : "The palette stays flexible until stronger color signals appear";
  const textureSentence = materials.length ? `with ${phrase(materials)} carrying the texture.` : "with texture coming from the strongest available product matches.";
  const shapeSentence = shapes.length && pieces.length
    ? `The silhouette moves toward ${phrase(shapes)}, so the strongest shopping targets are ${phrase(pieces)}.`
    : "The wardrobe stays modular until the music tags create a clearer silhouette.";
  return {
    headline: `${traits[0] ?? "Layered"} ${traits[1] ?? "music"} wardrobe`,
    description: `${traits.length ? `${phrase(traits)} signals are leading this mix. ` : ""}${colorSentence}, ${textureSentence} ${shapeSentence}`,
    dominantInfluences: influences,
  };
}

function aggregateInfluences(styleProfile: StyleProfile) {
  const totals = new Map<string, { label: string; weight: number }>();
  const outputTraitIds = new Set(styleProfile.traits.map((signal) => signal.id));
  const styleSignals = [
    ...styleProfile.colors.slice(0, 4),
    ...styleProfile.materials.slice(0, 4),
    ...styleProfile.silhouettes.slice(0, 3),
    ...styleProfile.garmentTypes.slice(0, 4),
    ...styleProfile.accessories.slice(0, 3),
    ...styleProfile.eraInfluences.slice(0, 2),
  ];

  for (const signal of styleSignals) {
    for (const source of styleProfile.sourcesBySignal[signal.id] ?? []) {
      const key = source.label.toLowerCase();
      if (outputTraitIds.has(key)) continue;
      const current = totals.get(key) ?? { label: source.label, weight: 0 };
      current.weight += source.weight * (signal.weight / 100);
      totals.set(key, current);
    }
  }

  const values = [
    ...Array.from(totals.values()),
    ...styleProfile.eraInfluences.slice(0, 2).map((signal) => ({ label: signal.label, weight: signal.weight })),
  ].sort((a, b) => b.weight - a.weight);
  const max = Math.max(...values.map((entry) => entry.weight), 1);
  const unique = new Map<string, { label: string; weight: number }>();
  for (const entry of values) {
    const key = entry.label.toLowerCase();
    if (!unique.has(key)) unique.set(key, entry);
  }
  return Array.from(unique.values()).slice(0, 5).map((entry) => ({ label: entry.label, weight: Math.round((entry.weight / max) * 100) }));
}
