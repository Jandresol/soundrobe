import type { ProductCandidate } from "@/src/domain/commerce/types";
import type { GarmentCategory } from "@/src/domain/style/types";

const product = (id: string, title: string, price: number, category: GarmentCategory, garmentType: string, colors: string[], materials: string[], aesthetics: string[] = [], silhouettes: string[] = [], eras: string[] = []): ProductCandidate => ({
  id,
  retailer: "Demo Catalog",
  brand: "Soundrobe Market",
  title,
  price,
  currency: "USD",
  imageUrl: "",
  productUrl: `https://example.com/demo-products/${id}`,
  availability: "in_stock",
  attributes: { garmentType, category, colors, materials, aesthetics, silhouettes, eras },
});

export const demoProducts: ProductCandidate[] = [
  product("black-moto", "Black Distressed Leather Moto Jacket", 190, "outerwear", "moto jacket", ["black"], ["leather"], ["rebellious", "distressed"], ["structured"], ["2000s"]),
  product("graphic-tee", "Black Graphic Baby Tee", 38, "top", "graphic baby tee", ["black"], ["cotton"], ["mall-punk"], ["fitted"], ["2000s"]),
  product("rib-knit", "Burgundy Fitted Rib Knit Long Sleeve", 68, "top", "rib knit long sleeve", ["burgundy"], ["rib knit"], ["sleek"], ["fitted"], ["1990s"]),
  product("low-jeans", "Dark Low-Rise Jeans", 88, "bottom", "low-rise jeans", ["denim", "black"], ["washed denim"], ["nostalgic"], ["low-slung"], ["2000s"]),
  product("wide-trouser", "Camel Wide-Leg Trouser", 120, "bottom", "wide-leg trouser", ["camel"], ["cotton"], ["bohemian"], ["relaxed"], ["1970s"]),
  product("boots", "Black Worn Platform Boots", 145, "shoes", "boots", ["black"], ["leather"], ["rebellious"], ["structured"], ["1990s", "2000s"]),
  product("bag", "Black Compact Shoulder Bag", 84, "bag", "compact shoulder bag", ["black"], ["leather"], ["sleek"], ["fitted"], ["2000s"]),
  product("hoops", "Polished Gold Hoop Earrings", 44, "jewelry", "gold hoops", ["gold"], ["metallic"], ["polished", "sleek"], [], ["1990s", "2000s"]),
];
