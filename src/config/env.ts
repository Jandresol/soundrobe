export function getLastfmConfig() {
  return {
    apiKey: process.env.LASTFM_API_KEY,
    sharedSecret: process.env.LASTFM_SHARED_SECRET,
    enabled: process.env.LASTFM_GENRE_ENRICHMENT_ENABLED === "true",
  };
}
