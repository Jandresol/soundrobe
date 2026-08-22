import { getLastfmConfig } from "@/src/config/env";
import { popularSpotifyGenreAliases } from "@/src/knowledge/popularSpotifyGenreMap";
import type { GenreEnrichmentArtist, GenreEnrichmentProvider, GenreEnrichmentResult, TrackEnrichmentResult, TrackEnrichmentTrack } from "@/src/services/music/GenreEnrichmentProvider";

type LastfmTopTagsResponse = {
  toptags?: {
    tag?: Array<{ name?: string; count?: number }>;
  };
};

const tagCache = new Map<string, string[]>();
const trackTagCache = new Map<string, string[]>();
const MAX_ARTISTS_PER_REQUEST = 35;
const MAX_TRACKS_PER_REQUEST = 12;
const MAX_TAGS_TO_READ = 18;
const MAX_GENRES_PER_ARTIST = 5;

const TAG_ALIASES: Record<string, string> = {
  "2 step": "uk garage",
  "alt pop": "indie-pop",
  "alternative": "alternative-rock",
  "alternative hip hop": "hip-hop",
  "alternative metal": "metal",
  "alternative rnb": "alternative-r&b",
  "alternative rock": "alternative-rock",
  "art pop": "art-pop",
  "bossa nova": "bossa-nova",
  "brazilian rock": "rock",
  "classic rock": "classic-rock",
  "contemporary rnb": "contemporary-r&b",
  "doom metal": "metal",
  "dream pop": "dream-pop",
  "female vocal": "female-vocalists",
  "female vocalist": "female-vocalists",
  "female vocalists": "femme",
  "feminist": "feminist",
  "feminista": "feminist",
  "grime": "grime",
  "gothic": "gothic",
  "club": "club",
  "dance": "club",
  "hard rock": "hard-rock",
  "hardcore hip hop": "hip-hop",
  "hardcore punk": "punk",
  "indie pop": "indie-pop",
  "indie rock": "indie-rock",
  "instrumental hip hop": "hip-hop",
  "jazz hip hop": "jazz-rap",
  "jazz pop": "jazz",
  "motown": "soul",
  "mpb": "mpb",
  "neo soul": "neo-soul",
  "nu metal": "metal",
  "pop rap": "rap",
  "pop rock": "rock",
  "pop soul": "soul",
  "post hardcore": "punk",
  "post rock": "alternative-rock",
  "psychedelic rock": "rock",
  "rhythm and blues": "r&b",
  "riot girrr": "riot-grrrl",
  "riot girrrls": "riot-grrrl",
  "riot grrrl": "riot-grrrl",
  "romantic": "romantic",
  "experimental": "experimental",
  "sex": "sensual",
  "sexy": "sensual",
  "dreamy": "dreamy",
  "chillout": "soft",
  "lgbtq": "queer",
  "queer": "queer",
  "southern hip hop": "hip-hop",
  "trap latino": "reggaeton",
  "uk garage": "uk-garage",
  "underground hip hop": "hip-hop",
  "west coast hip hop": "hip-hop",
};

const NON_GENRE_TAGS = new Set([
  "all",
  "american",
  "beyonce",
  "bookmarks",
  "brian littrell",
  "britain",
  "british",
  "canada",
  "canadian",
  "dj",
  "djavan",
  "drake",
  "howie dorough",
  "icelandic",
  "janet jackson",
  "jorge vercillo",
  "kc and the sunshine band",
  "king of pop",
  "legend",
  "male vocalists",
  "michael jackson",
  "my top songs",
  "need to rate",
  "not gangsta",
  "not gangsta rap",
  "not hip hop",
  "not rap",
  "ofwgkta",
  "paul mccartney",
  "producer",
  "queen",
  "roll deep",
  "sade",
  "soundtrack",
  "swag",
  "tamia",
  "teena marie",
  "the beatles",
  "the l word",
  "trap queen",
  "uk",
  "united states",
  "usa",
  "vercillo",
  "wish ill see them one day",
]);

const PLACE_TAGS = new Set([
  "atlanta",
  "brasil",
  "brazil",
  "brazilian",
  "california",
  "chicago",
  "colombian",
  "compton",
  "east coast",
  "houston",
  "italian",
  "new york",
  "new zealand",
  "puerto rican",
  "puerto rico",
  "san francisco",
  "texas",
  "west coast",
]);

export class LastfmGenreEnrichmentProvider implements GenreEnrichmentProvider {
  readonly source = "lastfm" as const;

