import type { WeightedSignal } from "@/src/domain/music/types";
import type { StyleSource } from "@/src/domain/style/types";
import { genreFashionAssociations, type FashionAssociation } from "@/src/knowledge/genreFashionMap";
import { eraFashionAssociations } from "@/src/knowledge/eraFashionMap";

type Bucket = "traits" | "colors" | "materials" | "silhouettes" | "garmentTypes" | "accessories" | "aesthetics";

export function scoreFashionSignals(genres: WeightedSignal[], eras: WeightedSignal[]) {
  const buckets: Record<Bucket, Map<string, WeightedSignal>> = {
    traits: new Map(), colors: new Map(), materials: new Map(), silhouettes: new Map(), garmentTypes: new Map(), accessories: new Map(), aesthetics: new Map(),
  };
  const sourcesBySignal: Record<string, StyleSource[]> = {};

  const apply = (association: FashionAssociation, baseWeight: number, source: StyleSource) => {
    for (const bucket of Object.keys(buckets) as Bucket[]) {
      for (const label of association.signals[bucket] ?? []) {
        const id = label.toLowerCase();
        const current = buckets[bucket].get(id) ?? { id, label, weight: 0 };
        current.weight += baseWeight * association.weight;
        buckets[bucket].set(id, current);
        sourcesBySignal[id] = [...(sourcesBySignal[id] ?? []), source];
      }
    }
  };

  for (const genre of genres) {
    for (const association of genreFashionAssociations) {
      if (association.genres?.some((entry) => genre.id.includes(entry))) {
        apply(association, genre.weight, { kind: "genre", id: genre.id, label: genre.label, weight: genre.weight });
      }
    }
  }
  for (const association of eraFashionAssociations) {
    const genre = genres.find((entry) => association.genres?.some((match) => entry.id.includes(match)));
    const era = eras.find((entry) => association.eras?.includes(entry.label));
    if (genre && era) {
      const weight = (genre.weight * 0.55 + era.weight * 0.45);
      apply(association, weight, { kind: "association", id: association.id, label: `${era.label} ${genre.label}`, weight });
    }
  }

  const normalize = (map: Map<string, WeightedSignal>) => {
    const max = Math.max(...Array.from(map.values()).map((signal) => signal.weight), 1);
    return Array.from(map.values()).map((signal) => ({ ...signal, weight: Math.round((signal.weight / max) * 100) })).sort((a, b) => b.weight - a.weight);
  };
  return { buckets: Object.fromEntries(Object.entries(buckets).map(([key, map]) => [key, normalize(map)])) as Record<Bucket, WeightedSignal[]>, sourcesBySignal };
}
