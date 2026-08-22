import type { ProductRecommendation } from "@/src/domain/commerce/types";

export type OutfitRecommendation = {
  id: string;
  name: string;
  products: ProductRecommendation[];
  score: number;
  reasons: Array<{ signal: string; contribution: number }>;
};
