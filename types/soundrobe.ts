export type Screen = "home" | "analysis" | "dna" | "soundrobe" | "looks" | "closet" | "profile";

export type Category = "top" | "bottom" | "outerwear" | "shoe" | "accessory";

export type GenreWeight = {
  name: string;
  value: number;
};

export type EraWeight = {
  name: string;
  value: number;
};

export type ArtistSignal = {
  name: string;
  label: string;
  value?: number;
};

export type TrackSignal = {
  name: string;
  artists: string[];
  albumName?: string;
  tags?: string[];
  releaseYear?: number;
  imageUrl?: string;
  value?: number;
};

export type AlbumSignal = {
  name: string;
  imageUrl?: string;
  artists: string[];
  value: number;
};

export type TraitWeight = {
  name: string;
  value: number;
};

export type PaletteColor = {
  name: string;
  hex: string;
  score?: number;
};

export type FashionSignal = {
  name: string;
  value: number;
};

export type Garment = {
  id: string;
  name: string;
  category: Category;
  price: number;
  influences: string[];
  eras: string[];
  explanation: string;
  image?: string;
  brand?: string;
  retailer?: string;
  productUrl?: string;
  matchScore?: number;
  matchReasons?: Array<{ signal: string; source: string; contribution: number }>;
};

export type Outfit = {
  id: string;
  name: string;
  description: string;
  garmentIds: string[];
};

export type MusicProfile = {
  userName: string;
  genres: GenreWeight[];
  eras: EraWeight[];
  moodTags: GenreWeight[];
  trackTags: GenreWeight[];
  artists: ArtistSignal[];
  tracks: TrackSignal[];
  albums: AlbumSignal[];
  traits: TraitWeight[];
};

export type StyleProfile = {
  styleThread: string;
  palette: PaletteColor[];
  fashionSignals: FashionSignal[];
  signaturePieces: Garment[];
};
