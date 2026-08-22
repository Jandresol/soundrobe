import { NextRequest, NextResponse } from "next/server";
import { decodeTokenSet, refreshSpotifyToken, SPOTIFY_COOKIE_NAMES } from "@/src/services/music/spotifyAuth";
import { LastfmGenreEnrichmentProvider } from "@/src/services/music/LastfmGenreEnrichmentProvider";

type SpotifyArtist = {
  id: string;
  name: string;
  genres?: string[];
};

type SpotifyTrack = {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
};

type SpotifyTopResponse<T> = { items: T[] };

const artistCache = new Map<string, SpotifyArtist>();
const TRACK_ARTIST_ENRICHMENT_LIMIT = 10;
const genreEnrichment = new LastfmGenreEnrichmentProvider();

const ranges = {
  shortTerm: "short_term",
  mediumTerm: "medium_term",
  longTerm: "long_term",
} as const;

export async function GET(request: NextRequest) {
  const tokens = decodeTokenSet(request.cookies.get(SPOTIFY_COOKIE_NAMES.token)?.value);
  if (!tokens) return NextResponse.json({ error: "Spotify is not connected." }, { status: 401 });

  try {
    const refreshed = await refreshSpotifyToken(tokens);
    const data = await Promise.all(
      Object.entries(ranges).map(async ([label, timeRange]) => {
        const [topArtists, topTracks] = await Promise.all([
          spotifyFetch<SpotifyTopResponse<SpotifyArtist>>(refreshed.accessToken, `/v1/me/top/artists?${new URLSearchParams({ time_range: timeRange, limit: "25" })}`),
          spotifyFetch<SpotifyTopResponse<SpotifyTrack>>(refreshed.accessToken, `/v1/me/top/tracks?${new URLSearchParams({ time_range: timeRange, limit: "25" })}`),
        ]);

        const trackArtistIds = unique(topTracks.items.flatMap((track) => track.artists.map((artist) => artist.id)));
        const artistsById = new Map<string, SpotifyArtist>();
        for (const artist of topArtists.items) {
          artistsById.set(artist.id, artist);
          if (artist.genres?.length) artistCache.set(artist.id, artist);
        }
        const missingTrackArtistIds = trackArtistIds
          .filter((id) => !artistsById.get(id)?.genres?.length)
          .slice(0, TRACK_ARTIST_ENRICHMENT_LIMIT);
        const trackArtists = await fetchArtists(refreshed.accessToken, missingTrackArtistIds);
        for (const artist of trackArtists) artistsById.set(artist.id, artist);
        const enriched = await genreEnrichment.getArtistGenres(
          Array.from(artistsById.values()).map((artist) => ({
            id: artist.id,
            name: artist.name,
            existingGenres: artist.genres ?? [],
          })),
        );
        for (const result of enriched) {
          const artist = artistsById.get(result.artistId);
          if (!artist || artist.genres?.length) continue;
          artistsById.set(artist.id, { ...artist, genres: result.genres });
        }
        const allArtists = Array.from(artistsById.values());
        const allGenres = unique(allArtists.flatMap((artist) => artist.genres ?? []));

        return {
          range: label,
          artistCount: allArtists.length,
          artistsWithGenres: allArtists.filter((artist) => artist.genres?.length).length,
          genres: allGenres.sort(),
          topArtists: topArtists.items.map((artist) => {
            const enriched = artistsById.get(artist.id) ?? artist;
            return { name: enriched.name, genres: enriched.genres ?? [] };
          }),
          topTrackArtists: trackArtists.map((artist) => ({ name: artist.name, genres: artist.genres ?? [] })),
        };
      }),
    );

    return NextResponse.json({ ranges: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read Spotify genres." }, { status: 502 });
  }
}

async function spotifyFetch<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`https://api.spotify.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await spotifyErrorMessage(response));
  return response.json() as Promise<T>;
}

async function fetchArtists(accessToken: string, ids: string[]) {
  const artists: SpotifyArtist[] = [];
  for (const id of ids) {
    const cached = artistCache.get(id);
    if (cached) {
      artists.push(cached);
      continue;
    }
    try {
      const artist = await spotifyFetch<SpotifyArtist>(accessToken, `/v1/artists/${id}`);
      artistCache.set(id, artist);
      artists.push(artist);
    } catch (error) {
      if (error instanceof Error && error.message.includes("429")) break;
      continue;
    }
  }
  return artists;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function spotifyErrorMessage(response: Response) {
  const body = await response.text().catch(() => "");
  if (response.status === 403) {
    return `Spotify denied a Web API request: ${response.url}. Reconnect Spotify, confirm user-top-read is granted, and use individual artist lookups in Development Mode.`;
  }
  return `Spotify request failed: ${response.status}${body ? ` - ${body}` : ""}`;
}
