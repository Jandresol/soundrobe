import type { WeightedSignal } from "@/src/domain/music/types";
import type { StyleSource } from "@/src/domain/style/types";
import { genreFashionAssociations, type FashionAssociation } from "@/src/knowledge/genreFashionMap";
import { eraFashionAssociations } from "@/src/knowledge/eraFashionMap";

type Bucket = "traits" | "colors" | "materials" | "silhouettes" | "garmentTypes" | "accessories" | "aesthetics";

const fallbackAssociation: FashionAssociation = {
  id: "unknown-genre-wearable-core",
  signals: {
    traits: ["personal", "wearable"],
    colors: ["black", "white", "denim"],
    materials: ["rib knit", "leather"],
    silhouettes: ["relaxed", "layered"],
    garmentTypes: ["rib knit long sleeve", "wide-leg trouser", "boots", "compact shoulder bag"],
    accessories: ["sunglasses", "statement belt"],
    aesthetics: ["wearable", "personal"],
  },
  weight: 0.16,
};

const genericRockAssociationIds = new Set([
  "punk-general",
  "indie-general",
  "coverage-alt-indie",
  "coverage-hardcore",
  "metal-hard-rock",
]);

const sceneSpecificAssociationIds = new Set([
  "scene-90s-grunge",
  "scene-2000s-post-grunge",
  "scene-riot-grrrl-90s-alt",
  "shoegaze-dream-pop",
  "indie-sleaze-rock",
  "coverage-grunge",
]);

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
    let matched = false;
    const hasSceneSpecificMatch = genreFashionAssociations.some((association) => (
      sceneSpecificAssociationIds.has(association.id) &&
      (!association.eras?.length || eras.some((era) => association.eras?.includes(era.label))) &&
      association.genres?.some((entry) => genre.id.includes(entry))
    ));
    const hasEraSpecificMatch = genreFashionAssociations.some((association) => (
      association.eras?.length &&
      eras.some((era) => association.eras?.includes(era.label)) &&
      association.genres?.some((entry) => genre.id.includes(entry))
    )) || eraFashionAssociations.some((association) => (
      association.eras?.length &&
      eras.some((era) => association.eras?.includes(era.label)) &&
      association.genres?.some((entry) => genre.id.includes(entry))
    ));
    for (const association of genreFashionAssociations) {
      const eraMatches = !association.eras?.length || eras.some((era) => association.eras?.includes(era.label));
      if (eraMatches && association.genres?.some((entry) => genre.id.includes(entry))) {
        matched = true;
        const baseWeight = (hasEraSpecificMatch && !association.eras?.length) || (hasSceneSpecificMatch && genericRockAssociationIds.has(association.id))
          ? genre.weight * 0.34
          : genre.weight;
        apply(association, baseWeight, { kind: "genre", id: genre.id, label: genre.label, weight: baseWeight });
      }
    }
    if (!matched) {
      apply(fallbackAssociation, genre.weight, { kind: "genre", id: genre.id, label: genre.label, weight: genre.weight });
    }
  }
  for (const association of eraFashionAssociations) {
    const era = eras.find((entry) => association.eras?.includes(entry.label));
    if (!era) continue;

    const genre = association.genres
      ? genres.find((entry) => association.genres?.some((match) => entry.id.includes(match)))
      : undefined;
    if (association.genres && !genre) continue;

    const weight = genre ? (genre.weight * 0.72 + era.weight * 0.48) : era.weight * 0.65;
    const label = genre ? `${era.label} ${genre.label}` : era.label;
    apply(association, weight, { kind: "association", id: association.id, label, weight });
  }

  const normalize = (map: Map<string, WeightedSignal>) => {
    const max = Math.max(...Array.from(map.values()).map((signal) => signal.weight), 1);
    return Array.from(map.values()).map((signal) => ({ ...signal, weight: Math.round((signal.weight / max) * 100) })).sort((a, b) => b.weight - a.weight);
  };
  return { buckets: Object.fromEntries(Object.entries(buckets).map(([key, map]) => [key, normalize(map)])) as Record<Bucket, WeightedSignal[]>, sourcesBySignal };
}
