import type { ProductRecommendation } from "@/src/domain/commerce/types";
import type { OutfitRecommendation } from "@/src/domain/outfit/types";
import type { SoundrobeResult } from "@/src/domain/soundrobe/types";
import type { Category, Garment, MusicProfile, Outfit, StyleProfile } from "@/types/soundrobe";

const categoryMap: Record<string, Category> = {
  top: "top",
  bottom: "bottom",
  dress: "top",
  outerwear: "outerwear",
  shoes: "shoe",
  bag: "accessory",
  jewelry: "accessory",
  accessory: "accessory",
};

const moodTagIds = new Set([
  "sensual",
  "romantic",
  "queer",
  "feminist",
  "riot-grrrl",
  "gothic",
  "femme",
  "moody",
  "dramatic",
  "expressive",
  "offbeat",
  "soft",
  "dreamy",
  "experimental",
  "club",
  "sleek",
  "beautiful",
  "smooth",
  "ballad",
]);

export function garmentFromRecommendation(recommendation: ProductRecommendation): Garment {
  const product = recommendation.product;
  const influences = recommendation.intent.musicSources.slice(0, 3).map((source) => source.label);
  const resolvedCategory = product.attributes.category ?? recommendation.intent.category;
  return {
    id: product.id,
    name: product.title,
    category: categoryMap[resolvedCategory] ?? "accessory",
    price: product.price,
    influences: influences.length ? influences : recommendation.intent.aesthetics.slice(0, 3),
    eras: recommendation.intent.eras,
    explanation: recommendation.reasons.map((reason) => `${reason.source}: ${reason.signal} +${reason.contribution}`).join(" / "),
    image: product.imageUrl,
    brand: product.brand,
    retailer: product.retailer,
    productUrl: product.productUrl,
    matchScore: recommendation.score,
    matchReasons: recommendation.reasons,
  };
}

export function adaptGarments(result: SoundrobeResult): Garment[] {
  const unique = new Map<string, Garment>();
  for (const recommendation of result.signaturePieces) unique.set(recommendation.product.id, garmentFromRecommendation(recommendation));
  for (const outfit of result.outfits) for (const recommendation of outfit.products) unique.set(recommendation.product.id, garmentFromRecommendation(recommendation));
  return Array.from(unique.values());
}

export function adaptOutfits(result: SoundrobeResult): Outfit[] {
  const outfits = result.outfits.map((outfit: OutfitRecommendation) => ({
    id: outfit.id,
    name: `${outfit.name} - ${outfit.score}% MATCH`,
    description: outfit.products.map((entry) => entry.product.title).join(" / "),
    garmentIds: outfit.products.map((entry) => entry.product.id),
  }));
  if (outfits.length) return outfits;

  const products = result.signaturePieces;
  const categories = ["outerwear", "top", "bottom", "shoes", "jewelry", "bag", "accessory"];
  const garmentIds = categories
    .map((category) => products.find((entry) => entry.intent.category === category)?.product.id)
    .filter((id): id is string => Boolean(id));
  return garmentIds.length ? [{
    id: "look-generated",
    name: "LOOK 01",
    description: products.filter((entry) => garmentIds.includes(entry.product.id)).map((entry) => entry.product.title).join(" / "),
    garmentIds,
  }] : [];
}

