import type { FashionDepartment, GarmentCategory, GarmentIntent, PaletteColor, StyleProfile } from "@/src/domain/style/types";
import type { WeightedSignal } from "@/src/domain/music/types";
import { categoryFallbackAssociations, defaultCategoryFallbacks } from "@/src/knowledge/categoryFallbackMap";
import { GARMENT_CATEGORY } from "@/src/knowledge/garmentCompatibility";

const mustHave: GarmentCategory[] = ["outerwear", "top", "bottom", "shoes", "bag", "jewelry", "accessory"];
const maxIntents = 22;
const maxIntentsPerCategory: Record<GarmentCategory, number> = {
  outerwear: 2,
  top: 3,
  bottom: 3,
  dress: 2,
  shoes: 4,
  bag: 2,
  jewelry: 2,
  accessory: 2,
};
type IntentCandidate = {
  signal: WeightedSignal;
  category: GarmentCategory;
  score: number;
  fallbackSource?: {
    kind: "association";
    id: string;
    label: string;
    weight: number;
  };
};
const fallbackSignals: WeightedSignal[] = [
  { id: "short jacket", label: "short jacket", weight: 55 },
  { id: "rib knit long sleeve", label: "rib knit long sleeve", weight: 54 },
  { id: "wide-leg trouser", label: "wide-leg trouser", weight: 53 },
  { id: "boots", label: "boots", weight: 52 },
  { id: "compact shoulder bag", label: "compact shoulder bag", weight: 51 },
  { id: "gold hoops", label: "gold hoops", weight: 50 },
  { id: "statement belt", label: "statement belt", weight: 49 },
];

export function generateGarmentIntents(styleProfile: StyleProfile, palette: PaletteColor[] = [], department: FashionDepartment = "womenswear"): GarmentIntent[] {
  const colors = unique([
    ...palette.slice(0, 3).map((color) => color.name.toLowerCase()),
    ...styleProfile.colors.slice(0, 4).map((signal) => signal.label.toLowerCase()),
  ]).slice(0, 5);
  const materials = styleProfile.materials.slice(0, 4).map((signal) => signal.label.toLowerCase());
  const silhouettes = styleProfile.silhouettes.slice(0, 3).map((signal) => signal.label.toLowerCase());
  const aesthetics = styleProfile.aesthetics.slice(0, 4).map((signal) => signal.label.toLowerCase());
  const eras = styleProfile.eraInfluences.slice(0, 2).map((signal) => signal.label);
  const sourceSignals = [...styleProfile.garmentTypes, ...styleProfile.accessories];
  const candidates: IntentCandidate[] = (sourceSignals.length ? sourceSignals : fallbackSignals)
    .map((signal) => ({
      signal,
      category: GARMENT_CATEGORY[signal.id],
      score: scoreIntentSignal(signal, styleProfile) * profileFitMultiplier(signal, GARMENT_CATEGORY[signal.id], styleProfile),
    }))
    .filter((entry): entry is IntentCandidate => Boolean(entry.category));
  const picked: IntentCandidate[] = [];
  const pickedIds = new Set<string>();
  const pickedCounts = new Map<GarmentCategory, number>();
  const addPicked = (entry: IntentCandidate | undefined) => {
    if (!entry || pickedIds.has(entry.signal.id)) return false;
    const count = pickedCounts.get(entry.category) ?? 0;
    if (count >= maxIntentsPerCategory[entry.category]) return false;
    picked.push(entry);
    pickedIds.add(entry.signal.id);
    pickedCounts.set(entry.category, count + 1);
    return true;
  };

  for (const category of mustHave) {
    const match = candidates
      .filter((entry) => entry.category === category)
      .sort((a, b) => b.score - a.score)[0];
    addPicked(match ?? buildFallbackCandidate(category, styleProfile));
  }
  for (const entry of candidates.sort((a, b) => b.score - a.score)) {
    if (picked.length >= maxIntents) break;
    addPicked(entry);
  }

  return picked.map(({ signal, category, fallbackSource, score }) => {
    const sources = styleProfile.sourcesBySignal[signal.id] ?? (fallbackSource ? [fallbackSource] : []);
    const sourceColor = selectIntentColor(signal, category, colors, styleProfile);
    const sourceMaterial = selectIntentMaterial(signal, category, materials);
    const intentAesthetics = selectIntentSignals(aesthetics, signal.label, 3);
    const searchQuery = buildSearchQuery(department, sourceColor, sourceMaterial, signal.label);
    return {
      id: `intent-${signal.id.replaceAll(" ", "-")}`,
      category,
      garmentType: signal.label,
      colors: [sourceColor, ...colors.filter((color) => color !== sourceColor).slice(0, 1)],
      materials: sourceMaterial ? [sourceMaterial] : [],
      silhouettes,
      aesthetics: intentAesthetics,
      eras,
      musicSources: sources,
      priority: Math.min(100, Math.round(score)),
      searchQuery,
      department,
    };
  });
}

