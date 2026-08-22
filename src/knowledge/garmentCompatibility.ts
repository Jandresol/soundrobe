import type { GarmentCategory } from "@/src/domain/style/types";

export const CATEGORY_LIMITS: Partial<Record<GarmentCategory, number>> = {
  top: 1,
  bottom: 1,
  dress: 1,
  outerwear: 1,
  shoes: 1,
  bag: 1,
  jewelry: 2,
  accessory: 2,
};

export const GARMENT_CATEGORY: Record<string, GarmentCategory> = {
  "moto jacket": "outerwear",
  "cropped denim jacket": "outerwear",
  "zip hoodie": "outerwear",
  "graphic baby tee": "top",
  "rib knit long sleeve": "top",
  "layered tank": "top",
  "silk cami": "top",
  "low-rise jeans": "bottom",
  "slip skirt": "bottom",
  "wide-leg trouser": "bottom",
  "mini skirt": "bottom",
  "slip dress": "dress",
  boots: "shoes",
  sneakers: "shoes",
  clogs: "shoes",
  "compact shoulder bag": "bag",
  "gold hoops": "jewelry",
  "gold jewelry": "jewelry",
  "silver jewelry": "jewelry",
  "statement jewelry": "jewelry",
  hardware: "accessory",
  scarf: "accessory",
  "patterned scarf": "accessory",
  "studded belt": "accessory",
};
