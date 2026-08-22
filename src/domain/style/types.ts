import type { WeightedSignal } from "@/src/domain/music/types";

export type StyleSource = {
  kind: "genre" | "era" | "association" | "palette" | "intent";
  id: string;
  label: string;
  weight: number;
};

export type StyleProfile = {
  traits: WeightedSignal[];
  colors: WeightedSignal[];
  materials: WeightedSignal[];
  silhouettes: WeightedSignal[];
  garmentTypes: WeightedSignal[];
  accessories: WeightedSignal[];
  aesthetics: WeightedSignal[];
  eraInfluences: WeightedSignal[];
  sourcesBySignal: Record<string, StyleSource[]>;
};

export type PaletteColor = {
  name: string;
  hex: string;
  score: number;
  sources: StyleSource[];
};

export type StyleThread = {
  headline: string;
  description: string;
  dominantInfluences: Array<{ label: string; weight: number }>;
};

export type FashionDepartment = "womenswear" | "menswear" | "unisex";

export type GarmentCategory =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "shoes"
  | "bag"
  | "jewelry"
  | "accessory";

export type GarmentIntent = {
  id: string;
  category: GarmentCategory;
  garmentType: string;
  colors: string[];
  materials: string[];
  silhouettes: string[];
  aesthetics: string[];
  eras: string[];
  musicSources: StyleSource[];
  priority: number;
  searchQuery: string;
  department: FashionDepartment;
};

export type ShoppingPreferences = {
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  preferredRetailers?: string[];
  excludedRetailers?: string[];
};
