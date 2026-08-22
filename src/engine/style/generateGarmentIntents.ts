import type { FashionDepartment, GarmentCategory, GarmentIntent, PaletteColor, StyleProfile } from "@/src/domain/style/types";
import type { WeightedSignal } from "@/src/domain/music/types";
import { GARMENT_CATEGORY } from "@/src/knowledge/garmentCompatibility";

const mustHave: GarmentCategory[] = ["outerwear", "top", "bottom", "shoes", "bag", "jewelry", "accessory"];
const fallbackSignals: WeightedSignal[] = [
  { id: "cropped denim jacket", label: "cropped denim jacket", weight: 55 },
  { id: "rib knit long sleeve", label: "rib knit long sleeve", weight: 54 },
  { id: "wide-leg trouser", label: "wide-leg trouser", weight: 53 },
  { id: "sneakers", label: "sneakers", weight: 52 },
  { id: "compact shoulder bag", label: "compact shoulder bag", weight: 51 },
  { id: "gold hoops", label: "gold hoops", weight: 50 },
  { id: "scarf", label: "scarf", weight: 49 },
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
  const candidates = (sourceSignals.length ? sourceSignals : fallbackSignals)
    .map((signal) => ({ signal, category: GARMENT_CATEGORY[signal.id] }))
    .filter((entry): entry is typeof entry & { category: GarmentCategory } => Boolean(entry.category));
  const picked = new Map<GarmentCategory, typeof candidates[number]>();
  for (const category of mustHave) {
    const match = candidates.find((entry) => entry.category === category);
    if (match) picked.set(category, match);
  }
  for (const entry of candidates) if (picked.size < 8 && !picked.has(entry.category)) picked.set(entry.category, entry);

  return Array.from(picked.values()).map(({ signal }, index) => {
    const sourceColor = colors[index % Math.max(colors.length, 1)] ?? "black";
    const sourceMaterial = materials[index % Math.max(materials.length, 1)] ?? "";
    const sources = styleProfile.sourcesBySignal[signal.id] ?? [];
    const queryParts = ["women", sourceColor, sourceMaterial, signal.label].filter(Boolean);
    return {
      id: `intent-${signal.id.replaceAll(" ", "-")}`,
      category: GARMENT_CATEGORY[signal.id],
      garmentType: signal.label,
      colors: [sourceColor, ...colors.filter((color) => color !== sourceColor).slice(0, 1)],
      materials: sourceMaterial ? [sourceMaterial] : [],
      silhouettes,
      aesthetics,
      eras,
      musicSources: sources,
      priority: signal.weight,
      searchQuery: queryParts.join(" "),
      department,
    };
  });
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
