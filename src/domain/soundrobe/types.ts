import type { MusicProfile } from "@/src/domain/music/types";
import type { ProductRecommendation } from "@/src/domain/commerce/types";
import type { OutfitRecommendation } from "@/src/domain/outfit/types";
import type { GarmentIntent, PaletteColor, ShoppingPreferences, StyleProfile, StyleThread } from "@/src/domain/style/types";

export type SoundrobeResult = {
  user: { id: string; displayName: string };
  musicProfile: MusicProfile;
  styleProfile: StyleProfile;
  styleThread: StyleThread;
  palette: PaletteColor[];
  garmentIntents: GarmentIntent[];
  signaturePieces: ProductRecommendation[];
  outfits: OutfitRecommendation[];
  metadata: {
    musicSource: "spotify" | "demo";
    commerceSource: "live" | "demo";
    generatedAt: string;
    shoppingPreferences?: ShoppingPreferences;
    diagnostics?: {
      combinedGenreCount: number;
      artistGenreCount: number;
      timeWeights?: {
        longTerm: number;
        mediumTerm: number;
        shortTerm: number;
      };
    };
  };
};
