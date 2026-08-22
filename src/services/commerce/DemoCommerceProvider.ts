import type { ProductCandidate } from "@/src/domain/commerce/types";
import type { GarmentIntent, ShoppingPreferences } from "@/src/domain/style/types";
import { demoProducts } from "@/src/fixtures/products/demoProducts";
import type { CommerceProvider } from "@/src/services/commerce/CommerceProvider";

export class DemoCommerceProvider implements CommerceProvider {
  readonly source = "demo" as const;
  constructor(private readonly preferences: ShoppingPreferences = {}) {}

  async search(intent: GarmentIntent): Promise<ProductCandidate[]> {
    const words = new Set(intent.searchQuery.toLowerCase().split(/\s+/));
    return demoProducts
      .filter((product) => !this.preferences.maxPrice || product.price <= this.preferences.maxPrice)
      .filter((product) => !this.preferences.excludedRetailers?.includes(product.retailer))
      .filter((product) => product.attributes.category === intent.category)
      .map((product) => ({
        product,
        score:
          (product.attributes.garmentType === intent.garmentType ? 8 : 0) +
          (product.attributes.colors?.some((color) => intent.colors.includes(color)) ? 3 : 0) +
          (product.attributes.materials?.some((material) => intent.materials.includes(material)) ? 2 : 0) +
          (words.has(product.attributes.garmentType?.split(" ")[0] ?? "") ? 1 : 0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.product);
  }
}
