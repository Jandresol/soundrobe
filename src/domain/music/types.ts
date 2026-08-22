export type WeightedSignal = {
  id: string;
  label: string;
  weight: number;
};

export type ArtistSignal = {
  id: string;
  name: string;
  genres: string[];
  weight: number;
};

export type TrackSignal = {
  id: string;
  name: string;
  artistIds: string[];
  albumName?: string;
  tags?: string[];
  releaseYear?: number;
  imageUrl?: string;
  previewUrl?: string;
  externalUrl?: string;
  weight: number;
};

export type MusicTimeRange = {
  artists: ArtistSignal[];
  tracks: TrackSignal[];
  genres: WeightedSignal[];
  eras: WeightedSignal[];
};

export type MusicUser = {
  id: string;
  displayName: string;
};

export type MusicProfile = MusicUser & {
  shortTerm: MusicTimeRange;
  mediumTerm: MusicTimeRange;
  longTerm: MusicTimeRange;
  combinedGenres: WeightedSignal[];
  combinedEras: WeightedSignal[];
};
