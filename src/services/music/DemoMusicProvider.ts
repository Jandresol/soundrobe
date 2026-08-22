import type { MusicProfile, MusicUser } from "@/src/domain/music/types";
import { normalizeMusicProfile } from "@/src/engine/music/normalizeMusicProfile";
import type { MusicTimeWeights } from "@/src/engine/music/combineTimeRanges";
import { demoMusicProfiles } from "@/src/fixtures/musicProfiles/demoProfiles";
import type { MusicProvider } from "@/src/services/music/MusicProvider";

export class DemoMusicProvider implements MusicProvider {
  readonly source = "demo" as const;
  constructor(
    private readonly profileId = process.env.SOUNDROBE_DEMO_PROFILE_ID ?? "demo-jasmine",
    private readonly weights?: MusicTimeWeights,
  ) {}

  async getUserProfile(): Promise<MusicUser> {
    const profile = await this.getMusicProfile();
    return { id: profile.id, displayName: profile.displayName };
  }

  async getMusicProfile(): Promise<MusicProfile> {
    const raw = demoMusicProfiles.find((profile) => profile.id === this.profileId) ?? demoMusicProfiles[0];
    return normalizeMusicProfile(raw, this.weights);
  }
}
