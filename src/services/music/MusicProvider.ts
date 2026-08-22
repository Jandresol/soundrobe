import type { MusicProfile, MusicUser } from "@/src/domain/music/types";

export interface MusicProvider {
  readonly source: "spotify" | "demo";
  getUserProfile(): Promise<MusicUser>;
  getMusicProfile(): Promise<MusicProfile>;
}