function scoreIntentSignal(signal: WeightedSignal, styleProfile: StyleProfile) {
  const sources = styleProfile.sourcesBySignal[signal.id] ?? [];
  const sourceCoverage = unique(sources.map((source) => source.id)).length;
  const sourceWeight = sources.reduce((sum, source) => sum + source.weight, 0) / Math.max(sources.length, 1);
  return signal.weight * 0.72 + Math.min(20, sourceCoverage * 4) + sourceWeight * 0.08;
}

function profileFitMultiplier(signal: WeightedSignal, category: GarmentCategory | undefined, styleProfile: StyleProfile) {
  if (category !== "dress") return 1;
  const label = signal.id.toLowerCase();
  const sourceIds = (styleProfile.sourcesBySignal[signal.id] ?? []).map((source) => source.id.toLowerCase());
  const sourceLabels = (styleProfile.sourcesBySignal[signal.id] ?? []).map((source) => source.label.toLowerCase());
  const sourceText = [...sourceIds, ...sourceLabels].join(" ");
  const hasGlossyRnbDisco = [...styleProfile.traits, ...styleProfile.aesthetics].some((entry) =>
    ["glossy", "confident", "sensual", "nightlife", "polished"].includes(entry.id) && entry.weight >= 55
  ) || Object.values(styleProfile.sourcesBySignal).some((sources) =>
    sources.some((source) => ["disco", "funk", "soul", "r&b", "club", "1980s"].some((token) => source.id.toLowerCase().includes(token) || source.label.toLowerCase().includes(token)))
  );
  if (!hasGlossyRnbDisco) return 1;
  if (["jumpsuit", "satin jumpsuit", "slinky midi dress", "draped jersey dress", "satin mini dress", "halter mini dress"].includes(label)) return 1.45;
  if ((label.includes("slip dress") || label.includes("lace")) && /(riot|goth|punk|grunge|dark)/.test(sourceText)) return 0.22;
  return 1;
}

function buildFallbackCandidate(category: GarmentCategory, styleProfile: StyleProfile): IntentCandidate {
  const sourceScores = new Map<string, { label: string; score: number }>();
  for (const sources of Object.values(styleProfile.sourcesBySignal)) {
    for (const source of sources) {
      const current = sourceScores.get(source.id) ?? { label: source.label, score: 0 };
      current.score += source.weight;
      sourceScores.set(source.id, current);
    }
  }
  for (const signal of [...styleProfile.traits, ...styleProfile.aesthetics, ...styleProfile.colors]) {
    const current = sourceScores.get(signal.id) ?? { label: signal.label, score: 0 };
    current.score += signal.weight * 0.35;
    sourceScores.set(signal.id, current);
  }

  const ranked = categoryFallbackAssociations
    .map((association) => {
      const sourceScore = Array.from(sourceScores.values()).reduce((score, source) => {
        const sourceLabel = source.label.toLowerCase();
        return score + (association.signals.some((signal) => sourceLabel.includes(signal)) ? source.score : 0);
      }, 0);
      return { association, score: sourceScore * association.weight };
    })
    .filter(({ association, score }) => score > 0 && association.garments[category]?.length)
    .sort((a, b) => b.score - a.score)[0];

  const fallback = ranked?.association.garments[category]?.[0] ?? defaultCategoryFallbacks[category]?.[0] ?? "white tee";
  const id = fallback.toLowerCase();
  const weight = Math.max(45, Math.min(78, Math.round((ranked?.score ?? 45) / 4)));
  return {
    signal: { id, label: fallback, weight },
    category,
    score: weight,
    fallbackSource: {
      kind: "association",
      id: ranked?.association.id ?? `fallback-${category}`,
      label: ranked?.association.id.replace("fallback-", "").replaceAll("-", " ") ?? "wardrobe core",
      weight,
    },
  };
}

