import type { FashionAssociation } from "@/src/knowledge/genreFashionMap";

export const eraFashionAssociations: FashionAssociation[] = [
  { id: "1970s-rock-folk", genres: ["rock", "folk", "blues"], eras: ["1970s"], signals: { colors: ["camel", "rust", "cream", "denim"], materials: ["suede", "denim", "cotton"], silhouettes: ["flared", "relaxed"], garmentTypes: ["wide-leg trouser", "clogs", "scarf"], aesthetics: ["bohemian", "worn-in"] }, weight: 1.1 },
  { id: "2000s-pop-rock", genres: ["pop rock", "alternative rock", "rock"], eras: ["2000s"], signals: { colors: ["black", "burgundy", "denim", "silver"], materials: ["washed denim", "rib knit", "leather"], silhouettes: ["fitted", "low-slung", "layered"], garmentTypes: ["graphic baby tee", "low-rise jeans", "zip hoodie", "layered tank", "compact shoulder bag"], accessories: ["compact shoulder bag", "studded belt"], aesthetics: ["nostalgic", "mall-punk"] }, weight: 1.15 },
  { id: "1990s-rnb", genres: ["r&b", "contemporary r&b"], eras: ["1990s"], signals: { colors: ["black", "white", "gold", "burgundy"], materials: ["rib knit", "satin", "denim"], silhouettes: ["fitted", "straight"], garmentTypes: ["slip skirt", "rib knit long sleeve", "gold hoops"], aesthetics: ["sleek", "minimal"] }, weight: 1.05 },
  { id: "2010s-indie", genres: ["indie folk", "indie"], eras: ["2010s"], signals: { colors: ["earth green", "cream", "denim"], materials: ["linen", "washed denim", "knit"], silhouettes: ["relaxed", "layered"], garmentTypes: ["cropped denim jacket", "scarf", "sneakers"], aesthetics: ["casual", "tactile"] }, weight: 1 },
];
