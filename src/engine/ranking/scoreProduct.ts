import { PRODUCT_SCORE_WEIGHTS } from "@/src/config/recommendationWeights";
import type { ProductCandidate, ProductMatchReason } from "@/src/domain/commerce/types";
import type { GarmentIntent, ShoppingPreferences } from "@/src/domain/style/types";

const hasAny = (wanted: string[], actual?: string[]) => wanted.some((item) => actual?.map((value) => value.toLowerCase()).includes(item.toLowerCase()));

export function scoreProduct(product: ProductCandidate, intent: GarmentIntent, preferences?: ShoppingPreferences) {
  const reasons: ProductMatchReason[] = [];
  if (product.attributes.category && product.attributes.category !== intent.category) {
    return { score: 0, reasons };
  }
  const add = (signal: string, source: string, contribution: number) => {
    if (contribution > 0) reasons.push({ signal, source, contribution });
  };
  add(intent.garmentType, "garment type", product.attributes.garmentType?.toLowerCase() === intent.garmentType.toLowerCase() ? PRODUCT_SCORE_WEIGHTS.garmentType : 0);
  add(intent.colors.join(", "), "color", hasAny(intent.colors, product.attributes.colors) ? PRODUCT_SCORE_WEIGHTS.color : 0);
  add(intent.materials.join(", "), "material", hasAny(intent.materials, product.attributes.materials) ? PRODUCT_SCORE_WEIGHTS.material : 0);
  add(intent.silhouettes.join(", "), "silhouette", hasAny(intent.silhouettes, product.attributes.silhouettes) ? PRODUCT_SCORE_WEIGHTS.silhouette : 0);
  add(intent.aesthetics.join(", "), "aesthetic", hasAny(intent.aesthetics, product.attributes.aesthetics) ? PRODUCT_SCORE_WEIGHTS.aesthetic : 0);
  add(intent.eras.join(", "), "era", hasAny(intent.eras, product.attributes.eras) ? PRODUCT_SCORE_WEIGHTS.era : 0);
  add("music priority", "style engine", Math.round((intent.priority / 100) * PRODUCT_SCORE_WEIGHTS.priority));
  add(product.availability ?? "availability", "commerce", product.availability === "in_stock" ? PRODUCT_SCORE_WEIGHTS.availability : 0);
  if (preferences?.maxPrice && product.price <= preferences.maxPrice) add("budget", "shopping preferences", PRODUCT_SCORE_WEIGHTS.priceFit);
  const score = Math.min(100, Math.round(reasons.reduce((sum, reason) => sum + reason.contribution, 0)));
  return { score, reasons };
}
