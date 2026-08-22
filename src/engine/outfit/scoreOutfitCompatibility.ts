import type { ProductRecommendation } from "@/src/domain/commerce/types";
import { colorCompatibilityScore } from "@/src/knowledge/colorCompatibility";

export function scoreOutfitCompatibility(products: ProductRecommendation[]) {
  const colors = products.flatMap((entry) => entry.product.attributes.colors ?? []);
  const influences = new Set(products.flatMap((entry) => entry.intent.musicSources.map((source) => source.label)));
  const categories = products.map((entry) => entry.intent.category);
  const redundant = categories.length - new Set(categories).size;
  return {
    colorCompatibility: Math.round(colorCompatibilityScore(colors) * 100),
    silhouetteCompatibility: 78,
    musicInfluenceCoverage: Math.min(100, influences.size * 22),
    styleCoverage: Math.min(100, new Set(products.flatMap((entry) => entry.product.attributes.aesthetics ?? [])).size * 20),
    redundancyPenalty: redundant * 15,
  };
}
