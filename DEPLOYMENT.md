# Soundrobe Deployment Checklist

## Before Pushing

- Keep `.env.local` local. It contains secrets and is ignored by Git.
- Commit `.env.example`, source files, and docs only.
- Run:

```bash
npm run lint
npm run test
npm run build
```

## Vercel Environment Variables

Add these in Vercel Project Settings > Environment Variables:

```bash
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=https://your-domain.vercel.app/api/music/spotify/callback
SOUNDROBE_APP_URL=https://your-domain.vercel.app
LASTFM_API_KEY=
LASTFM_SHARED_SECRET=
LASTFM_GENRE_ENRICHMENT_ENABLED=true
COMMERCE_PROVIDER=demo
SERPAPI_API_KEY=
SERPAPI_MAX_LIVE_SEARCHES_PER_GENERATION=3
SERPAPI_RESULTS_PER_SEARCH=20
PRODUCT_CACHE_TTL_DAYS=30
```

For launch/approval, keep `COMMERCE_PROVIDER=demo` unless you are ready to use SerpAPI quota.

## Spotify Dashboard

In the Spotify Developer Dashboard, add the exact production redirect URI:

```text
https://your-domain.vercel.app/api/music/spotify/callback
```

Also keep the local redirect if you still test locally:

```text
http://127.0.0.1:3000/api/music/spotify/callback
```

While the Spotify app is in development mode, add test users under User Management.

## AWIN Review

The app metadata includes `awin` in source code for review. For the public deployment, make sure the site loads without local-only credentials by using demo commerce until affiliate access is approved.

## User Flow

1. User lands on the home screen.
2. User connects Spotify or tries demo.
3. App builds the MusicProfile and SoundrobeResult.
4. Music DNA unlocks music, tag, album, palette, and mixer panels.
5. Soundrobe unlocks signature pieces, outfit building, save, and shop links.

