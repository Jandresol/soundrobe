import type { GarmentIntent } from "@/src/domain/style/types";

export type ProductCandidate = {
  id: string;
  retailer: string;
  title: string;
  brand?: string;
  price: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  availability?: string;
  attributes: {
    category?: string;
    garmentType?: string;
    colors?: string[];
    materials?: string[];
    silhouettes?: string[];
    aesthetics?: string[];
    eras?: string[];
  };
};

export type ProductMatchReason = {
  signal: string;
  source: string;
  contribution: number;
};

export type ProductRecommendation = {
  product: ProductCandidate;
  intent: GarmentIntent;
  score: number;
  reasons: ProductMatchReason[];
};
