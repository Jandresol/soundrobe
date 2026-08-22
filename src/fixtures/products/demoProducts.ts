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
  product("denim-crop", "Cropped Washed Denim Jacket", 92, "outerwear", "cropped denim jacket", ["denim"], ["washed denim"], ["nostalgic"], ["layered"], ["2000s", "1990s"]),
  product("graphic-tee", "Black Graphic Baby Tee", 38, "top", "graphic baby tee", ["black"], ["cotton"], ["mall-punk"], ["fitted"], ["2000s"]),
  product("rib-knit", "Burgundy Fitted Rib Knit Long Sleeve", 68, "top", "rib knit long sleeve", ["burgundy"], ["rib knit"], ["sleek"], ["fitted"], ["1990s"]),
  product("low-jeans", "Dark Low-Rise Jeans", 88, "bottom", "low-rise jeans", ["denim", "black"], ["washed denim"], ["nostalgic"], ["low-slung"], ["2000s"]),
  product("wide-trouser", "Camel Wide-Leg Trouser", 120, "bottom", "wide-leg trouser", ["camel"], ["cotton"], ["bohemian"], ["relaxed"], ["1970s"]),
  product("boots", "Black Worn Platform Boots", 145, "shoes", "boots", ["black"], ["leather"], ["rebellious"], ["structured"], ["1990s", "2000s"]),
  product("sneakers", "White Retro Low Sneakers", 76, "shoes", "sneakers", ["white"], ["cotton"], ["casual"], ["relaxed"], ["1990s"]),
  product("bag", "Black Compact Shoulder Bag", 84, "bag", "compact shoulder bag", ["black"], ["leather"], ["sleek"], ["fitted"], ["2000s"]),
  product("hoops", "Polished Gold Hoop Earrings", 44, "jewelry", "gold hoops", ["gold"], ["metallic"], ["polished", "sleek"], [], ["1990s", "2000s"]),
  product("scarf", "Earth Green Patterned Scarf", 36, "accessory", "scarf", ["earth green", "cream"], ["linen"], ["artful", "warm"], ["draped"], ["1970s"]),
  product("belt", "Silver Studded Belt", 42, "accessory", "studded belt", ["silver", "black"], ["metallic", "leather"], ["rebellious"], [], ["2000s"]),
  product("mini-skirt", "Hot Pink Patent Mini Skirt", 58, "bottom", "mini skirt", ["hot pink"], ["patent"], ["club", "digital"], ["fitted"], ["2000s"]),
  product("slip-dress", "Lilac Mesh Slip Dress", 98, "dress", "slip dress", ["lilac"], ["mesh"], ["ethereal"], ["body-skimming"], ["1990s"]),
  product("clogs", "Rust Suede Clogs", 118, "shoes", "clogs", ["rust"], ["suede"], ["bohemian"], ["relaxed"], ["1970s"]),
];
