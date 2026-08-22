import type { ProductRecommendation } from "@/src/domain/commerce/types";
import type { OutfitRecommendation } from "@/src/domain/outfit/types";
import { scoreOutfitCompatibility } from "@/src/engine/outfit/scoreOutfitCompatibility";

export function assembleOutfits(rankedProducts: ProductRecommendation[]): OutfitRecommendation[] {
  const byCategory = (category: string, count = 1) => rankedProducts.filter((entry) => entry.intent.category === category).slice(0, count);
  const outfits = [
    [...byCategory("outerwear"), ...byCategory("top"), ...byCategory("bottom"), ...byCategory("shoes"), ...byCategory("jewelry"), ...byCategory("accessory")],
    [...byCategory("top", 2).slice(1), ...byCategory("bottom", 2).slice(1), ...byCategory("shoes", 2).slice(1), ...byCategory("bag"), ...byCategory("accessory", 2).slice(1)],
    [...byCategory("dress"), ...byCategory("outerwear", 2).slice(1), ...byCategory("shoes"), ...byCategory("jewelry", 2).slice(1), ...byCategory("bag")],
  ].filter(isStructurallyValidOutfit);

  return outfits.map((products, index) => {
    const compatibility = scoreOutfitCompatibility(products);
    const averageProductMatch = products.reduce((sum, entry) => sum + entry.score, 0) / products.length;
    const score = Math.round(averageProductMatch * 0.45 + compatibility.colorCompatibility * 0.18 + compatibility.silhouetteCompatibility * 0.12 + compatibility.styleCoverage * 0.15 + compatibility.musicInfluenceCoverage * 0.18 - compatibility.redundancyPenalty * 0.12);
    return {
      id: `look-${index + 1}`,
      name: `LOOK ${String(index + 1).padStart(2, "0")}`,
      products,
      score,
      reasons: Object.entries(compatibility).map(([signal, contribution]) => ({ signal, contribution })),
    };
  }).sort((a, b) => b.score - a.score);
}

function isStructurallyValidOutfit(products: ProductRecommendation[]) {
  const categories = new Set(products.map((entry) => entry.intent.category));
  const hasSeparates = categories.has("top") && categories.has("bottom") && categories.has("shoes");
  const hasDress = categories.has("dress") && categories.has("shoes");
  return products.length >= 4 && (hasSeparates || hasDress);
}
