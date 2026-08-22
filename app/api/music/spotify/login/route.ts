import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSpotifyConfig, secureCookie, SPOTIFY_COOKIE_NAMES, SPOTIFY_SCOPES } from "@/src/services/music/spotifyAuth";

export async function GET() {
  try {
    const config = getSpotifyConfig();
    const state = randomBytes(16).toString("hex");
    const url = new URL("https://accounts.spotify.com/authorize");
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      scope: SPOTIFY_SCOPES.join(" "),
      redirect_uri: config.redirectUri,
      state,
      show_dialog: "true",
    }).toString();

    const response = NextResponse.redirect(url);
    response.cookies.set(SPOTIFY_COOKIE_NAMES.state, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie(),
      path: "/",
      maxAge: 10 * 60,
    });
    response.cookies.delete(SPOTIFY_COOKIE_NAMES.token);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?spotify=missing-config", process.env.SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:3000"));
  }
}
