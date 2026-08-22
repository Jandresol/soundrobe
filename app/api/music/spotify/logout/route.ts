import { NextResponse } from "next/server";
import { SPOTIFY_COOKIE_NAMES } from "@/src/services/music/spotifyAuth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SPOTIFY_COOKIE_NAMES.token);
  response.cookies.delete(SPOTIFY_COOKIE_NAMES.state);
  return response;
}