export function adaptMusicProfile(result: SoundrobeResult): MusicProfile {
  const weights = result.metadata.diagnostics?.timeWeights ?? { longTerm: 0.5, mediumTerm: 0.3, shortTerm: 0.2 };
  const weightedRanges = [
    { range: result.musicProfile.longTerm, weight: weights.longTerm },
    { range: result.musicProfile.mediumTerm, weight: weights.mediumTerm },
    { range: result.musicProfile.shortTerm, weight: weights.shortTerm },
  ];
  const artistsById = new Map(
    [result.musicProfile.longTerm, result.musicProfile.mediumTerm, result.musicProfile.shortTerm]
      .flatMap((range) => range.artists)
      .map((artist) => [artist.id, artist.name]),
  );
  const artistScores = new Map<string, { name: string; genres: string[]; score: number }>();
  for (const { range, weight } of weightedRanges) {
    for (const artist of range.artists) {
      const current = artistScores.get(artist.id) ?? { name: artist.name, genres: artist.genres, score: 0 };
      current.score += artist.weight * weight;
      if (artist.genres.length > current.genres.length) current.genres = artist.genres;
      artistScores.set(artist.id, current);
    }
  }
  const trackScores = new Map<string, {
    name: string;
    artistIds: string[];
    albumName?: string;
    tags: string[];
    releaseYear?: number;
    imageUrl?: string;
    previewUrl?: string;
    externalUrl?: string;
    score: number;
  }>();
  for (const { range, weight } of weightedRanges) {
    for (const track of range.tracks) {
      const current = trackScores.get(track.id) ?? {
        name: track.name,
        artistIds: track.artistIds,
        albumName: track.albumName,
        tags: track.tags ?? [],
        releaseYear: track.releaseYear,
        imageUrl: track.imageUrl,
        previewUrl: track.previewUrl,
        externalUrl: track.externalUrl,
        score: 0,
      };
      current.score += track.weight * weight;
      if ((track.tags?.length ?? 0) > current.tags.length) current.tags = track.tags ?? [];
      current.imageUrl ??= track.imageUrl;
      current.albumName ??= track.albumName;
      trackScores.set(track.id, current);
    }
  }
  const albumScores = new Map<string, { name: string; imageUrl?: string; artistIds: string[]; score: number }>();
  for (const track of trackScores.values()) {
    if (!track.albumName && !track.imageUrl) continue;
    const key = track.imageUrl ?? track.albumName ?? track.name;
    const current = albumScores.get(key) ?? { name: track.albumName ?? "Unknown album", imageUrl: track.imageUrl, artistIds: track.artistIds, score: 0 };
    current.score += track.score;
    current.imageUrl ??= track.imageUrl;
    current.artistIds = Array.from(new Set([...current.artistIds, ...track.artistIds]));
    albumScores.set(key, current);
  }

  const combinedGenres = result.musicProfile.combinedGenres;
  const moodTags = combinedGenres.filter((genre) => moodTagIds.has(genre.id)).slice(0, 8);
  const musicTags = combinedGenres.filter((genre) => !moodTagIds.has(genre.id)).slice(0, 8);
  const trackTagScores = new Map<string, { name: string; score: number }>();
  for (const track of trackScores.values()) {
    for (const tag of track.tags ?? []) {
      const id = tag.toLowerCase();
      const current = trackTagScores.get(id) ?? { name: tag, score: 0 };
      current.score += track.score;
      trackTagScores.set(id, current);
    }
  }

  return {
    userName: result.user.displayName,
    genres: musicTags.slice(0, 6).map((genre) => ({ name: genre.label, value: genre.weight })),
    eras: result.musicProfile.combinedEras.slice(0, 6).map((era) => ({ name: era.label, value: era.weight })),
    moodTags: moodTags.map((tag) => ({ name: tag.label, value: tag.weight })),
    trackTags: normalizeScores(Array.from(trackTagScores.values())).slice(0, 10).map((tag) => ({ name: tag.name, value: tag.value })),
    artists: normalizeScores(Array.from(artistScores.values()))
      .slice(0, 5)
      .map((artist) => ({ name: artist.name, label: artist.genres.join(" / "), value: artist.value })),
    tracks: normalizeScores(Array.from(trackScores.values()))
      .slice(0, 10)
      .map((track) => ({
      name: track.name,
      artists: track.artistIds.map((id) => artistsById.get(id)).filter((name): name is string => Boolean(name)),
      albumName: track.albumName,
      tags: track.tags ?? [],
      releaseYear: track.releaseYear,
      imageUrl: track.imageUrl,
      previewUrl: track.previewUrl,
      externalUrl: track.externalUrl,
      value: track.value,
    })),
    albums: normalizeScores(Array.from(albumScores.values()))
      .slice(0, 6)
      .map((album) => ({
        name: album.name,
        imageUrl: album.imageUrl,
        artists: album.artistIds.map((id) => artistsById.get(id)).filter((name): name is string => Boolean(name)).slice(0, 3),
        value: album.value,
      })),
    traits: result.styleProfile.traits.slice(0, 6).map((trait) => ({ name: trait.label, value: trait.weight })),
  };
}

function normalizeScores<T extends { score: number }>(items: T[]) {
  const max = Math.max(...items.map((item) => item.score), 1);
  return items
    .map((item) => ({ ...item, value: Math.round((item.score / max) * 100) }))
    .sort((a, b) => b.value - a.value);
}

export function adaptStyleProfile(result: SoundrobeResult): StyleProfile {
  return {
    styleThread: result.styleThread.description,
    palette: result.palette,
    fashionSignals: result.styleProfile.traits.slice(0, 6).map((signal) => ({ name: signal.label, value: signal.weight })),
    signaturePieces: adaptGarments(result).slice(0, 8),
  };
}

export function adaptProvenance(result: SoundrobeResult) {
  const fashionOutputs = new Set(result.styleProfile.traits.map((signal) => signal.id));
  const visibleMusicTags = new Set(result.musicProfile.combinedGenres.slice(0, 6).map((signal) => signal.id));
  const musicDrivers = result.musicProfile.combinedGenres
    .filter((signal) => !fashionOutputs.has(signal.id) && !visibleMusicTags.has(signal.id))
    .slice(0, 4)
    .map((signal) => ({ label: signal.label.toUpperCase(), values: [`${signal.weight}%`] }));
  const eraDrivers = result.musicProfile.combinedEras
    .slice(0, Math.max(0, 5 - musicDrivers.length))
    .map((signal) => ({ label: signal.label.toUpperCase(), values: [`${signal.weight}%`] }));
  return [...musicDrivers, ...eraDrivers];
}
