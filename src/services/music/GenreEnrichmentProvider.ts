export type GenreEnrichmentArtist = {
  id: string;
  name: string;
  existingGenres: string[];
};

export type GenreEnrichmentResult = {
  artistId: string;
  genres: string[];
  source: "lastfm";
};

export type TrackEnrichmentTrack = {
  id: string;
  name: string;
  artistNames: string[];
  existingTags: string[];
};

export type TrackEnrichmentResult = {
  trackId: string;
  tags: string[];
  source: "lastfm";
};

export interface GenreEnrichmentProvider {
  readonly source: "lastfm";
  getArtistGenres(artists: GenreEnrichmentArtist[]): Promise<GenreEnrichmentResult[]>;
  getTrackTags(tracks: TrackEnrichmentTrack[]): Promise<TrackEnrichmentResult[]>;
}
