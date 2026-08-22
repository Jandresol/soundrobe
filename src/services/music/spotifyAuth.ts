export type SpotifyTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
};

const TOKEN_COOKIE = "soundrobe_spotify_token";
const STATE_COOKIE = "soundrobe_spotify_state";

export const SPOTIFY_COOKIE_NAMES = {
  token: TOKEN_COOKIE,
  state: STATE_COOKIE,
} as const;

export const SPOTIFY_SCOPES = ["user-read-private", "user-read-email", "user-top-read"];

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function getSpotifyConfig() {
  return {
    clientId: requiredEnv("SPOTIFY_CLIENT_ID"),
    clientSecret: requiredEnv("SPOTIFY_CLIENT_SECRET"),
    redirectUri: requiredEnv("SPOTIFY_REDIRECT_URI"),
    appUrl: process.env.SOUNDROBE_APP_URL ?? new URL(requiredEnv("SPOTIFY_REDIRECT_URI")).origin,
  };
}

export function encodeTokenSet(tokens: SpotifyTokenSet) {
  return Buffer.from(JSON.stringify(tokens), "utf8").toString("base64url");
}

export function decodeTokenSet(value?: string): SpotifyTokenSet | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SpotifyTokenSet;
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function authHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export async function exchangeSpotifyCode(code: string): Promise<SpotifyTokenSet> {
  const config = getSpotifyConfig();
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: authHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) throw new Error(`Spotify token exchange failed: ${response.status}`);
  const data = await response.json() as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
}

export async function refreshSpotifyToken(tokens: SpotifyTokenSet): Promise<SpotifyTokenSet> {
  if (!tokens.refreshToken) return tokens;
  if (tokens.expiresAt - Date.now() > 60_000) return tokens;

  const config = getSpotifyConfig();
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: authHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  });

  if (!response.ok) throw new Error(`Spotify token refresh failed: ${response.status}`);
  const data = await response.json() as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope ?? tokens.scope,
  };
}

export function secureCookie() {
  return process.env.SPOTIFY_REDIRECT_URI?.startsWith("https://") ?? process.env.NODE_ENV === "production";
}
