import type { ProductCandidate, ProductRecommendation } from "@/src/domain/commerce/types";
import type { GarmentIntent, ShoppingPreferences } from "@/src/domain/style/types";
import { scoreProduct } from "@/src/engine/ranking/scoreProduct";

export function rankProducts(candidatesByIntent: Array<{ intent: GarmentIntent; candidates: ProductCandidate[] }>, preferences?: ShoppingPreferences): ProductRecommendation[] {
  return candidatesByIntent
    .flatMap(({ intent, candidates }) => candidates.map((product) => ({ product, intent, ...scoreProduct(product, intent, preferences) })))
    .filter((recommendation) => recommendation.score > 0)
    .sort((a, b) => b.score - a.score);
}
