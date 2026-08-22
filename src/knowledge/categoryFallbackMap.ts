import type { GarmentCategory } from "@/src/domain/style/types";

export type CategoryFallbackAssociation = {
  id: string;
  signals: string[];
  garments: Partial<Record<GarmentCategory, string[]>>;
  weight: number;
};

export const categoryFallbackAssociations: CategoryFallbackAssociation[] = [
  {
    id: "fallback-rnb-sensual",
    signals: ["r&b", "contemporary r&b", "alternative r&b", "sensual", "slow jams"],
    garments: {
      outerwear: ["fitted blazer", "leather blazer"],
      top: ["rib knit long sleeve", "silk cami", "corset top"],
      bottom: ["slip skirt", "satin pants", "low-rise jeans"],
      dress: ["slip dress", "bodycon dress"],
      shoes: ["kitten heels", "mules", "strappy sandals"],
      bag: ["compact shoulder bag", "flap bag"],
      jewelry: ["gold hoops", "chain necklace"],
      accessory: ["sunglasses", "silk scarf"],
    },
    weight: 1,
  },
  {
    id: "fallback-punk-rock-dark",
    signals: ["punk", "rock", "alternative rock", "riot-grrrl", "metal", "hardcore", "goth", "dark"],
    garments: {
      outerwear: ["moto jacket", "cropped denim jacket"],
      top: ["band tee", "graphic baby tee", "mesh long sleeve"],
      bottom: ["low-rise jeans", "baggy jeans", "mini skirt"],
      dress: ["slip dress", "lace dress"],
      shoes: ["combat boots", "boots", "platform sandals"],
      bag: ["compact shoulder bag", "crossbody bag"],
      jewelry: ["silver jewelry", "choker"],
      accessory: ["studded belt", "skinny scarf"],
    },
    weight: 1,
  },
  {
    id: "fallback-pop-club-digital",
    signals: ["pop", "dance pop", "electropop", "club", "party", "hyperpop", "glossy"],
    garments: {
      outerwear: ["short jacket", "faux fur jacket"],
      top: ["halter top", "tube top", "mesh long sleeve"],
      bottom: ["mini skirt", "capri pants"],
      dress: ["mini dress", "bodycon dress"],
      shoes: ["ballet sneakers", "platform sandals", "kitten heels"],
      bag: ["mini bag", "embellished shoulder bag"],
      jewelry: ["statement jewelry", "charm necklace"],
      accessory: ["hair clips", "phone charm"],
    },
    weight: 0.9,
  },
  {
    id: "fallback-hip-hop-street",
    signals: ["hip-hop", "rap", "trap", "drill", "streetwear", "confident", "bold"],
    garments: {
      outerwear: ["puffer jacket", "track jacket", "bomber jacket"],
      top: ["graphic baby tee", "football jersey", "tank top"],
      bottom: ["cargo pants", "baggy jeans", "track pants"],
      dress: ["mini dress"],
      shoes: ["running sneakers", "sneakers"],
      bag: ["crescent bag", "backpack", "crossbody bag"],
      jewelry: ["gold hoops", "chain necklace"],
      accessory: ["baseball cap", "sunglasses"],
    },
    weight: 0.92,
  },
  {
    id: "fallback-soul-folk-earthy",
    signals: ["soul", "neo-soul", "folk", "blues", "acoustic", "earthy", "warm"],
    garments: {
      outerwear: ["shawl cardigan", "barn jacket", "cropped denim jacket"],
      top: ["prairie blouse", "wrap top", "button-up shirt"],
      bottom: ["wide-leg trouser", "maxi skirt", "bootcut jeans"],
      dress: ["maxi dress", "prairie dress"],
      shoes: ["clogs", "cowboy boots", "mules"],
      bag: ["tote bag", "bucket bag"],
      jewelry: ["beaded necklace", "gold jewelry"],
      accessory: ["silk scarf", "patterned scarf"],
    },
    weight: 0.92,
  },
  {
    id: "fallback-indie-dreamy-soft",
    signals: ["indie", "dream pop", "shoegaze", "bedroom pop", "soft", "dreamy"],
    garments: {
      outerwear: ["cardigan", "cropped denim jacket"],
      top: ["fuzzy knit", "white tee", "lace blouse"],
      bottom: ["straight jeans", "denim skirt", "maxi skirt"],
      dress: ["slip dress", "sweater dress"],
      shoes: ["ballet flats", "mary janes", "sneakers"],
      bag: ["tote bag", "hobo bag"],
      jewelry: ["silver jewelry", "pearl jewelry"],
      accessory: ["hair clips", "scarf"],
    },
    weight: 0.86,
  },
  {
    id: "fallback-latin-afro-warm",
    signals: ["latin", "reggaeton", "afrobeats", "dancehall", "salsa", "bossa nova", "mpb", "rhythmic"],
    garments: {
      outerwear: ["fitted blazer", "short jacket"],
      top: ["halter top", "wrap top", "corset top"],
      bottom: ["wide-leg trouser", "satin pants"],
      dress: ["bodycon dress", "maxi dress"],
      shoes: ["strappy sandals", "platform sandals"],
      bag: ["bucket bag", "clutch"],
      jewelry: ["gold hoops", "shell earrings"],
      accessory: ["sunglasses", "silk scarf"],
    },
    weight: 0.9,
  },
  {
    id: "fallback-classic-jazz-preppy",
    signals: ["jazz", "classical", "preppy", "classic", "minimal", "quiet luxury"],
    garments: {
      outerwear: ["fitted blazer", "trench coat"],
      top: ["button-up shirt", "polo shirt", "turtleneck"],
      bottom: ["tailored trouser", "pencil skirt"],
      dress: ["shirt dress"],
      shoes: ["loafers", "oxfords", "pumps"],
      bag: ["top-handle bag", "flap bag"],
      jewelry: ["pearl jewelry", "signet ring"],
      accessory: ["silk scarf", "waist belt"],
    },
    weight: 0.88,
  },
];

export const defaultCategoryFallbacks: Partial<Record<GarmentCategory, string[]>> = {
  outerwear: ["trench coat", "cropped denim jacket"],
  top: ["white tee", "button-up shirt"],
  bottom: ["straight jeans", "wide-leg trouser"],
  dress: ["slip dress"],
  shoes: ["sneakers", "loafers"],
  bag: ["tote bag", "compact shoulder bag"],
  jewelry: ["gold hoops", "silver jewelry"],
  accessory: ["sunglasses", "scarf"],
};
