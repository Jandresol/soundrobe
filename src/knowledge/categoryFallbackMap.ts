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
      outerwear: ["worn leather moto jacket", "distressed leather jacket", "cropped leather jacket"],
      top: ["distressed fitted graphic tee", "goth baby tee", "mesh long sleeve"],
      bottom: ["leather trousers", "leather mini skirt", "plaid mini skirt"],
      dress: ["lace slip dress", "asymmetrical mini dress"],
      shoes: ["engineer boots", "moto boots", "pointed leather boots"],
      bag: ["hardware shoulder bag", "slouchy leather bag"],
      jewelry: ["silver jewelry", "choker"],
      accessory: ["studded belt", "grommet belt"],
    },
    weight: 1,
  },
  {
    id: "fallback-pop-club-digital",
    signals: ["pop", "dance pop", "electropop", "club", "party", "hyperpop", "glossy"],
    garments: {
      outerwear: ["cropped faux fur jacket", "rhinestone denim jacket", "cropped bomber jacket"],
      top: ["asymmetric fitted top", "satin cowl top", "mesh long sleeve"],
      bottom: ["statement flared trouser", "mini skirt", "capri pants"],
      dress: ["mini dress", "bodycon dress"],
      shoes: ["platform heels", "pointed leather boots", "kitten heels"],
      bag: ["mini bag", "embellished shoulder bag"],
      jewelry: ["statement jewelry", "charm necklace"],
      accessory: ["hair clips", "phone charm"],
    },
    weight: 0.9,
  },
  {
    id: "fallback-hip-hop-street",
    signals: ["hip-hop", "rap", "trap", "drill", "streetwear", "confident", "bold", "female rap", "baddie", "dirty south rap", "y2k"],
    garments: {
      outerwear: ["cropped leather jacket", "cropped bomber jacket", "rhinestone denim jacket"],
      top: ["tattoo graphic baby tee", "corset-detail top", "mesh tank top"],
      bottom: ["leather trousers", "hardware low-rise trouser", "cargo pants"],
      dress: ["mini dress"],
      shoes: ["stiletto heels", "platform heels", "moto boots"],
      bag: ["crescent bag", "hardware shoulder bag", "crossbody bag"],
      jewelry: ["gold hoops", "chain necklace"],
      accessory: ["baseball cap", "sunglasses"],
    },
    weight: 0.92,
  },
  {
    id: "fallback-soul-folk-earthy",
    signals: ["soul", "neo-soul", "alternative r&b", "folk", "blues", "acoustic", "earthy", "warm", "chill", "cozy"],
    garments: {
      outerwear: ["shawl cardigan", "barn jacket", "cropped denim jacket"],
      top: ["crochet top", "linen top", "wrap top"],
      bottom: ["flowy maxi skirt", "wide-leg lounge pants", "wide-leg trouser"],
      dress: ["maxi dress", "prairie dress"],
      shoes: ["clogs", "cowboy boots", "mules"],
      bag: ["tote bag", "bucket bag"],
      jewelry: ["beaded necklace", "gold jewelry"],
      accessory: ["silk scarf", "patterned scarf"],
    },
    weight: 0.92,
  },
  {
    id: "fallback-vintage-retro-glossy",
    signals: ["1980s", "vintage", "retro", "oldies", "classic pop", "motown", "funk", "disco", "michael jackson"],
    garments: {
      outerwear: ["fitted leather jacket", "fitted blazer"],
      top: ["satin cowl top", "sequin top", "asymmetric fitted top"],
      bottom: ["statement flared trouser", "satin pants", "bell bottoms"],
      dress: ["bodycon dress", "shirt dress"],
      shoes: ["pointed leather boots", "distinctive loafers", "kitten heels"],
      bag: ["compact shoulder bag", "unusual leather bag"],
      jewelry: ["sculptural gold earrings", "gold hoops"],
      accessory: ["statement belt", "silk scarf"],
    },
    weight: 0.94,
  },
  {
    id: "fallback-indie-dreamy-soft",
    signals: ["indie", "dream pop", "shoegaze", "bedroom pop", "soft", "dreamy"],
    garments: {
      outerwear: ["cardigan", "cropped denim jacket"],
      top: ["oversized knit", "soft camisole", "lace blouse"],
      bottom: ["maxi skirt", "slip skirt", "denim skirt"],
      dress: ["slip dress", "sweater dress"],
      shoes: ["ballet flats", "mary janes", "worn sneakers"],
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
  outerwear: ["short jacket", "cropped leather jacket"],
  top: ["asymmetric top", "rib knit long sleeve"],
  bottom: ["wide-leg trouser", "slip skirt"],
  dress: ["slip dress"],
  shoes: ["loafers", "boots"],
  bag: ["tote bag", "compact shoulder bag"],
  jewelry: ["sculptural gold earrings", "silver jewelry"],
  accessory: ["statement belt", "sunglasses"],
};
