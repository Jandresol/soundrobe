import type { ProductCandidate } from "@/src/domain/commerce/types";
import type { GarmentIntent } from "@/src/domain/style/types";
import type { CommerceProvider } from "@/src/services/commerce/CommerceProvider";

export class LiveCommerceProvider implements CommerceProvider {
  readonly source = "live" as const;

  async search(intent: GarmentIntent): Promise<ProductCandidate[]> {
    void intent;
    if (!process.env.COMMERCE_API_KEY) {
      throw new Error("COMMERCE_API_KEY is not configured.");
    }
    throw new Error("LiveCommerceProvider is ready for a product API adapter, but no provider has been configured.");
  }
}
