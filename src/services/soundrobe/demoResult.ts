import { DemoCommerceProvider } from "@/src/services/commerce/DemoCommerceProvider";
import { DemoMusicProvider } from "@/src/services/music/DemoMusicProvider";
import { generateSoundrobe } from "@/src/services/soundrobe/generateSoundrobe";

export const soundrobeResultPromise = generateSoundrobe(new DemoMusicProvider(), new DemoCommerceProvider({ maxPrice: 250 }), { maxPrice: 250 });
