import { NextRequest, NextResponse } from "next/server";
import { AwinCommerceProvider } from "@/src/services/commerce/AwinCommerceProvider";
import { DemoCommerceProvider } from "@/src/services/commerce/DemoCommerceProvider";
import type { CommerceProvider } from "@/src/services/commerce/CommerceProvider";
import { SerpApiCommerceProvider } from "@/src/services/commerce/SerpApiCommerceProvider";
import type { MusicTimeWeights } from "@/src/engine/music/combineTimeRanges";
import { DemoMusicProvider } from "@/src/services/music/DemoMusicProvider";
import type { MusicProfile } from "@/src/domain/music/types";
import { SpotifyProvider } from "@/src/services/music/SpotifyProvider";
import { decodeTokenSet, encodeTokenSet, refreshSpotifyToken, secureCookie, SPOTIFY_COOKIE_NAMES } from "@/src/services/music/spotifyAuth";
import { generateSoundrobe, generateSoundrobeFromMusicProfile } from "@/src/services/soundrobe/generateSoundrobe";

export async function GET(request: NextRequest) {
  const commerceProvider = commerceProviderForRequest({ maxPrice: 250 });
  const requestedMusic = request.nextUrl.searchParams.get("music");
  const timeWeights = parseTimeWeights(request.nextUrl.searchParams);

  if (requestedMusic === "demo") {
    const result = await generateSoundrobe(new DemoMusicProvider(undefined, timeWeights), commerceProvider, { maxPrice: 250 }, timeWeights);
    return NextResponse.json(result);
  }

  const tokenCookie = request.cookies.get(SPOTIFY_COOKIE_NAMES.token)?.value;
  const tokens = decodeTokenSet(tokenCookie);

  if (requestedMusic === "spotify" && !tokens) {
    return NextResponse.json({ error: "Spotify is not connected. Connect Spotify again." }, { status: 401 });
  }

  if (tokens) {
    try {
      const refreshed = await refreshSpotifyToken(tokens);
      const result = await generateSoundrobe(new SpotifyProvider(refreshed.accessToken, timeWeights), commerceProvider, { maxPrice: 250 }, timeWeights);
      const response = NextResponse.json(result);
      if (refreshed.accessToken !== tokens.accessToken || refreshed.expiresAt !== tokens.expiresAt) {
        response.cookies.set(SPOTIFY_COOKIE_NAMES.token, encodeTokenSet(refreshed), {
          httpOnly: true,
          sameSite: "lax",
          secure: secureCookie(),
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        });
      }
      return response;
    } catch (error) {
      const response = NextResponse.json(
        { error: error instanceof Error ? error.message : "Spotify music profile failed." },
        { status: 502 },
      );
      response.cookies.delete(SPOTIFY_COOKIE_NAMES.token);
      return response;
    }
  }

  const result = await generateSoundrobe(new DemoMusicProvider(undefined, timeWeights), commerceProvider, { maxPrice: 250 }, timeWeights);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const commerceProvider = commerceProviderForRequest({ maxPrice: 250 });
  const body = await request.json().catch(() => null) as {
    musicProfile?: MusicProfile;
    musicSource?: "spotify" | "demo";
    timeWeights?: MusicTimeWeights;
  } | null;

  if (!body?.musicProfile || !isMusicProfile(body.musicProfile)) {
    return NextResponse.json({ error: "A valid cached MusicProfile is required." }, { status: 400 });
  }

  const timeWeights = normalizeTimeWeights(body.timeWeights);
  const result = await generateSoundrobeFromMusicProfile(
    body.musicProfile,
    commerceProvider,
    { maxPrice: 250 },
    body.musicSource ?? "demo",
    timeWeights,
  );
  return NextResponse.json(result);
}

function parseTimeWeights(params: URLSearchParams): MusicTimeWeights | undefined {
  const longTerm = numberParam(params, "longTerm");
  const mediumTerm = numberParam(params, "mediumTerm");
  const shortTerm = numberParam(params, "shortTerm");
  if (longTerm === null || mediumTerm === null || shortTerm === null) return undefined;
  const total = longTerm + mediumTerm + shortTerm;
  if (total <= 0) return undefined;
  return {
    longTerm: longTerm / total,
    mediumTerm: mediumTerm / total,
    shortTerm: shortTerm / total,
  };
}

function numberParam(params: URLSearchParams, name: string) {
  const value = Number(params.get(name));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function commerceProviderForRequest(preferences = { maxPrice: 250 }): CommerceProvider {
  if (process.env.COMMERCE_PROVIDER === "awin" && process.env.AWIN_ACCESS_TOKEN && process.env.AWIN_PUBLISHER_ID && process.env.AWIN_ADVERTISER_IDS) {
    return new AwinCommerceProvider(
      process.env.AWIN_ACCESS_TOKEN,
      process.env.AWIN_PUBLISHER_ID,
      process.env.AWIN_ADVERTISER_IDS.split(",").map((id) => id.trim()).filter(Boolean),
      preferences,
    );
  }
  if (process.env.COMMERCE_PROVIDER === "serpapi" && process.env.SERPAPI_API_KEY) {
    return new SerpApiCommerceProvider(process.env.SERPAPI_API_KEY, preferences);
  }
  return new DemoCommerceProvider(preferences);
}

function normalizeTimeWeights(weights?: MusicTimeWeights): MusicTimeWeights | undefined {
  if (!weights) return undefined;
  const longTerm = Number(weights.longTerm);
  const mediumTerm = Number(weights.mediumTerm);
  const shortTerm = Number(weights.shortTerm);
  if (![longTerm, mediumTerm, shortTerm].every((value) => Number.isFinite(value) && value >= 0)) return undefined;
  const total = longTerm + mediumTerm + shortTerm;
  if (total <= 0) return undefined;
  return {
    longTerm: longTerm / total,
    mediumTerm: mediumTerm / total,
    shortTerm: shortTerm / total,
  };
}

function isMusicProfile(value: MusicProfile) {
  return Boolean(
    value.id &&
    value.displayName &&
    value.shortTerm &&
    value.mediumTerm &&
    value.longTerm &&
    Array.isArray(value.shortTerm.artists) &&
    Array.isArray(value.mediumTerm.artists) &&
    Array.isArray(value.longTerm.artists) &&
    Array.isArray(value.shortTerm.tracks) &&
    Array.isArray(value.mediumTerm.tracks) &&
    Array.isArray(value.longTerm.tracks),
  );
}
