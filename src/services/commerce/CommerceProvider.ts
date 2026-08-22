import type { ProductCandidate } from "@/src/domain/commerce/types";
import type { GarmentIntent } from "@/src/domain/style/types";

export interface CommerceProvider {
  readonly source: "live" | "demo";
  search(intent: GarmentIntent): Promise<ProductCandidate[]>;
}