  async getArtistGenres(artists: GenreEnrichmentArtist[]): Promise<GenreEnrichmentResult[]> {
    const config = getLastfmConfig();
    if (!config.enabled || !config.apiKey) return [];

    const results: GenreEnrichmentResult[] = [];
    const missingArtists = artists
      .filter((artist) => artist.name && artist.existingGenres.length === 0)
      .slice(0, MAX_ARTISTS_PER_REQUEST);

    for (const artist of missingArtists) {
      const genres = await this.getGenresForArtist(artist.name, config.apiKey);
      if (genres.length) results.push({ artistId: artist.id, genres, source: this.source });
    }

    return results;
  }

  async getTrackTags(tracks: TrackEnrichmentTrack[]): Promise<TrackEnrichmentResult[]> {
    const config = getLastfmConfig();
    if (!config.enabled || !config.apiKey) return [];

    const results: TrackEnrichmentResult[] = [];
    const missingTracks = tracks
      .filter((track) => track.name && track.artistNames[0] && track.existingTags.length === 0)
      .slice(0, MAX_TRACKS_PER_REQUEST);

    for (const track of missingTracks) {
      const tags = await this.getTagsForTrack(track.name, track.artistNames[0], config.apiKey);
      if (tags.length) results.push({ trackId: track.id, tags, source: this.source });
    }

    return results;
  }

  private async getGenresForArtist(artistName: string, apiKey: string) {
    const cacheKey = artistName.toLowerCase();
    const cached = tagCache.get(cacheKey);
    if (cached) return cached;

    const url = new URL("https://ws.audioscrobbler.com/2.0/");
    url.search = new URLSearchParams({
      method: "artist.getTopTags",
      artist: artistName,
      api_key: apiKey,
      format: "json",
      autocorrect: "1",
    }).toString();

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return [];
      const data = await response.json() as LastfmTopTagsResponse;
      const genres = normalizeTags(data.toptags?.tag ?? []);
      tagCache.set(cacheKey, genres);
      return genres;
    } catch {
      return [];
    }
  }

  private async getTagsForTrack(trackName: string, artistName: string, apiKey: string) {
    const cacheKey = `${artistName.toLowerCase()}::${trackName.toLowerCase()}`;
    const cached = trackTagCache.get(cacheKey);
    if (cached) return cached;

    const url = new URL("https://ws.audioscrobbler.com/2.0/");
    url.search = new URLSearchParams({
      method: "track.getTopTags",
      artist: artistName,
      track: trackName,
      api_key: apiKey,
      format: "json",
      autocorrect: "1",
    }).toString();

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return [];
      const data = await response.json() as LastfmTopTagsResponse;
      const tags = normalizeTags(data.toptags?.tag ?? []);
      trackTagCache.set(cacheKey, tags);
      return tags;
    } catch {
      return [];
    }
  }
}

function normalizeTags(tags: Array<{ name?: string; count?: number }>) {
  const genres = new Set<string>();
  for (const tag of tags
    .filter((entry) => entry.name)
    .sort((a, b) => Number(b.count ?? 0) - Number(a.count ?? 0))
    .slice(0, MAX_TAGS_TO_READ)) {
    const cleanTag = cleanLastfmTag(tag.name);
    if (!cleanTag || shouldDropTag(cleanTag)) continue;
    const canonical = TAG_ALIASES[cleanTag] ?? lookupPopularGenre(cleanTag) ?? cleanTag;
    if (shouldDropTag(canonical)) continue;
    genres.add(canonical);
    if (genres.size >= MAX_GENRES_PER_ARTIST) break;
  }
  return Array.from(genres);
}

function cleanLastfmTag(tagName?: string) {
  return tagName
    ?.toLowerCase()
    .trim()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ");
}

function lookupPopularGenre(tag: string) {
  const direct = popularSpotifyGenreAliases.get(tag);
  if (direct) return direct.id;
  const dashed = tag.replaceAll(" ", "-");
  const dashedMatch = popularSpotifyGenreAliases.get(dashed);
  return dashedMatch?.id;
}

function shouldDropTag(tag: string) {
  return (
    NON_GENRE_TAGS.has(tag) ||
    PLACE_TAGS.has(tag) ||
    /^\d{2}s$/.test(tag) ||
    /^\d{2}'s$/.test(tag) ||
    tag.includes("seen live") ||
    tag.length < 2
  );
}