function selectIntentColor(signal: WeightedSignal, category: GarmentCategory, colors: string[], styleProfile: StyleProfile) {
  const colorOptions = colors.filter((color) => !materialLikeColorTerms.has(color));
  if (!colorOptions.length) return "black";
  const label = signal.label.toLowerCase();
  if (category === "jewelry") return colorOptions.find((color) => ["gold", "silver"].includes(color)) ?? "gold";
  if (category === "shoes" || category === "bag") return colorOptions.find((color) => ["black", "brown", "chocolate", "cream", "white", "silver"].includes(color)) ?? colorOptions[0];
  if (label.includes("denim") || label.includes("jeans")) return colorOptions.find((color) => color.includes("denim")) ?? "denim";
  const signalSources = new Set((styleProfile.sourcesBySignal[signal.id] ?? []).map((source) => source.id));
  const sourcedColor = colorOptions.find((color) => (styleProfile.sourcesBySignal[color] ?? []).some((source) => signalSources.has(source.id)));
  return sourcedColor ?? colorOptions[0];
}

function selectIntentMaterial(signal: WeightedSignal, category: GarmentCategory, materials: string[]) {
  const label = signal.label.toLowerCase();
  if (category === "jewelry") return "";
  if (materials.some((material) => labelHasTerm(label, material))) return "";
  const direct = materials.find((material) => label.includes(material) || material.includes(label));
  if (direct) return direct;
  if (label.includes("jacket") || label.includes("boots") || label.includes("bag")) return materials.find((material) => ["leather", "suede", "nylon", "denim"].includes(material)) ?? "";
  if (label.includes("tee") || label.includes("shirt") || label.includes("tank")) return materials.find((material) => ["cotton", "mesh", "rib knit", "satin"].includes(material)) ?? "";
  if (label.includes("jumpsuit")) return materials.find((material) => ["satin", "jersey", "leather", "metallic", "cotton"].includes(material)) ?? "satin";
  if (label.includes("dress") || label.includes("skirt")) return materials.find((material) => ["satin", "lace", "mesh", "cotton"].includes(material)) ?? "";
  return materials[0] ?? "";
}

function buildSearchQuery(department: FashionDepartment, color: string, material: string, garmentType: string) {
  const garment = garmentType.toLowerCase();
  const safeColor = color && !materialLikeColorTerms.has(color) && !labelHasTerm(garment, color) ? color : "";
  const safeMaterial = material && !labelHasTerm(garment, material) ? material : "";
  return uniqueSearchTerms([departmentQuery(department), safeColor, safeMaterial, garmentType]).join(" ");
}

function labelHasTerm(label: string, term: string) {
  const normalizedLabel = normalizeSearchTerm(label);
  const normalizedTerm = normalizeSearchTerm(term);
  return normalizedLabel.split(" ").includes(normalizedTerm) || normalizedLabel.includes(normalizedTerm);
}

function uniqueSearchTerms(parts: string[]) {
  const tokens: string[] = [];
  for (const part of parts.filter(Boolean)) {
    for (const token of normalizeSearchTerm(part).split(" ")) {
      if (!token || tokens[tokens.length - 1] === token) continue;
      tokens.push(token);
    }
  }
  return tokens;
}

function normalizeSearchTerm(value: string) {
  return value.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

const materialLikeColorTerms = new Set([
  "cotton",
  "denim",
  "distressed denim",
  "flannel",
  "fuzzy knit",
  "jersey",
  "knit",
  "lace",
  "leather",
  "mesh",
  "metallic",
  "nylon",
  "patent",
  "rib knit",
  "satin",
  "sequin",
  "suede",
  "washed denim",
  "wool",
]);

function selectIntentSignals(signals: string[], garmentType: string, limit: number) {
  const garment = garmentType.toLowerCase();
  const direct = signals.filter((signal) => garment.includes(signal) || signal.includes(garment));
  return unique([...direct, ...signals]).slice(0, limit);
}

function departmentQuery(department: FashionDepartment) {
  if (department === "menswear") return "mens";
  if (department === "unisex") return "unisex";
  return "womenswear";
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
