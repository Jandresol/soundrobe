import type { MusicProfile, MusicUser } from "@/src/domain/music/types";
import { normalizeMusicProfile, type RawDemoMusicProfile } from "@/src/engine/music/normalizeMusicProfile";
import type { MusicTimeWeights } from "@/src/engine/music/combineTimeRanges";
import { LastfmGenreEnrichmentProvider } from "@/src/services/music/LastfmGenreEnrichmentProvider";
import type { MusicProvider } from "@/src/services/music/MusicProvider";

type SpotifyImage = { url: string };
type SpotifyUser = { id: string; display_name?: string; email?: string };
type SpotifyArtist = { id: string; name: string; genres?: string[]; images?: SpotifyImage[] };
type SpotifyTrack = {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album?: { name?: string; release_date?: string; images?: SpotifyImage[] };
};

type SpotifyTopResponse<T> = { items: T[] };
type SpotifyRangeData = {
  artists: SpotifyArtist[];
  tracks: SpotifyTrack[];
  artistById: Map<string, SpotifyArtist>;
  trackTagsById: Map<string, string[]>;
};

const artistCache = new Map<string, SpotifyArtist>();
const TRACK_ARTIST_ENRICHMENT_LIMIT = 10;

const ranges = {
  shortTerm: "short_term",
  mediumTerm: "medium_term",
  longTerm: "long_term",
} as const;

const GENRE_ALIASES: Array<[RegExp, string[]]> = [
  [/alternative r.?&.?b|alt r.?&.?b/i, ["alternative r&b", "contemporary r&b", "r&b"]],
  [/contemporary r.?&.?b|r.?&.?b/i, ["r&b", "contemporary r&b"]],
  [/pop soul|quiet storm|new jack swing|funk|disco|motown/i, ["soul", "r&b", "pop"]],
  [/trap|hip hop|hip-hop|rap/i, ["hip-hop", "rap"]],
  [/dance|house|club|electro/i, ["dance pop", "electropop"]],
  [/indie|bedroom pop/i, ["indie"]],
  [/rock|alternative/i, ["alternative rock", "rock"]],
];

export class SpotifyProvider implements MusicProvider {
  readonly source = "spotify" as const;
  private readonly genreEnrichment = new LastfmGenreEnrichmentProvider();

  constructor(
    private readonly accessToken: string,
    private readonly weights?: MusicTimeWeights,
  ) {}

  async getUserProfile(): Promise<MusicUser> {
    const user = await this.spotifyFetch<SpotifyUser>("/v1/me");
    return { id: user.id, displayName: user.display_name || user.email || "Spotify Listener" };
  }

  async getMusicProfile(): Promise<MusicProfile> {
    const user = await this.getUserProfile();
    const entries = await Promise.all(
      Object.entries(ranges).map(async ([key, timeRange]) => {
        const [artists, tracks] = await Promise.all([
          this.spotifyFetch<SpotifyTopResponse<SpotifyArtist>>(`/v1/me/top/artists?${new URLSearchParams({ time_range: timeRange, limit: "25" })}`),
          this.spotifyFetch<SpotifyTopResponse<SpotifyTrack>>(`/v1/me/top/tracks?${new URLSearchParams({ time_range: timeRange, limit: "25" })}`),
        ]);
        const artistById = new Map<string, SpotifyArtist>();
        for (const artist of artists.items) {
          artistById.set(artist.id, artist);
          if (artist.genres?.length) artistCache.set(artist.id, artist);
        }
        const trackArtistIds = unique(tracks.items.flatMap((track) => track.artists.map((artist) => artist.id)))
          .filter((id) => !artistById.get(id)?.genres?.length)
          .slice(0, TRACK_ARTIST_ENRICHMENT_LIMIT);
        const enrichedArtists = await this.fetchArtists(trackArtistIds);
        for (const artist of enrichedArtists) artistById.set(artist.id, artist);
        await this.enrichMissingGenres(artistById);
        const trackTagsById = await this.enrichTrackTags(tracks.items, artistById);
        return [key, { artists: artists.items, tracks: tracks.items, artistById, trackTagsById }] as const;
      }),
    );

    const rawRanges = Object.fromEntries(entries) as Record<keyof typeof ranges, SpotifyRangeData>;
    const raw: RawDemoMusicProfile = {
      id: user.id,
      displayName: user.displayName,
      ranges: {
        shortTerm: this.normalizeRange(rawRanges.shortTerm),
        mediumTerm: this.normalizeRange(rawRanges.mediumTerm),
        longTerm: this.normalizeRange(rawRanges.longTerm),
      },
    };
    return normalizeMusicProfile(raw, this.weights);
  }

