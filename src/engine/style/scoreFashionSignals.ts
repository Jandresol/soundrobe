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
        const contextualWeight = baseWeight * associationContextMultiplier(association, genre, genres);
        apply(association, contextualWeight, { kind: "genre", id: genre.id, label: genre.label, weight: contextualWeight });
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
    const contextualWeight = weight * associationContextMultiplier(association, genre ?? era, genres);
    const label = genre ? `${era.label} ${genre.label}` : era.label;
    apply(association, contextualWeight, { kind: "association", id: association.id, label, weight: contextualWeight });
  }

  const normalize = (map: Map<string, WeightedSignal>) => {
    const max = Math.max(...Array.from(map.values()).map((signal) => signal.weight), 1);
    return Array.from(map.values()).map((signal) => ({ ...signal, weight: Math.round((signal.weight / max) * 100) })).sort((a, b) => b.weight - a.weight);
  };
  return { buckets: Object.fromEntries(Object.entries(buckets).map(([key, map]) => [key, normalize(map)])) as Record<Bucket, WeightedSignal[]>, sourcesBySignal };
}

function associationContextMultiplier(association: FashionAssociation, genre: WeightedSignal, genres: WeightedSignal[]) {
  const id = genre.id.toLowerCase();
  const broadPopDanceScore = genres.reduce((score, signal) => {
    const signalId = signal.id.toLowerCase();
    return score + (["pop", "dance pop", "disco", "funk", "r&b", "contemporary r&b", "house", "reggaeton", "latin pop"].some((token) => signalId.includes(token)) ? signal.weight : 0);
  }, 0);
  const broadPopDanceCount = genres.filter((signal) => {
    const signalId = signal.id.toLowerCase();
    return ["pop", "dance pop", "disco", "funk", "r&b", "contemporary r&b", "house", "reggaeton", "latin pop"].some((token) => signalId.includes(token));
  }).length;
  const hasExplicitAltEdge = genres.some((signal) => {
    const signalId = signal.id.toLowerCase();
    return ["punk", "riot", "grunge", "post-grunge", "modern rock", "hard rock", "metal", "hardcore"].some((token) => signalId.includes(token)) && signal.weight >= 42;
  });
  const hasRootsContext = genres.some((signal) => {
    const signalId = signal.id.toLowerCase();
    return ["folk", "blues", "country", "americana", "singer-songwriter"].some((token) => signalId.includes(token)) && signal.weight >= 42;
  });
  const hasBroadPopDanceContext = broadPopDanceCount >= 3 && broadPopDanceScore >= 220;
  const hasStrongAltRockContext = genres.some((signal) =>
    ["alternative rock", "rock", "punk", "hard rock", "riot-grrrl", "riot grrrl"].includes(signal.id) &&
    signal.weight >= 34
  );
  const hasStrongDiscoRnbContext = genres.some((signal) =>
    ["disco", "funk", "soul", "r&b", "contemporary r&b", "club"].includes(signal.id) &&
    signal.weight >= 45
  );

  if (
    ["scene-riot-grrrl-90s-alt", "lastfm-feminist-riot", "lastfm-gothic", "lastfm-dark"].includes(association.id) &&
    !hasStrongAltRockContext
  ) {
    return hasStrongDiscoRnbContext ? 0.18 : 0.36;
  }

  if (
    ["2000s-pop-rock", "2000s-post-grunge-alt", "scene-2000s-post-grunge"].includes(association.id) &&
    hasBroadPopDanceContext &&
    !hasExplicitAltEdge
  ) {
    return 0.22;
  }

  if (
    association.id === "1970s-rock-folk" &&
    hasBroadPopDanceContext &&
    !hasRootsContext
  ) {
    return 0.38;
  }

  if (
    ["femme", "queer", "experimental", "feminist", "gothic", "riot-grrrl", "riot grrrl"].includes(id) &&
    hasStrongDiscoRnbContext &&
    !hasStrongAltRockContext
  ) {
    return 0.42;
  }

  return 1;
}
