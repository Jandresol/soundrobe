import { NextRequest, NextResponse } from "next/server";
import { decodeTokenSet, SPOTIFY_COOKIE_NAMES } from "@/src/services/music/spotifyAuth";

export async function GET(request: NextRequest) {
  const tokens = decodeTokenSet(request.cookies.get(SPOTIFY_COOKIE_NAMES.token)?.value);
  const scopes = tokens?.scope?.split(" ").filter(Boolean) ?? [];
  return NextResponse.json({
    connected: Boolean(tokens),
    expiresAt: tokens?.expiresAt ?? null,
    scopes,
    hasUserTopRead: scopes.includes("user-top-read"),
  });
}
