import type { ProductCandidate } from "@/src/domain/commerce/types";
import type { GarmentIntent, ShoppingPreferences } from "@/src/domain/style/types";
import testProductCatalog from "@/src/fixtures/products/testProductCatalog.json";
import type { CommerceProvider } from "@/src/services/commerce/CommerceProvider";

export class TestCatalogCommerceProvider implements CommerceProvider {
  readonly source = "demo" as const;
  private readonly products = testProductCatalog as ProductCandidate[];

  constructor(private readonly preferences: ShoppingPreferences = {}) {}

  async search(intent: GarmentIntent): Promise<ProductCandidate[]> {
    return this.products
      .filter((product) => product.attributes.category === intent.category)
      .filter((product) => !this.preferences.maxPrice || product.price <= this.preferences.maxPrice)
      .filter((product) => !this.preferences.excludedRetailers?.includes(product.retailer))
      .map((product) => ({ product, score: relevance(product, intent) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ product }) => product);
  }
}

function relevance(product: ProductCandidate, intent: GarmentIntent) {
  const exactGarment = product.attributes.garmentType === intent.garmentType ? 12 : 0;
  const color = overlap(intent.colors, product.attributes.colors) * 3;
  const material = overlap(intent.materials, product.attributes.materials) * 4;
  const silhouette = overlap(intent.silhouettes, product.attributes.silhouettes) * 2;
  const aesthetic = overlap(intent.aesthetics, product.attributes.aesthetics) * 2;
  return exactGarment + color + material + silhouette + aesthetic;
}

function overlap(wanted: string[], actual?: string[]) {
  const actualSet = new Set(actual?.map((value) => value.toLowerCase()) ?? []);
  return wanted.filter((value) => actualSet.has(value.toLowerCase())).length;
}