  private async spotifyFetch<T>(path: string): Promise<T> {
    const response = await fetch(`https://api.spotify.com${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(await spotifyErrorMessage(response));
    return response.json() as Promise<T>;
  }

  private async fetchArtists(ids: string[]): Promise<SpotifyArtist[]> {
    const artists: SpotifyArtist[] = [];
    for (const id of ids) {
      const cached = artistCache.get(id);
      if (cached) {
        artists.push(cached);
        continue;
      }
      try {
        const artist = await this.spotifyFetch<SpotifyArtist>(`/v1/artists/${id}`);
        artistCache.set(id, artist);
        artists.push(artist);
      } catch (error) {
        if (error instanceof Error && error.message.includes("429")) break;
        continue;
      }
    }
    return artists;
  }

  private normalizeRange(range: SpotifyRangeData): RawDemoMusicProfile["ranges"]["shortTerm"] {
    const artistWeights = new Map<string, { artist: SpotifyArtist; weight: number }>();
    const addArtistWeight = (artist: SpotifyArtist | undefined, weight: number) => {
      if (!artist) return;
      const current = artistWeights.get(artist.id) ?? { artist, weight: 0 };
      current.artist = { ...current.artist, ...artist };
      current.weight += weight;
      artistWeights.set(artist.id, current);
    };

    range.artists.forEach((artist, index) => {
      addArtistWeight(range.artistById.get(artist.id) ?? artist, 100 - index * 3);
    });
    range.tracks.forEach((track, index) => {
      const trackWeight = (100 - index * 3) * 0.45;
      const perArtistWeight = trackWeight / Math.max(track.artists.length, 1);
      track.artists.forEach((artist) => addArtistWeight(range.artistById.get(artist.id), perArtistWeight));
    });

    return {
      artists: Array.from(artistWeights.values())
        .map(({ artist, weight }) => ({
          id: artist.id,
          name: artist.name,
          genres: genresForArtist(artist),
          weight,
        }))
        .sort((a, b) => b.weight - a.weight),
      tracks: range.tracks.map((track, index) => ({
        id: track.id,
        name: track.name,
        artistIds: track.artists.map((artist) => artist.id),
        albumName: track.album?.name,
        tags: range.trackTagsById.get(track.id) ?? [],
        releaseYear: releaseYear(track.album?.release_date),
        imageUrl: bestImage(track.album?.images),
        weight: 100 - index * 3,
      })),
    };
  }

  private async enrichMissingGenres(artistById: Map<string, SpotifyArtist>) {
    const enrichment = await this.genreEnrichment.getArtistGenres(
      Array.from(artistById.values()).map((artist) => ({
        id: artist.id,
        name: artist.name,
        existingGenres: genresForArtist(artist),
      })),
    );
    for (const result of enrichment) {
      const artist = artistById.get(result.artistId);
      if (!artist || artist.genres?.length) continue;
      artistById.set(artist.id, { ...artist, genres: result.genres });
    }
  }

  private async enrichTrackTags(tracks: SpotifyTrack[], artistById: Map<string, SpotifyArtist>) {
    const enrichment = await this.genreEnrichment.getTrackTags(
      tracks.map((track) => ({
        id: track.id,
        name: track.name,
        artistNames: track.artists.map((artist) => artistById.get(artist.id)?.name ?? artist.name),
        existingTags: [],
      })),
    );
    return new Map(enrichment.map((result) => [result.trackId, result.tags]));
  }
}

function releaseYear(releaseDate?: string) {
  const year = releaseDate?.slice(0, 4);
  return year ? Number(year) : undefined;
}

function bestImage(images?: SpotifyImage[]) {
  return images?.[1]?.url ?? images?.[0]?.url;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function genresForArtist(artist: SpotifyArtist) {
  const normalized = new Set<string>();

  for (const genre of artist.genres ?? []) {
    const cleanGenre = genre.toLowerCase().trim();
    if (!cleanGenre) continue;
    normalized.add(cleanGenre);
    for (const [pattern, aliases] of GENRE_ALIASES) {
      if (pattern.test(cleanGenre)) aliases.forEach((alias) => normalized.add(alias));
    }
  }

  return Array.from(normalized);
}

async function spotifyErrorMessage(response: Response) {
  const body = await response.text().catch(() => "");
  if (response.status === 403) {
    return `Spotify denied a Web API request: ${response.url}. Reconnect Spotify, confirm user-top-read is granted, and use individual artist lookups in Development Mode.`;
  }
  return `Spotify request failed: ${response.status}${body ? ` - ${body}` : ""}`;
}
