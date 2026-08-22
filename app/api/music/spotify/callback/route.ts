import { NextRequest, NextResponse } from "next/server";
import { encodeTokenSet, exchangeSpotifyCode, getSpotifyConfig, secureCookie, SPOTIFY_COOKIE_NAMES } from "@/src/services/music/spotifyAuth";

function appUrl(path: string) {
  return new URL(path, getSpotifyConfig().appUrl);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get(SPOTIFY_COOKIE_NAMES.state)?.value;

  if (error || !code || !state || state !== expectedState) {
    const response = NextResponse.redirect(appUrl("/?spotify=error"));
    response.cookies.delete(SPOTIFY_COOKIE_NAMES.state);
    return response;
  }

  try {
    const tokens = await exchangeSpotifyCode(code);
    const response = NextResponse.redirect(appUrl("/spotify/connected"));
    response.cookies.set(SPOTIFY_COOKIE_NAMES.token, encodeTokenSet(tokens), {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie(),
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    response.cookies.delete(SPOTIFY_COOKIE_NAMES.state);
    return response;
  } catch {
    const response = NextResponse.redirect(appUrl("/?spotify=error"));
    response.cookies.delete(SPOTIFY_COOKIE_NAMES.state);
    return response;
  }
}
