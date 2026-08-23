import type { ProductCandidate } from "@/src/domain/commerce/types";
import type { GarmentIntent } from "@/src/domain/style/types";

export type CommerceDiagnostics = {
  provider: string;
  cacheHits: number;
  cacheMisses: number;
  liveSearches: number;
  skippedByLimit: number;
  queries: string[];
};

export interface CommerceProvider {
  readonly source: "live" | "demo";
  searchKey?(intent: GarmentIntent): string;
  search(intent: GarmentIntent): Promise<ProductCandidate[]>;
  diagnostics?(): CommerceDiagnostics;
}
