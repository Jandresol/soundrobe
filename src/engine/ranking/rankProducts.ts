import type { ProductCandidate, ProductRecommendation } from "@/src/domain/commerce/types";
import type { GarmentIntent, ShoppingPreferences } from "@/src/domain/style/types";
import { scoreProduct } from "@/src/engine/ranking/scoreProduct";

export function rankProducts(candidatesByIntent: Array<{ intent: GarmentIntent; candidates: ProductCandidate[] }>, preferences?: ShoppingPreferences): ProductRecommendation[] {
  const ranked = candidatesByIntent
    .flatMap(({ intent, candidates }) => candidates.map((product) => ({ product, intent, ...scoreProduct(product, intent, preferences) })))
    .filter((recommendation) => recommendation.score > 0)
    .sort((a, b) => b.score - a.score);
  return optimizeRecommendationOrder(ranked);
}

function optimizeRecommendationOrder(recommendations: ProductRecommendation[]) {
  const selected: ProductRecommendation[] = [];
  const remaining = [...recommendations];
  const seenProducts = new Set<string>();
  while (remaining.length && selected.length < recommendations.length) {
    const best = remaining
      .filter((recommendation) => !seenProducts.has(recommendation.product.id))
      .map((recommendation) => ({ recommendation, setScore: scoreAsSetAddition(recommendation, selected) }))
      .sort((a, b) => b.setScore - a.setScore || b.recommendation.score - a.recommendation.score)[0];
    if (!best) break;
    selected.push(best.recommendation);
    seenProducts.add(best.recommendation.product.id);
    remaining.splice(remaining.indexOf(best.recommendation), 1);
  }
  return selected;
}

function scoreAsSetAddition(recommendation: ProductRecommendation, selected: ProductRecommendation[]) {
  const product = recommendation.product;
  const category = normalizedCategory(recommendation.intent.category);
  const materials = normalized(product.attributes.materials);
  const aesthetics = normalized(product.attributes.aesthetics);
  const silhouettes = normalized(product.attributes.silhouettes);
  const sources = recommendation.intent.musicSources.map((source) => source.id.toLowerCase());
  const eras = recommendation.intent.eras.map((era) => era.toLowerCase());

  const selectedCategories = new Set(selected.map((entry) => normalizedCategory(entry.intent.category)));
  const selectedMaterials = selected.flatMap((entry) => normalized(entry.product.attributes.materials));
  const selectedAesthetics = selected.flatMap((entry) => normalized(entry.product.attributes.aesthetics));
  const selectedSilhouettes = selected.flatMap((entry) => normalized(entry.product.attributes.silhouettes));
  const selectedGarments = selected.map((entry) => entry.intent.garmentType.toLowerCase());
  const selectedSources = new Set(selected.flatMap((entry) => entry.intent.musicSources.map((source) => source.id.toLowerCase())));
  const selectedEras = new Set(selected.flatMap((entry) => entry.intent.eras.map((era) => era.toLowerCase())));

  const categoryBonus = category === "dress" ? (selectedCategories.has(category) ? -6 : 2) : selectedCategories.has(category) ? -6 : 10;
  const influenceBonus = sources.some((source) => !selectedSources.has(source)) ? 6 : 0;
  const eraBonus = eras.some((era) => !selectedEras.has(era)) ? 4 : eras.length ? 1 : 0;
  const garmentPenalty = selectedGarments.includes(recommendation.intent.garmentType.toLowerCase()) ? 12 : 0;
  const materialPenalty = overlapCount(materials, selectedMaterials) * 4;
  const aestheticPenalty = overlapCount(aesthetics, selectedAesthetics) * 3;
  const silhouettePenalty = overlapCount(silhouettes, selectedSilhouettes) * 2;
  return recommendation.score + categoryBonus + influenceBonus + eraBonus - garmentPenalty - materialPenalty - aestheticPenalty - silhouettePenalty;
}

function normalized(values?: string[]) {
  return (values ?? []).map((value) => value.toLowerCase()).filter(Boolean);
}

function normalizedCategory(category: string) {
  return ["bag", "jewelry"].includes(category) ? "accessory" : category;
}

function overlapCount(values: string[], selectedValues: string[]) {
  const selected = new Set(selectedValues);
  return values.filter((value) => selected.has(value)).length;
}
