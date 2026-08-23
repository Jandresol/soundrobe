"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  UserRound,
} from "lucide-react";

import { GarmentCard } from "@/components/ui/GarmentCard";
import { OutfitCanvas } from "@/components/ui/OutfitCanvas";
import { Panel } from "@/components/ui/Panel";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RetroButton } from "@/components/ui/RetroButton";
import { adaptGarments, adaptAllSignatureGarments, adaptMusicProfile, adaptOutfits, adaptStyleProfile, garmentFromRecommendation } from "@/lib/result-adapter";
import type { ProductCandidate, ProductRecommendation } from "@/src/domain/commerce/types";
import { scoreProduct } from "@/src/engine/ranking/scoreProduct";
import { defaultLook as fallbackLook, garments as fallbackGarments, lookPresets as fallbackLooks, musicProfile as fallbackMusicProfile, styleProfile as fallbackStyleProfile } from "@/lib/mock-data";
import type { SoundrobeResult } from "@/src/domain/soundrobe/types";
import type { Category, Garment, Outfit, Screen } from "@/types/soundrobe";

const tabs: Array<{ label: string; value: Screen }> = [
  { label: "PROFILE", value: "profile" },
  { label: "MUSIC DNA", value: "dna" },
  { label: "SOUNDROBE", value: "soundrobe" },
  { label: "LOOKS", value: "looks" },
  { label: "CLOSET", value: "closet" },
];

const categoryTabs: Array<{ label: string; value: Category }> = [
  { label: "TOPS", value: "top" },
  { label: "BOTTOMS", value: "bottom" },
  { label: "DRESSES", value: "dress" },
  { label: "OUTERWEAR", value: "outerwear" },
  { label: "SHOES", value: "shoe" },
  { label: "ACCESSORIES", value: "accessory" },
];

const signatureCategoryOrder: Category[] = ["outerwear", "top", "bottom", "dress", "shoe", "accessory"];
const initialCatalogLimitPerCategory = 120;
const catalogPageLimit = 48;

const analysisSteps = [
  "READING MUSIC PROFILE",
  "MAPPING GENRES",
  "IDENTIFYING ERAS",
  "FINDING YOUR STYLE THREAD",
  "BUILDING WARDROBE",
  "SEARCHING STORES",
  "MATCHING PRODUCTS",
  "ASSEMBLING LOOKS",
];

const defaultTimeWeights = { longTerm: 50, mediumTerm: 30, shortTerm: 20 };
const soundrobeCacheVersion = "v14";
const soundrobeCacheTtlMs = 24 * 60 * 60 * 1000;
const placeholderPalettes: Record<Category, string[]> = {
  top: ["#151821", "#e64aa0", "#ffd3e8"],
  bottom: ["#202020", "#7b6aa8", "#d8dbe2"],
  dress: ["#241627", "#7b6aa8", "#ffd3e8"],
  outerwear: ["#111111", "#641f32", "#b99146"],
  shoe: ["#151821", "#6f7684", "#ffffff"],
  accessory: ["#3a2631", "#b99146", "#ffd3e8"],
};

type CachedSoundrobeResult = {
  cachedAt: number;
  source: "spotify" | "demo";
  userId: string;
  weights: typeof defaultTimeWeights;
  result: SoundrobeResult;
};

function weightsKey(weights: typeof defaultTimeWeights) {
  return `${weights.longTerm}-${weights.mediumTerm}-${weights.shortTerm}`;
}

function cacheIndexKey(source: "spotify" | "demo") {
  return `soundrobe-result:${soundrobeCacheVersion}:${source}:latest`;
}

function cacheResultKey(source: "spotify" | "demo", userId: string, weights: typeof defaultTimeWeights) {
  return `soundrobe-result:${soundrobeCacheVersion}:${source}:${userId}:${weightsKey(weights)}`;
}

function sortByMatchScore(garments: Garment[]) {
  return [...garments].sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
}

const minimumInitialLookMatchByCategory: Record<Category, number> = {
  outerwear: 45,
  top: 60,
  bottom: 42,
  dress: 42,
  shoe: 35,
  accessory: 35,
};

function isStrongInitialLookCandidate(garment: Garment) {
  return (garment.matchScore ?? 0) >= minimumInitialLookMatchByCategory[garment.category];
}

function isStrongSignatureCandidate(garment: Garment) {
  const floor = Math.max(40, minimumInitialLookMatchByCategory[garment.category] - 8);
  return (garment.matchScore ?? 0) >= floor;
}

function filterGarmentsByTag(garments: Garment[], tagId: string | null) {
  if (!tagId) return garments;
  return garments.filter((garment) => garmentMatchesTag(garment, tagId));
}

function normalizeProductCategory(category?: string): Category {
  if (category === "shoes") return "shoe";
  if (category === "bag" || category === "jewelry") return "accessory";
  if (category === "top" || category === "bottom" || category === "dress" || category === "outerwear" || category === "shoe" || category === "accessory") return category;
  return "accessory";
}

function intentMatchesProductCategory(intentCategory: string, productCategory?: string) {
  const normalizedProduct = normalizeProductCategory(productCategory);
  if (normalizedProduct === "shoe") return intentCategory === "shoes";
  if (normalizedProduct === "accessory") return intentCategory === "bag" || intentCategory === "jewelry" || intentCategory === "accessory";
  return intentCategory === normalizedProduct;
}

function intentMatchesUiCategory(intentCategory: string, category: Category) {
  if (category === "shoe") return intentCategory === "shoes";
  if (category === "accessory") return intentCategory === "bag" || intentCategory === "jewelry" || intentCategory === "accessory";
  return intentCategory === category;
}

function garmentTypesForCategory(result: SoundrobeResult | null, category: Category) {
  return Array.from(new Set(
    (result?.garmentIntents ?? [])
      .filter((intent) => intentMatchesUiCategory(intent.category, category))
      .flatMap((intent) => expandGarmentTypeForCatalog(intent.garmentType))
  ));
}

function searchQueriesForCategory(result: SoundrobeResult | null, category: Category) {
  return Array.from(new Set(
    (result?.garmentIntents ?? [])
      .filter((intent) => intentMatchesUiCategory(intent.category, category))
      .map((intent) => intent.searchQuery)
      .filter(Boolean)
  ));
}

function expandGarmentTypeForCatalog(garmentType: string) {
  const normalized = garmentType.toLowerCase();
  const expansions: Record<string, string[]> = {
    "fitted leather jacket": ["fitted leather jacket", "moto jacket", "cropped leather jacket", "distressed leather jacket", "worn leather moto jacket"],
    "cropped leather jacket": ["cropped leather jacket", "moto jacket", "fitted leather jacket", "distressed leather jacket"],
    "worn leather moto jacket": ["worn leather moto jacket", "moto jacket", "distressed leather jacket", "fitted leather jacket"],
    "pointed leather boots": ["pointed leather boots", "knee-high boots", "tall boots", "moto boots", "boots"],
    "moto boots": ["moto boots", "engineer boots", "combat boots", "knee-high boots", "boots"],
    "engineer boots": ["engineer boots", "moto boots", "combat boots", "boots"],
    "statement flared trouser": ["statement flared trouser", "wide-leg trouser", "flare jeans", "bell bottoms"],
    "detailed tailored trouser": ["detailed tailored trouser", "tailored trouser", "wide-leg trouser"],
    "satin cowl top": ["satin cowl top", "cowl top", "draped top", "satin blouse", "silk cami"],
    "asymmetric fitted top": ["asymmetric fitted top", "asymmetric top", "corset-detail top", "mesh long sleeve"],
    "distressed fitted graphic tee": ["distressed fitted graphic tee", "graphic baby tee", "goth baby tee", "tattoo graphic baby tee", "band tee"],
    "sculptural gold earrings": ["sculptural gold earrings", "gold hoops", "gold jewelry", "statement jewelry"],
    "statement belt": ["statement belt", "studded belt", "grommet belt", "leather belt"],
    "unusual leather bag": ["unusual leather bag", "compact shoulder bag", "slouchy leather bag", "hardware shoulder bag"],
  };
  return expansions[normalized] ?? [garmentType];
}

function catalogIntentSignature(result: SoundrobeResult) {
  return result.garmentIntents
    .map((intent) => `${intent.category}:${intent.garmentType}`)
    .join("|");
}

function scoreCatalogProducts(products: ProductCandidate[], result: SoundrobeResult | null) {
  if (!result) return [] as Garment[];
  const recommendations = new Map<string, ProductRecommendation>();

  for (const product of products) {
    const stableProductId = stableCatalogProductId(product);
    for (const intent of result.garmentIntents) {
      if (!intentMatchesProductCategory(intent.category, product.attributes.category)) continue;
      const productForIntent: ProductCandidate = {
        ...product,
        id: stableProductId,
        attributes: {
          ...product.attributes,
          category: intent.category,
        },
      };
      const scored = scoreProduct(productForIntent, intent, result.metadata.shoppingPreferences);
      const previous = recommendations.get(stableProductId);
      if (!previous || scored.score > previous.score) {
        recommendations.set(stableProductId, {
          product: productForIntent,
          intent,
          score: scored.score,
          reasons: scored.reasons,
        });
      }
    }
  }

  return sortByMatchScore(
    Array.from(recommendations.values())
      .filter((recommendation) => recommendation.score > 0)
      .map(garmentFromRecommendation)
  );
}

function stableCatalogProductId(product: ProductCandidate) {
  const source = product.productUrl || `${product.retailer}:${product.title}:${product.price ?? ""}`;
  return `${product.id}-${hashString(source)}`;
}

function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function buildLookGarmentsFromRankedCatalog(ranked: Garment[]) {
  const categoryOrder: Category[] = ["outerwear", "top", "bottom", "dress", "shoe", "accessory"];
  const selected: Garment[] = [];

  for (const category of categoryOrder) {
    const garment = ranked.find((candidate) =>
      candidate.category === category &&
      isStrongInitialLookCandidate(candidate) &&
      !selected.some((item) => item.id === candidate.id)
    );
    if (garment) selected.push(garment);
  }

  return selected.slice(0, 5);
}

function placeholderBackground(category: Category) {
  const colors = placeholderPalettes[category];
  return `
    radial-gradient(circle at 18% 18%, rgba(255,255,255,0.38) 0 2px, transparent 2px 8px),
    linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 56%, ${colors[2]} 100%)
  `;
}

function buildRecommendationBubbles(garments: Garment[]) {
  const counts = new Map<string, number>();
  const add = (prefix: string, values?: string[]) => {
    for (const value of values ?? []) {
      const normalized = value.toLowerCase().trim();
      if (!normalized) continue;
      counts.set(`${prefix}:${normalized}`, (counts.get(`${prefix}:${normalized}`) ?? 0) + 1);
    }
  };

  for (const garment of garments) {
    add("color", garment.colors);
    add("material", garment.materials);
    add("style", garment.aesthetics);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => {
      const [kind, value] = id.split(":");
      return { id, label: bubbleLabel(kind, value), count };
    });
}

function bubbleLabel(kind: string, value: string) {
  if (kind === "color") return `more ${value}`;
  if (kind === "material") return `more ${value}`;
  return `more ${value}`;
}

function garmentMatchesTag(garment: Garment, tagId: string) {
  const [, value] = tagId.split(":");
  const tags = [
    ...(garment.colors ?? []),
    ...(garment.materials ?? []),
    ...(garment.aesthetics ?? []),
    garment.garmentType,
  ].filter((tag): tag is string => Boolean(tag)).map((tag) => tag.toLowerCase());
  return tags.includes(value);
}

function recommendationTagForGarment(garment: Garment) {
  const tag =
    garment.aesthetics?.[0] ? `style:${garment.aesthetics[0].toLowerCase()}` :
    garment.colors?.[0] ? `color:${garment.colors[0].toLowerCase()}` :
    garment.materials?.[0] ? `material:${garment.materials[0].toLowerCase()}` :
    null;
  return tag;
}

function readCachedSoundrobe(source: "spotify" | "demo", weights: typeof defaultTimeWeights) {
  if (typeof window === "undefined") return null;
  try {
    const latestKey = window.localStorage.getItem(cacheIndexKey(source));
    if (!latestKey) return null;
    const cached = JSON.parse(window.localStorage.getItem(latestKey) ?? "null") as CachedSoundrobeResult | null;
    if (!cached || cached.source !== source || weightsKey(cached.weights) !== weightsKey(weights)) return null;
    if (Date.now() - cached.cachedAt > soundrobeCacheTtlMs) return null;
    return cached.result;
  } catch {
    return null;
  }
}

function compactCachedSoundrobeResult(result: SoundrobeResult): SoundrobeResult {
  const compactRange = (range: SoundrobeResult["musicProfile"]["shortTerm"]) => ({
    artists: range.artists.slice(0, 30).map((artist) => ({
      ...artist,
      genres: artist.genres.slice(0, 12),
    })),
    tracks: range.tracks.slice(0, 20).map((track) => ({
      ...track,
      tags: track.tags?.slice(0, 12),
    })),
    genres: range.genres.slice(0, 30),
    eras: range.eras.slice(0, 12),
  });

  return {
    ...result,
    musicProfile: {
      ...result.musicProfile,
      shortTerm: compactRange(result.musicProfile.shortTerm),
      mediumTerm: compactRange(result.musicProfile.mediumTerm),
      longTerm: compactRange(result.musicProfile.longTerm),
      combinedGenres: result.musicProfile.combinedGenres.slice(0, 40),
      combinedEras: result.musicProfile.combinedEras.slice(0, 12),
    },
    styleProfile: {
      ...result.styleProfile,
      traits: result.styleProfile.traits.slice(0, 20),
      colors: result.styleProfile.colors.slice(0, 20),
      materials: result.styleProfile.materials.slice(0, 20),
      silhouettes: result.styleProfile.silhouettes.slice(0, 20),
      garmentTypes: result.styleProfile.garmentTypes.slice(0, 30),
      accessories: result.styleProfile.accessories.slice(0, 20),
      aesthetics: result.styleProfile.aesthetics.slice(0, 20),
      sourcesBySignal: {},
    },
    signaturePieces: result.signaturePieces.slice(0, 8),
    outfits: result.outfits.slice(0, 3),
    metadata: {
      ...result.metadata,
      diagnostics: result.metadata.diagnostics ? {
        combinedGenreCount: result.metadata.diagnostics.combinedGenreCount,
        artistGenreCount: result.metadata.diagnostics.artistGenreCount,
        timeWeights: result.metadata.diagnostics.timeWeights,
      } : undefined,
    },
  };
}

function clearSoundrobeResultCache() {
  if (typeof window === "undefined") return;
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("soundrobe-result:")) {
      window.localStorage.removeItem(key);
    }
  }
}

function writeCachedSoundrobe(result: SoundrobeResult, weights: typeof defaultTimeWeights) {
  if (typeof window === "undefined") return;
  const source = result.metadata.musicSource;
  const key = cacheResultKey(source, result.user.id, weights);
  const payload: CachedSoundrobeResult = {
    cachedAt: Date.now(),
    source,
    userId: result.user.id,
    weights,
    result: compactCachedSoundrobeResult(result),
  };
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
    window.localStorage.setItem(cacheIndexKey(source), key);
  } catch (error) {
    if (error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
      try {
        clearSoundrobeResultCache();
        window.localStorage.setItem(key, JSON.stringify(payload));
        window.localStorage.setItem(cacheIndexKey(source), key);
      } catch {
        clearSoundrobeResultCache();
      }
      return;
    }
    throw error;
  }
}

const reasonSourceLabels: Record<string, string> = {
  "garment type": "Garment type matched",
  color: "Color matched",
  material: "Material matched",
  silhouette: "Silhouette matched",
  aesthetic: "Style mood matched",
  era: "Era matched",
  "style engine": "Music priority",
  commerce: "Available now",
  "shopping preferences": "Budget fit",
};

function formatMatchReason(reason: { signal: string; source: string; contribution: number }) {
  const label = reasonSourceLabels[reason.source] ?? reason.source;
  if (reason.source === "commerce") return { label, detail: reason.signal.replaceAll("_", " ") };
  if (reason.source === "style engine") return { label, detail: "strong source signal" };
  if (reason.source === "shopping preferences") return { label, detail: reason.signal };
  return { label, detail: reason.signal };
}

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [soundrobeResult, setSoundrobeResult] = useState<SoundrobeResult | null>(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyMessage, setSpotifyMessage] = useState("Connect to Spotify");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [analysisMusicSource, setAnalysisMusicSource] = useState<"spotify" | "demo">("demo");
  const [timeWeights, setTimeWeights] = useState(defaultTimeWeights);
  const [analysisIndex, setAnalysisIndex] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(12);
  const [selectedCategory, setSelectedCategory] = useState<Category>("top");
  const [selectedSlotCategory, setSelectedSlotCategory] = useState<string>("outerwear");
  const [currentLook, setCurrentLook] = useState(fallbackLook);
  const [selectedGarmentId, setSelectedGarmentId] = useState<string>(fallbackLook.garmentIds[0]);
  const [nowPlayingIndex, setNowPlayingIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("soundrobe-profile-image");
  });
  const [pixelatedProfileImage, setPixelatedProfileImage] = useState<string | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("soundrobe-profile-name") ?? "";
  });
  const [profilePixelation, setProfilePixelation] = useState<number>(() => {
    if (typeof window === "undefined") return 55;
    const saved = Number(window.localStorage.getItem("soundrobe-profile-pixelation"));
    return Number.isFinite(saved) ? saved : 55;
  });
  const [savedGarments, setSavedGarments] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const savedPieces = window.localStorage.getItem("soundrobe-saved-garments");
    return savedPieces ? JSON.parse(savedPieces) as string[] : [];
  });
  const [savedLooks, setSavedLooks] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const savedOutfits = window.localStorage.getItem("soundrobe-saved-looks");
    return savedOutfits ? JSON.parse(savedOutfits) as string[] : [];
  });
  const [savedLookNames, setSavedLookNames] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const names = window.localStorage.getItem("soundrobe-saved-look-names");
    return names ? JSON.parse(names) as Record<string, string> : {};
  });
  const [whyThisGarmentId, setWhyThisGarmentId] = useState<string | null>(null);
  const [dismissedGarmentIds, setDismissedGarmentIds] = useState<string[]>([]);
  const [, setFeedbackReasons] = useState<Record<string, string>>({});
  const [catalogProducts, setCatalogProducts] = useState<ProductCandidate[]>([]);
  const [catalogLoadedForUser, setCatalogLoadedForUser] = useState<string | null>(null);
  const [catalogOffsets, setCatalogOffsets] = useState<Record<Category, number>>({ top: 0, bottom: 0, dress: 0, outerwear: 0, shoe: 0, accessory: 0 });
  const [activeProductTag, setActiveProductTag] = useState<string | null>(null);
  const [signatureSlotByCategory, setSignatureSlotByCategory] = useState<Partial<Record<Category, string>>>({});
  const [hiddenSignatureCategories, setHiddenSignatureCategories] = useState<Category[]>([]);
  const [isRebuildingMix, setIsRebuildingMix] = useState(false);

const generatedGarments = useMemo(
  () => soundrobeResult ? adaptGarments(soundrobeResult) : [],
  [soundrobeResult]
);

const catalogGarments = useMemo(
  () => scoreCatalogProducts(catalogProducts, soundrobeResult),
  [catalogProducts, soundrobeResult]
);

const garments = useMemo(() => {
  const source =
    catalogGarments.length > 0
      ? catalogGarments
      : generatedGarments.length > 0
        ? generatedGarments
        : fallbackGarments;

  const dismissed = new Set(dismissedGarmentIds);

  return sortByMatchScore(
    source.filter((garment) => !dismissed.has(garment.id))
  );
}, [catalogGarments, generatedGarments, dismissedGarmentIds]);

  const lookPresets = useMemo(() => soundrobeResult ? adaptOutfits(soundrobeResult) : fallbackLooks, [soundrobeResult]);
  const defaultLook = lookPresets[0] ?? fallbackLook;
  const musicProfile = useMemo(() => soundrobeResult ? adaptMusicProfile(soundrobeResult) : fallbackMusicProfile, [soundrobeResult]);
  const styleProfile = useMemo(() => soundrobeResult ? adaptStyleProfile(soundrobeResult) : fallbackStyleProfile, [soundrobeResult]);
  const rawSignatureGarments = useMemo(() => {
  if (catalogGarments.length > 0) {
    return sortByMatchScore(catalogGarments);
  }

  if (soundrobeResult) {
    return adaptAllSignatureGarments(soundrobeResult);
  }

  return sortByMatchScore(fallbackGarments);
  }, [catalogGarments, soundrobeResult]);

  const allSignatureGarments = useMemo(() => {
    const dismissed = new Set(dismissedGarmentIds);
    return rawSignatureGarments.filter((garment) => !dismissed.has(garment.id));
  }, [rawSignatureGarments, dismissedGarmentIds]);
  const signatureGarments = useMemo(() => {
    const hidden = new Set(hiddenSignatureCategories);
    const eligibleSignatureGarments = allSignatureGarments.filter(isStrongSignatureCandidate);
    const topMatch = eligibleSignatureGarments.find((garment) => !hidden.has(garment.category));
    const categoryCoverage = signatureCategoryOrder
      .filter((category) => !hidden.has(category))
      .map((category) => {
        const slotId = signatureSlotByCategory[category];
        if (slotId) {
          const slotted = eligibleSignatureGarments.find((entry) => entry.id === slotId)
            ?? garments.find((entry) => entry.id === slotId);
          if (slotted && isStrongSignatureCandidate(slotted)) return slotted;
        }
        return eligibleSignatureGarments.find((entry) => entry.category === category);
      })
      .filter((garment): garment is Garment => Boolean(garment));
    const byId = new Map<string, Garment>();
    if (topMatch) byId.set(topMatch.id, topMatch);
    for (const garment of categoryCoverage) byId.set(garment.id, garment);
    return Array.from(byId.values());
  }, [allSignatureGarments, garments, hiddenSignatureCategories, signatureSlotByCategory]);
  const wardrobeByCategory = useMemo(() => {
    const grouped = new Map<Category, Garment[]>();
    for (const tab of categoryTabs) {
      grouped.set(tab.value, sortByMatchScore(garments.filter((garment) => garment.category === tab.value)));
    }
    return grouped;
  }, [garments]);
  const visibleProfileName = profileDisplayName.trim() || (soundrobeResult ? musicProfile.userName : "Your Soundrobe");
  const appliedTimeWeights = soundrobeResult?.metadata.diagnostics?.timeWeights ?? { longTerm: 0.5, mediumTerm: 0.3, shortTerm: 0.2 };
  const displayedAppliedWeights = {
    longTerm: Math.round(appliedTimeWeights.longTerm * 100),
    mediumTerm: Math.round(appliedTimeWeights.mediumTerm * 100),
    shortTerm: Math.round(appliedTimeWeights.shortTerm * 100),
  };
  const hasUnappliedMix =
    timeWeights.longTerm !== displayedAppliedWeights.longTerm ||
    timeWeights.mediumTerm !== displayedAppliedWeights.mediumTerm ||
    timeWeights.shortTerm !== displayedAppliedWeights.shortTerm;
  const modalGarment = garments.find((garment) => garment.id === whyThisGarmentId) ?? null;
  const hasGenreData = musicProfile.genres.some((genre) => genre.value > 0);
  const topGenreLine = hasGenreData ? musicProfile.genres.slice(0, 4).map((genre) => genre.name).join(" / ") : "No music tags returned";
  const topArtistLine = musicProfile.artists.slice(0, 4).map((artist) => artist.name).join(" / ");
  const sourceDrivers = [
    ...musicProfile.trackTags.filter((tag) => !musicProfile.genres.some((genre) => genre.name.toLowerCase() === tag.name.toLowerCase())),
    ...musicProfile.eras.slice(0, 2),
  ].slice(0, 5);
  const nowPlaying = useMemo(() => {
    const track = musicProfile.tracks[nowPlayingIndex % Math.max(musicProfile.tracks.length, 1)];
    const genreLine = `${musicProfile.genres.slice(0, 4).map((genre) => genre.name).join(" // ")} //`;
    if (!track) {
      return { title: genreLine, detail: "Top genre mix", progress: 62, imageUrl: undefined, previewUrl: undefined, externalUrl: undefined };
    }
    const artistLine = track.artists.length ? track.artists.join(" / ") : "Top track";
    const progressSeed = Array.from(track.name).reduce((total, char) => total + char.charCodeAt(0), 0);
    return {
      title: `${track.name} //`,
      detail: `${artistLine}${track.releaseYear ? ` // ${track.releaseYear}` : ""}`,
      progress: 34 + (progressSeed % 42),
      imageUrl: track.imageUrl,
      previewUrl: track.previewUrl,
      externalUrl: track.externalUrl,
    };
  }, [musicProfile, nowPlayingIndex]);

  const displayedCurrentLook = useMemo(() => {
    if (!soundrobeResult || catalogGarments.length === 0) return currentLook;
    const resolved = currentLook.garmentIds
      .map((id) => garments.find((garment) => garment.id === id))
      .filter((garment): garment is Garment => Boolean(garment));
    const kept = resolved.filter(isStrongInitialLookCandidate);
    const byCategory = new Map<Category, Garment>();
    for (const garment of buildLookGarmentsFromRankedCatalog(garments)) {
      byCategory.set(garment.category, garment);
    }
    for (const garment of kept) {
      byCategory.set(garment.category, garment);
    }
    const garmentIds = (["outerwear", "dress", "top", "bottom", "shoe", "accessory"] as Category[])
      .map((category) => byCategory.get(category))
      .filter((garment): garment is Garment => Boolean(garment))
      .slice(0, 5)
      .map((garment) => garment.id);
    return { ...currentLook, garmentIds, description: "" };
  }, [catalogGarments.length, currentLook, garments, soundrobeResult]);

  const currentLookGarments = useMemo(() => {
    const slotOrder: Array<Category> = ["outerwear", "dress", "top", "bottom", "shoe", "accessory"];
    const byCategory = new Map<Category, Garment>();
    for (const id of displayedCurrentLook.garmentIds) {
      const garment = garments.find((item) => item.id === id);
      if (garment) byCategory.set(garment.category, garment);
    }
    return slotOrder.map((category) => byCategory.get(category)).filter((garment): garment is Garment => Boolean(garment));
  }, [displayedCurrentLook, garments]);
  const selectedCategoryGarments = useMemo(
    () => wardrobeByCategory.get(selectedCategory) ?? [],
    [wardrobeByCategory, selectedCategory],
  );
  const selectedCategoryFilteredGarments = useMemo(
    () => filterGarmentsByTag(selectedCategoryGarments, activeProductTag),
    [activeProductTag, selectedCategoryGarments],
  );
  const recommendationBubbles = useMemo(
    () => buildRecommendationBubbles(selectedCategoryGarments),
    [selectedCategoryGarments],
  );
  const normalizedSelectedCategory = selectedSlotCategory === "shoes" ? "shoe" : selectedSlotCategory;
  const handleSetNowPlayingIndex = useCallback((index: number) => {
    audioRef.current?.pause();
    setIsPreviewPlaying(false);
    setNowPlayingIndex(index);
  }, []);

  const applySoundrobeResult = useCallback((result: SoundrobeResult, message?: string) => {
    const nextLooks = adaptOutfits(result);
    const nextGarments = adaptGarments(result);
    const rankedCatalogGarments = scoreCatalogProducts(catalogProducts, result);
    const lookGarments = rankedCatalogGarments.length ? buildLookGarmentsFromRankedCatalog(rankedCatalogGarments) : [];
    const generatedLook = lookGarments.length
      ? { id: `catalog-look-${result.user.id}-${Date.now()}`, name: "YOUR SOUNDROBE", garmentIds: lookGarments.map((garment) => garment.id), description: "" }
      : nextLooks[0] ?? { ...fallbackLook, id: "look-generated-empty", garmentIds: nextGarments.slice(0, 5).map((garment) => garment.id) };
    setFlowError(null);
    setSoundrobeResult(result);
    handleSetNowPlayingIndex(0);
    setSpotifyConnected(result.metadata.musicSource === "spotify");
    setSpotifyMessage(message ?? (result.metadata.musicSource === "spotify" ? "Using Spotify music profile" : "Using demo music profile"));
    setCurrentLook(generatedLook);
    setSelectedGarmentId(generatedLook.garmentIds[0] ?? nextGarments[0]?.id ?? fallbackLook.garmentIds[0]);
    setSelectedCategory("top");
    setSelectedSlotCategory("outerwear");
    setDismissedGarmentIds([]);
    setSignatureSlotByCategory({});
    setHiddenSignatureCategories([]);
    setActiveProductTag(null);
  }, [catalogProducts, handleSetNowPlayingIndex]);

  
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("soundrobe-saved-garments", JSON.stringify(savedGarments));
  }, [savedGarments]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("soundrobe-saved-looks", JSON.stringify(savedLooks));
  }, [savedLooks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("soundrobe-saved-look-names", JSON.stringify(savedLookNames));
  }, [savedLookNames]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (profileImage) window.localStorage.setItem("soundrobe-profile-image", profileImage);
    else window.localStorage.removeItem("soundrobe-profile-image");
  }, [profileImage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (profileDisplayName.trim()) window.localStorage.setItem("soundrobe-profile-name", profileDisplayName);
    else window.localStorage.removeItem("soundrobe-profile-name");
  }, [profileDisplayName]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("soundrobe-profile-pixelation", String(profilePixelation));
  }, [profilePixelation]);

  useEffect(() => {
    if (!profileImage) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      const smallCanvas = document.createElement("canvas");
      const size = 240;
      const pixelSize = Math.max(12, Math.round(size - (profilePixelation / 100) * 212));
      canvas.width = size;
      canvas.height = size;
      smallCanvas.width = pixelSize;
      smallCanvas.height = pixelSize;
      const context = canvas.getContext("2d");
      const smallContext = smallCanvas.getContext("2d");
      if (!context || !smallContext) return;

      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - sourceSize) / 2;
      const sourceY = (image.naturalHeight - sourceSize) / 2;
      smallContext.imageSmoothingEnabled = false;
      smallContext.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, pixelSize, pixelSize);
      context.imageSmoothingEnabled = false;
      context.drawImage(smallCanvas, 0, 0, size, size);
      setPixelatedProfileImage(canvas.toDataURL("image/png"));
    };
    image.src = profileImage;

    return () => {
      cancelled = true;
    };
  }, [profileImage, profilePixelation]);

  useEffect(() => {
    let cancelled = false;
    const searchParams = new URLSearchParams(window.location.search);
    const pendingAnalysis = window.sessionStorage.getItem("soundrobe-run-analysis");
    const shouldRunSpotify = searchParams.get("run") === "spotify" || searchParams.get("spotify") === "connected" || pendingAnalysis === "spotify";
    if (searchParams.get("run") === "spotify" || searchParams.get("spotify") === "connected") {
      window.history.replaceState({}, "", window.location.pathname);
      window.setTimeout(() => {
        if (!cancelled) {
          setAnalysisMusicSource("spotify");
          setSpotifyMessage("Spotify connected. Building your Soundrobe...");
          setScreen("analysis");
        }
      }, 0);
    } else if (pendingAnalysis === "spotify") {
      window.sessionStorage.removeItem("soundrobe-run-analysis");
      window.setTimeout(() => {
        if (!cancelled) {
          setAnalysisMusicSource("spotify");
          setSpotifyMessage("Spotify connected. Building your Soundrobe...");
          setScreen("analysis");
        }
      }, 0);
    } else if (searchParams.get("spotify") === "error") {
      window.history.replaceState({}, "", window.location.pathname);
      window.setTimeout(() => {
        if (!cancelled) setSpotifyMessage("Spotify did not connect. Demo music is still available.");
      }, 0);
    } else if (searchParams.get("spotify") === "missing-config") {
      window.history.replaceState({}, "", window.location.pathname);
      window.setTimeout(() => {
        if (!cancelled) setSpotifyMessage("Spotify keys are missing. Add them to .env.local and restart dev.");
      }, 0);
    }
    fetch("/api/music/spotify/status", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ connected: boolean }>)
      .then((status) => {
        if (!cancelled) {
          setSpotifyConnected(status.connected);
          if (status.connected && !shouldRunSpotify) setSpotifyMessage("Spotify connected");
        }
      })
      .catch(() => {
        if (!cancelled) setSpotifyConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (screen !== "analysis") return;

    let cancelled = false;
    const run = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (cancelled) return;
        setAnalysisIndex(0);
        setAnalysisProgress(12);
        for (let index = 0; index < analysisSteps.length - 1; index += 1) {
          if (cancelled) return;
          setAnalysisIndex(index);
          setAnalysisProgress(Math.round(((index + 1) / analysisSteps.length) * 100));
          await new Promise((resolve) => setTimeout(resolve, 120));
        }

        const cachedResult = readCachedSoundrobe(analysisMusicSource, timeWeights);
        if (cachedResult) {
          if (cancelled) return;
          applySoundrobeResult(cachedResult, `Loaded cached ${analysisMusicSource === "spotify" ? "Spotify" : "demo"} Soundrobe`);
          setAnalysisIndex(analysisSteps.length - 1);
          setAnalysisProgress(100);
          setScreen("dna");
          return;
        }

        const params = new URLSearchParams({
          music: analysisMusicSource,
          longTerm: String(timeWeights.longTerm),
          mediumTerm: String(timeWeights.mediumTerm),
          shortTerm: String(timeWeights.shortTerm),
        });
        const response = await fetch(`/api/soundrobe?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) {
          const payload = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(payload?.error ?? `Soundrobe request failed: ${response.status}`);
        }
        const result = await response.json() as SoundrobeResult;
        if (cancelled) return;
        writeCachedSoundrobe(result, timeWeights);
        applySoundrobeResult(result);
        setAnalysisIndex(analysisSteps.length - 1);
        setAnalysisProgress(100);
        setScreen("soundrobe");
      } catch (error) {
        if (!cancelled) {
          setSpotifyConnected(false);
          const message = error instanceof Error ? error.message : "Could not build your Soundrobe. Try again.";
          setFlowError(message);
          setSpotifyMessage(message);
          setScreen("home");
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [analysisMusicSource, applySoundrobeResult, screen, timeWeights]);

  const handleEnterSoundrobe = () => {
    setFlowError(null);
    setAnalysisMusicSource("spotify");
    setScreen("analysis");
  };

  const handleTabChange = (nextScreen: Screen) => {
    const needsResult = ["dna", "soundrobe", "looks", "closet", "profile"].includes(nextScreen);
    if (needsResult && !soundrobeResult) {
      setFlowError("Build a Soundrobe first, then those tabs unlock.");
      setScreen("home");
      return;
    }
    setFlowError(null);
    setScreen(nextScreen);
  };

  const updateTimeWeight = (key: "longTerm" | "mediumTerm" | "shortTerm", value: number) => {
    setTimeWeights((previous) => ({ ...previous, [key]: value }));
  };

  const handleRegenerateWithWeights = async () => {
    if (!soundrobeResult) {
      setAnalysisMusicSource(analysisMusicSource);
      setScreen("analysis");
      return;
    }
    if (isRebuildingMix) return;

    try {
      setIsRebuildingMix(true);
      setFlowError(null);
      setSpotifyMessage("Rebuilding fashion mix from cached music...");
      const response = await fetch("/api/soundrobe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          musicProfile: soundrobeResult.musicProfile,
          musicSource: soundrobeResult.metadata.musicSource,
          timeWeights: {
            longTerm: timeWeights.longTerm,
            mediumTerm: timeWeights.mediumTerm,
            shortTerm: timeWeights.shortTerm,
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? `Soundrobe rebuild failed: ${response.status}`);
      }
      const result = await response.json() as SoundrobeResult;
      writeCachedSoundrobe(result, timeWeights);
      applySoundrobeResult(result, "Fashion mix rebuilt from cached music");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not rebuild fashion mix";
      setSpotifyMessage(message);
      setFlowError(message);
    } finally {
      setIsRebuildingMix(false);
    }
  };

  const setWeightPreset = (preset: "core" | "balanced" | "current") => {
    const presets = {
      core: { longTerm: 70, mediumTerm: 20, shortTerm: 10 },
      balanced: { longTerm: 40, mediumTerm: 35, shortTerm: 25 },
      current: { longTerm: 20, mediumTerm: 30, shortTerm: 50 },
    };
    setTimeWeights(presets[preset]);
  };

  const handleSpotifyConnect = () => {
    window.location.assign(new URL("/api/music/spotify/login", window.location.origin).toString());
  };

  const handleProfileImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setProfileImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setScreen("home");
    setFlowError(null);
    setCurrentLook(defaultLook);
    setSelectedCategory("top");
    setSelectedSlotCategory("outerwear");
    setSelectedGarmentId(defaultLook.garmentIds[0]);
    handleSetNowPlayingIndex(0);
    setAnalysisProgress(12);
    setAnalysisIndex(0);
  };

  const toggleCurrentLookGarment = (garment: Garment) => {
    setSelectedCategory(garment.category);
    setSelectedSlotCategory(garment.category);
    setCurrentLook((previous) => {
      const resolveGarment = (id: string) => garments.find((item) => item.id === id) ?? allSignatureGarments.find((item) => item.id === id);
      if (previous.garmentIds.includes(garment.id)) {
        return { ...previous, garmentIds: previous.garmentIds.filter((id) => id !== garment.id), description: "" };
      }
      const withoutSameCategory = previous.garmentIds.filter((id) => resolveGarment(id)?.category !== garment.category);
      return { ...previous, garmentIds: [...withoutSameCategory, garment.id], description: "" };
    });
    setSelectedGarmentId(garment.id);
  };

  const removeCurrentLookGarment = (garmentId: string) => {
    setCurrentLook((previous) => ({ ...previous, garmentIds: previous.garmentIds.filter((id) => id !== garmentId) }));
    setSelectedGarmentId((current) => (current === garmentId ? "" : current));
  };

  const pickNextGarment = (
    pool: Garment[],
    currentGarmentId: string | undefined,
    occupiedIds: Set<string>,
  ) => {
    const currentIndex = currentGarmentId
      ? Math.max(0, pool.findIndex((garment) => garment.id === currentGarmentId))
      : -1;
    return pool.find((garment, index) => index > currentIndex && !occupiedIds.has(garment.id))
      ?? pool.find((garment) => !occupiedIds.has(garment.id))
      ?? (currentIndex >= 0 ? pool[(currentIndex + 1) % pool.length] : pool[0]);
  };

  const cycleCurrentLookCategory = (category: Category, currentGarmentId?: string) => {
    setSelectedCategory(category);
    setSelectedSlotCategory(category);
    setActiveProductTag(null);
    const categoryPool = wardrobeByCategory.get(category) ?? [];
    if (!categoryPool.length) return;

    setCurrentLook((previous) => {
      const occupied = new Set(previous.garmentIds);
      if (currentGarmentId) occupied.delete(currentGarmentId);
      const next = pickNextGarment(categoryPool, currentGarmentId, occupied);
      if (!next) return previous;
      setSelectedGarmentId(next.id);

      if (currentGarmentId && previous.garmentIds.includes(currentGarmentId)) {
        const withoutDuplicate = previous.garmentIds.filter((id) => id !== next.id || id === currentGarmentId);
        return {
          ...previous,
          garmentIds: withoutDuplicate.map((id) => (id === currentGarmentId ? next.id : id)),
          description: "",
        };
      }

      const existingSameCategory = previous.garmentIds.find((id) => {
        const garment = garments.find((item) => item.id === id);
        return garment?.category === category;
      });

      if (existingSameCategory) {
        return {
          ...previous,
          garmentIds: previous.garmentIds.map((id) => (id === existingSameCategory ? next.id : id)),
          description: "",
        };
      }

      return { ...previous, garmentIds: [...previous.garmentIds, next.id], description: "" };
    });
  };

  const fetchCatalogOptions = async (category: Category) => {
    const offset = catalogOffsets[category] ?? 0;
    const params = new URLSearchParams({
      category,
      offset: String(offset),
      limit: String(catalogPageLimit),
    });
    const queries = searchQueriesForCategory(soundrobeResult, category);
    if (queries.length) params.set("queries", queries.join(","));
    const garmentTypes = garmentTypesForCategory(soundrobeResult, category);
    if (garmentTypes.length) params.set("garmentTypes", garmentTypes.join(","));
    const response = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) return [] as Garment[];
    const payload = await response.json() as { products?: ProductCandidate[] };
    const nextProducts = payload.products ?? [];
    const nextGarments = scoreCatalogProducts(nextProducts, soundrobeResult).filter((garment) => garment.category === category);
    setCatalogOffsets((previous) => ({ ...previous, [category]: offset + nextProducts.length }));
    setCatalogProducts((previous) => {
      const byId = new Map(previous.map((product) => [stableCatalogProductId(product), product]));
      for (const product of nextProducts) byId.set(stableCatalogProductId(product), product);
      return Array.from(byId.values());
    });
    return nextGarments;
  };

  const loadMoreCategoryOptions = async (category: Category) => {
    setSelectedCategory(category);
    setSelectedSlotCategory(category);
    const fetched = await fetchCatalogOptions(category);
    const newest = fetched.find((garment) => garment.category === category);
    if (newest) setSelectedGarmentId(newest.id);
  };

  const handleFindNextSignatureOption = (garment: Garment) => {
    const category = garment.category;
    const pool = sortByMatchScore(allSignatureGarments.filter((entry) => entry.category === category));
    if (pool.length <= 1) return;

    const currentId = signatureSlotByCategory[category] ?? garment.id;
    const currentIndex = pool.findIndex((entry) => entry.id === currentId);
    const next = pool.find((entry, index) => index > currentIndex)
      ?? pool.find((entry) => entry.id !== currentId);
    if (!next || next.id === currentId) return;

    setSignatureSlotByCategory((previous) => ({ ...previous, [category]: next.id }));
    setSelectedCategory(category);
    setSelectedSlotCategory(category);
    setSelectedGarmentId(next.id);
    setCurrentLook((previous) => {
      const resolveGarment = (id: string) => garments.find((item) => item.id === id) ?? allSignatureGarments.find((item) => item.id === id);
      const hasCategoryInLook = previous.garmentIds.some((id) => resolveGarment(id)?.category === category);
      if (!hasCategoryInLook) return previous;
      const withoutCategory = previous.garmentIds.filter((id) => resolveGarment(id)?.category !== category);
      return { ...previous, garmentIds: [...withoutCategory, next.id], description: "" };
    });
  };

  const handleSaveGarment = (garment: Garment) => {
    setDismissedGarmentIds((previous) => previous.filter((id) => id !== garment.id));
    setSavedGarments((previous) => (previous.includes(garment.id) ? previous : [...previous, garment.id]));
    setSelectedGarmentId(garment.id);
  };

  const handleMoreLikeThis = (garment: Garment) => {
    const tag = recommendationTagForGarment(garment);
    setSelectedCategory(garment.category);
    setSelectedSlotCategory(garment.category);
    if (tag) setActiveProductTag(tag);
    setDismissedGarmentIds((previous) => previous.filter((id) => id !== garment.id));
    setSelectedGarmentId(garment.id);
    setCurrentLook((previous) => {
      if (previous.garmentIds.includes(garment.id)) return previous;
      const withoutSameCategory = previous.garmentIds.filter((id) => {
        const existing = garments.find((item) => item.id === id);
        return existing?.category !== garment.category;
      });
      return { ...previous, garmentIds: [...withoutSameCategory, garment.id], description: "" };
    });
  };

  const handleDismissSignatureGarment = (garment: Garment, reason?: string) => {
    if (reason && reason !== "Skip") setFeedbackReasons((previous) => ({ ...previous, [garment.id]: reason }));
    const category = garment.category;
    const nextDismissed = dismissedGarmentIds.includes(garment.id)
      ? dismissedGarmentIds
      : [...dismissedGarmentIds, garment.id];
    const nextPool = sortByMatchScore(
      rawSignatureGarments.filter((entry) => entry.category === category && !nextDismissed.includes(entry.id)),
    );

    setDismissedGarmentIds(nextDismissed);
    setSavedGarments((previous) => previous.filter((id) => id !== garment.id));
    setCurrentLook((previous) => {
      const resolveGarment = (id: string) => garments.find((item) => item.id === id) ?? rawSignatureGarments.find((item) => item.id === id);
      return {
        ...previous,
        garmentIds: previous.garmentIds.filter((id) => resolveGarment(id)?.category !== category),
        description: "",
      };
    });
    setWhyThisGarmentId((current) => (current === garment.id ? null : current));
    setSelectedCategory(category);
    setSelectedSlotCategory(category);

    if (nextPool.length) {
      setHiddenSignatureCategories((previous) => previous.filter((entry) => entry !== category));
      setSignatureSlotByCategory((previous) => ({ ...previous, [category]: nextPool[0].id }));
      setSelectedGarmentId(nextPool[0].id);
      return;
    }

    setSignatureSlotByCategory((previous) => {
      const next = { ...previous };
      delete next[category];
      return next;
    });
    setHiddenSignatureCategories((previous) => (previous.includes(category) ? previous : [...previous, category]));
    setSelectedGarmentId((current) => (current === garment.id ? "" : current));
  };

  const handleNotForMe = (garment: Garment) => {
    handleDismissSignatureGarment(garment);
  };

  const handleRemix = () => {
    setCurrentLook((previous) => {
      const existing = new Set(previous.garmentIds);
      const nextGarmentIds = [...previous.garmentIds];
      let replacements = 0;

      for (const [index, id] of previous.garmentIds.entries()) {
        if (replacements >= 2) break;
        const current = garments.find((garment) => garment.id === id);
        if (!current) continue;
        const categoryPool = garments.filter((garment) => garment.category === current.category && !existing.has(garment.id));
        if (!categoryPool.length) continue;
        const replacement = categoryPool[(index + replacements) % categoryPool.length];
        existing.delete(id);
        existing.add(replacement.id);
        nextGarmentIds[index] = replacement.id;
        replacements += 1;
      }

      return {
        ...previous,
        id: `${previous.id}-remix-${Date.now()}`,
        name: previous.name.includes("REMIX") ? previous.name : `${previous.name} REMIX`,
        garmentIds: nextGarmentIds,
        description: "",
      };
    });
  };

  const handleSaveLook = () => {
    setSavedLooks((previous) => (previous.includes(currentLook.id) ? previous : [...previous, currentLook.id]));
    setSavedLookNames((previous) => ({ ...previous, [currentLook.id]: currentLook.name }));
  };

  const handleSaveSelectedPiece = () => {
    if (!selectedGarmentId) return;
    setSavedGarments((previous) => (previous.includes(selectedGarmentId) ? previous : [...previous, selectedGarmentId]));
  };

  const handleSaveSpecificLook = (look: Outfit) => {
    setSavedLooks((previous) => (previous.includes(look.id) ? previous : [...previous, look.id]));
    setSavedLookNames((previous) => ({ ...previous, [look.id]: savedLookNames[look.id] ?? look.name }));
  };

  const handleRenameLook = (name: string) => {
    setCurrentLook((previous) => ({ ...previous, name }));
    setSavedLookNames((previous) => (savedLooks.includes(currentLook.id) ? { ...previous, [currentLook.id]: name } : previous));
  };

  const handleSelectAlbum = (albumName: string) => {
    const trackIndex = musicProfile.tracks.findIndex((track) => track.albumName === albumName);
    if (trackIndex >= 0) handleSetNowPlayingIndex(trackIndex);
  };

  const handleTogglePreview = () => {
    if (!nowPlaying.previewUrl) {
      if (nowPlaying.externalUrl) window.open(nowPlaying.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (!audioRef.current || audioRef.current.src !== nowPlaying.previewUrl) {
      audioRef.current?.pause();
      audioRef.current = new Audio(nowPlaying.previewUrl);
      audioRef.current.addEventListener("ended", () => setIsPreviewPlaying(false), { once: true });
    }

    if (isPreviewPlaying) {
      audioRef.current.pause();
      setIsPreviewPlaying(false);
      return;
    }

    audioRef.current.play()
      .then(() => setIsPreviewPlaying(true))
      .catch(() => {
        setIsPreviewPlaying(false);
        if (nowPlaying.externalUrl) window.open(nowPlaying.externalUrl, "_blank", "noopener,noreferrer");
      });
  };

  const handleShopCurrentLook = () => {
    const urls = currentLookGarments.map((garment) => garment.productUrl).filter((url): url is string => Boolean(url));
    if (!urls.length) {
      setFlowError("No shop links are available for this look yet.");
      return;
    }
    urls.slice(0, 4).forEach((url) => window.open(url, "_blank", "noopener,noreferrer"));
  };

  const handleSelectOutfitSlot = (category: string, garmentId: string) => {
    const normalized = category === "shoes" ? "shoe" : category;
    setSelectedSlotCategory(normalized);
    setSelectedGarmentId(garmentId);
    if (["top", "bottom", "dress", "outerwear", "shoe", "accessory"].includes(normalized)) {
      setSelectedCategory(normalized as Category);
    }
  };

  useEffect(() => {
    const userId = soundrobeResult?.user.id;
    const catalogLoadKey = userId && soundrobeResult
      ? `${soundrobeCacheVersion}:${userId}:${catalogIntentSignature(soundrobeResult)}`
      : null;

    if (!userId || !catalogLoadKey || catalogLoadedForUser === catalogLoadKey) return;

    let cancelled = false;

    const loadInitialCatalog = async () => {
      try {
        const categories: Category[] = [
          "top",
          "bottom",
          "dress",
          "outerwear",
          "shoe",
          "accessory",
        ];

        const responses = await Promise.all(
          categories.map((category) => {
            const params = new URLSearchParams({
              category,
              offset: "0",
              limit: String(initialCatalogLimitPerCategory),
            });
            const queries = searchQueriesForCategory(soundrobeResult, category);
            if (queries.length) params.set("queries", queries.join(","));
            const garmentTypes = garmentTypesForCategory(soundrobeResult, category);
            if (garmentTypes.length) params.set("garmentTypes", garmentTypes.join(","));

            return fetch(`/api/products?${params.toString()}`, {
              cache: "no-store",
            });
          })
        );

        const payloads = await Promise.all(
          responses.map(async (response) => {
            if (!response.ok) {
              throw new Error(`Products request failed: ${response.status}`);
            }

            return response.json() as Promise<{
              products?: ProductCandidate[];
            }>;
          })
        );

        if (cancelled) return;

        const products = payloads.flatMap(
          (payload) => payload.products ?? []
        );

        setCatalogOffsets(
          categories.reduce((next, category, index) => ({
            ...next,
            [category]: payloads[index]?.products?.length ?? 0,
          }), {} as Record<Category, number>)
        );

        const dedupedProducts = Array.from(new Map(products.map((product) => [stableCatalogProductId(product), product])).values());
        const realGarments = scoreCatalogProducts(dedupedProducts, soundrobeResult);
        setCatalogProducts(dedupedProducts);
        setCatalogLoadedForUser(catalogLoadKey);

        const garmentIds = buildLookGarmentsFromRankedCatalog(realGarments)
          .map((garment) => garment.id);

        if (garmentIds.length > 0) {
          setCurrentLook({
            id: `catalog-look-${userId}`,
            name: "YOUR SOUNDROBE",
            garmentIds,
            description: "",
          });

          setSelectedGarmentId(garmentIds[0]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Could not load initial product catalog", error);
        }
      }
    };

    void loadInitialCatalog();

    return () => {
      cancelled = true;
    };
  }, [soundrobeResult, soundrobeResult?.user.id, catalogLoadedForUser]);

  
  const renderScreen = () => {
    if (screen === "home") {
      return (
        <div className="grid gap-3 p-2 md:p-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div className="border-2 border-[#202020] bg-[#f7f1f6] p-4 shadow-[5px_5px_0_rgba(23,70,184,0.45)]">
              <div className="ui-chrome-text mb-2 bg-[#1746b8] px-2 py-1 text-[11px] font-bold uppercase text-white">all new ★ soundrobe</div>
              <h1 className="display-wordmark text-[44px] uppercase leading-[0.9] text-[#1746b8] md:text-[72px]">{"LET'S MATCH!"}</h1>
              <p className="mt-2 max-w-xl text-[13px] font-semibold leading-5 text-[#303746]">Connect your music, tune your taste mix, then enter a wardrobe built from your songs, albums, tags, and eras.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {spotifyConnected ? (
                  <>
                    <RetroButton variant="primary" size="lg" onClick={handleEnterSoundrobe}>ENTER SOUNDROBE</RetroButton>
                    <RetroButton variant="secondary" size="lg" onClick={handleSpotifyConnect}>REFRESH SPOTIFY</RetroButton>
                  </>
                ) : (
                  <>
                    <RetroButton variant="primary" size="lg" onClick={handleSpotifyConnect}>CONNECT MUSIC</RetroButton>
                  </>
                )}
              </div>
              <div className="ui-chrome-text mt-3 inline-flex border-2 border-[#202020] bg-[#f8f9fb] px-2 py-1 text-[10px] font-bold uppercase text-[#4e5666]">
                {spotifyMessage}
              </div>
              {flowError ? (
                <div className="mt-3 border-2 border-[#202020] bg-[#fff7cc] p-2 text-[10px] font-bold uppercase leading-4 text-[#633c00]">
                  {flowError}
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {[
                ["1", "Add music", spotifyConnected ? "Spotify is connected. Enter to build from your profile." : "Connect Spotify, or preview the full app with demo music."],
                ["2", "Tune the mix", "Balance archive taste, seasonal favorites, and recent plays."],
                ["3", "Enter Soundrobe", "Review your DNA, remix a look, save it, or open shop links."],
              ].map(([step, title, body]) => (
                <div key={step} className="border-2 border-[#202020] bg-[#f8f9fb] p-3 shadow-[3px_3px_0_rgba(32,32,32,0.22)]">
                  <div className="mb-2 inline-flex h-7 w-7 items-center justify-center border-2 border-[#202020] bg-[#ffd3e8] text-[11px] font-black">{step}</div>
                  <div className="text-[11px] font-bold uppercase text-[#151821]">{title}</div>
                  <div className="mt-1 text-[10px] font-semibold leading-4 text-[#4e5666]">{body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Panel title="NOW PLAYING">
              <div className="space-y-3">
                <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2 border-2 border-[#202020] bg-[#f7f7f7] p-2">
                  <div className="flex h-24 min-w-0 items-center justify-center border-2 border-[#202020] bg-[#dfe7f5]">
                    <div className="spinning-cd" aria-label="Soundrobe compact disc" />
                  </div>
                  <div className="min-w-0 space-y-2 text-[10px] font-bold uppercase">
                    <div className="ticker-window bg-[#151821] px-2 py-1 text-[#ffd3e8]"><span className="marquee">get started // connect music // build wardrobe //</span></div>
                    <div className="truncate border-2 border-[#202020] bg-white px-2 py-1 text-[9px] text-[#303746]">No music loaded yet</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" aria-label="Connect music" onClick={spotifyConnected ? handleEnterSoundrobe : handleSpotifyConnect} className="bevel-button flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#202020] bg-[#ffd3e8]"><Play className="ml-0.5 h-4 w-4 fill-current" /></button>
                    </div>
                    <div className="h-4 border-2 border-[#202020] bg-white p-[2px]"><div className="h-full bg-[#1746b8]" style={{ width: "28%" }} /></div>
                  </div>
                </div>
                <div className="flex h-12 items-end gap-1 border-2 border-[#202020] bg-black p-1">
                  {[32, 52, 40, 70, 46, 68, 58, 45, 72, 60, 34, 80].map((height, index) => (
                    <span key={height + index} className="equalizer-bar" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </div>
      );
    }

    if (screen === "analysis") {
      return (
        <div className="space-y-4 p-2 md:p-4">
          <Panel title="ANALYZING MUSIC PROFILE..." className="overflow-hidden">
            <div className="space-y-5 px-2 py-4 text-[10px] font-bold uppercase text-[#111111]">
              <div className="text-[13px]">USER: {musicProfile.userName.toUpperCase()}</div>

              {analysisSteps.map((step, index) => (
                <div key={step} className="grid gap-2 md:grid-cols-[230px_1fr]">
                  <span className={index <= analysisIndex ? "text-[#111111]" : "text-[#6d6d6d]"}>
                    {step}...
                  </span>
                  <div className="relative h-5 border-2 border-[#303030] bg-[#f4f4f4]">
                    <div
                      className={`h-full border-r-2 border-[#303030] ${index <= analysisIndex ? "bg-[#1746b8]" : "bg-[#d8d8d8]"}`}
                      style={{ width: index < analysisIndex ? "100%" : index === analysisIndex ? `${analysisProgress}%` : "18%" }}
                    />
                  </div>
                </div>
              ))}

              <div className="pt-3">
                <div className="mb-2 text-[11px] font-bold uppercase">NOW PROCESSING</div>
                <div className="border-2 border-[#303030] bg-[#f5f5f5] p-2 text-[11px] tracking-[0.12em]">
                  {musicProfile.genres.slice(0, 4).map((genre) => genre.name).join(" / ")}
                </div>
              </div>

              <div className="rounded-none border-2 border-[#303030] bg-[#ededed] p-3">
                <div className="mb-3 text-[11px] font-bold uppercase">ERA TIMELINE</div>
                <div className="grid grid-cols-6 gap-2 text-[10px] uppercase">
                  {['70s', '80s', '90s', '00s', '10s', '20s'].map((label) => (
                    <div key={label} className="text-center">
                      <div className="mb-2 text-[#4d4d4d]">{label}</div>
                      <div className="flex h-10 items-end justify-center gap-1">
                        {[40, 22, 64, 92, 58, 30].map((height, index) => (
                          <span
                            key={`${label}-${index}`}
                            className="block w-3 border border-[#303030] bg-[#ffd3e8]"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      );
    }

    if (screen === "dna" || screen === "soundrobe") {
      return (
        <div className="space-y-4 p-2 md:p-4">
          <div className="grid gap-3 border-2 border-[#202020] bg-[#f7f1f6] p-3 shadow-[4px_4px_0_rgba(230,74,160,0.45)] lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <div className="ui-chrome-text text-[10px] font-bold uppercase text-[#4a4a4a]">music profile loaded</div>
              <div className="display-wordmark mt-1 text-[30px] uppercase leading-none text-[#1746b8] md:text-[42px]">{visibleProfileName.toUpperCase()} SOUNDROBE</div>
              <div className="mt-3 grid gap-2 text-[10px] font-bold uppercase md:grid-cols-2">
                <div className="border-2 border-[#202020] bg-white px-2 py-1.5">
                  <span className="mr-2 text-[#6b6070]">Top music tags</span>
                  <span>{topGenreLine}</span>
                </div>
                <div className="min-w-0 border-2 border-[#202020] bg-white px-2 py-1.5">
                  <span className="mr-2 text-[#6b6070]">Top artists</span>
                  <span className="break-words">{topArtistLine}</span>
                </div>
              </div>
            </div>
            <div className="border-2 border-[#202020] bg-[#ececec] p-2 shadow-[3px_3px_0_rgba(32,32,32,0.22)]">
              <div className="mb-2 bg-[#151821] px-2 py-1 text-[9px] font-bold uppercase text-[#ffd3e8]">now playing</div>
                <div className="grid grid-cols-[74px_minmax(0,1fr)] gap-2">
                <div className="flex h-[74px] items-center justify-center border-2 border-[#202020] bg-[#dfe7f5]">
                  <div
                    className="spinning-cd"
                    style={nowPlaying.imageUrl ? { backgroundImage: `url(${nowPlaying.imageUrl})` } : undefined}
                    aria-label={nowPlaying.imageUrl ? "Album cover disc" : "Generated compact disc"}
                  />
                </div>
                <div className="min-w-0 space-y-1 text-[10px] font-bold uppercase">
                  <div className="ticker-window bg-[#151821] px-2 py-1 text-[#ffd3e8]"><span className="marquee">{nowPlaying.title}</span></div>
                  <div className="truncate border-2 border-[#202020] bg-white px-2 py-1 text-[9px] text-[#303746]">{nowPlaying.detail}</div>
                  <div className="h-4 border-2 border-[#202020] bg-white p-[2px]"><div className="h-full bg-[#1746b8]" style={{ width: `${nowPlaying.progress}%` }} /></div>
                  <button
                    type="button"
                    onClick={handleTogglePreview}
                    className="bevel-button mt-1 border-2 border-[#202020] bg-[#ffd3e8] px-2 py-1 text-[9px] font-bold uppercase"
                  >
                    {nowPlaying.previewUrl ? (isPreviewPlaying ? "STOP PREVIEW" : "PLAY PREVIEW") : "OPEN SPOTIFY"}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-2 lg:col-span-2">
              {screen === "dna" ? (
                <RetroButton size="sm" variant="primary" onClick={() => setScreen("soundrobe")}>ENTER SOUNDROBE</RetroButton>
              ) : null}
              {screen === "soundrobe" ? (
                <RetroButton size="sm" variant="primary" onClick={() => setScreen("dna")}>MUSIC DNA</RetroButton>
              ) : null}
              <RetroButton size="sm" onClick={handleReset}>RESET</RetroButton>
            </div>
          </div>

          {!hasGenreData && soundrobeResult?.metadata.musicSource === "spotify" ? (
            <div className="border-2 border-[#202020] bg-[#fff7cc] p-3 text-[11px] font-bold uppercase leading-5 shadow-[3px_3px_0_rgba(32,32,32,0.25)]">
              Spotify returned your artists and tracks, but the artist objects used for this run did not include genre strings. Open /api/music/spotify/genres to inspect the raw response.
            </div>
          ) : null}

          <div className={screen === "dna" ? "grid gap-3 xl:grid-cols-[0.9fr_1.35fr_0.75fr]" : "grid gap-3 xl:grid-cols-[1.35fr_0.75fr]"}>
            {screen === "dna" ? (
            <Panel title="MUSIC DNA">
              <div className="space-y-3 text-[11px] font-bold uppercase">
                {hasGenreData ? (
                  musicProfile.genres.slice(0, 8).map((genre) => (
                    <div key={genre.name} className="space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span>{genre.name}</span>
                        <span>{genre.value}%</span>
                      </div>
                      <ProgressBar value={genre.value} />
                    </div>
                  ))
                ) : (
                  <div className="border-2 border-[#202020] bg-white p-3 text-[10px] leading-5 text-[#303746]">
                    No music tags available in this generated profile.
                  </div>
                )}
                <div className="border-t-2 border-[#202020] pt-2 text-[9px] leading-4 text-[#5d5360]">
                  Weighted from Spotify top artists and the artists attached to your top tracks.
                </div>
              </div>
            </Panel>
            ) : null}

            {screen === "dna" ? (
            <Panel title="STYLE SIGNALS">
              <div className="space-y-3 font-bold text-[#212121]">
                {musicProfile.moodTags.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {musicProfile.moodTags.slice(0, 6).map((tag) => (
                      <span key={tag.name} className="border-2 border-[#202020] bg-white px-2 py-1 text-[9px] uppercase text-[#4d4d4d]">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-1.5">
                  {styleProfile.fashionSignals.slice(0, 4).map((signal) => (
                    <span key={signal.name} className="border-2 border-[#202020] bg-[#ffd3e8] px-2 py-1 text-[9px] uppercase">
                      {signal.name} {signal.value}%
                    </span>
                  ))}
                </div>
                <div className="grid gap-2 text-[10px] font-bold uppercase sm:grid-cols-2">
                  {musicProfile.artists.map((artist) => (
                    <div key={artist.name} className="catalog-tile min-w-0 border-2 border-[#202020] bg-[#f3f3f3] p-2">
                      <div className="truncate">{artist.name}</div>
                      <div className="mt-1 break-words text-[9px] leading-4 text-[#5f5f5f]">{artist.label || "no Spotify genres returned"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
            ) : null}

            {screen === "dna" ? (
            <Panel title="PALETTE">
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
                {styleProfile.palette.map((color) => (
                  <div key={color.hex} className="min-w-0 border-2 border-[#202020] bg-[#f8f9fb] p-1.5 text-[10px] font-bold uppercase">
                    <span className="mb-1.5 block h-20 border-2 border-[#202020] xl:h-16" style={{ background: color.hex }} />
                    <span className="block truncate leading-4">{color.name}</span>
                    <span className="block truncate text-[8px] leading-3 text-[#5a5a5a]">{color.hex}</span>
                  </div>
                ))}
              </div>
            </Panel>
            ) : null}
          </div>

          {screen === "dna" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="TOP SONGS">
              <div className="grid gap-2 md:grid-cols-2">
                {musicProfile.tracks.slice(0, 10).map((track, index) => (
                  <button
                    key={`${track.name}-${track.artists.join("/")}`}
                    type="button"
                    onClick={() => handleSetNowPlayingIndex(index)}
                    className="bevel-button grid min-w-0 grid-cols-[66px_minmax(0,1fr)] gap-2 border-2 border-[#202020] bg-[#f8f9fb] p-2 text-left"
                  >
                    <div className="flex h-[66px] items-center justify-center border-2 border-[#202020] bg-[#dfe7f5]">
                      {track.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={track.imageUrl} alt="" className="h-full w-full object-cover [image-rendering:pixelated]" />
                      ) : (
                        <div className="h-8 w-8 rounded-full border-4 border-white bg-[#111]" />
                      )}
                    </div>
                    <div className="min-w-0 text-[10px] font-bold uppercase leading-4">
                      <div className="truncate">{track.name}</div>
                      <div className="truncate text-[9px] text-[#5d5360]">{track.artists.join(" / ") || "unknown artist"}</div>
                      <div className="truncate text-[9px] text-[#5d5360]">{track.albumName ?? track.releaseYear ?? "top track"}</div>
                      <div className="mt-1 h-3 border border-[#202020] bg-white p-[1px]">
                        <div className="h-full bg-[#e64aa0]" style={{ width: `${track.value ?? 0}%` }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="TOP ALBUMS">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {musicProfile.albums.slice(0, 6).map((album) => (
                  <button
                    key={`${album.name}-${album.artists.join("/")}`}
                    type="button"
                    onClick={() => handleSelectAlbum(album.name)}
                    className="catalog-tile min-w-0 border-2 border-[#202020] bg-[#f8f9fb] p-2 text-left"
                  >
                    <div className="mb-2 aspect-square border-2 border-[#202020] bg-[#dfe7f5]">
                      {album.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={album.imageUrl} alt="" className="h-full w-full object-cover [image-rendering:pixelated]" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[#151821] text-[9px] font-bold uppercase text-[#ffd3e8]">album</div>
                      )}
                    </div>
                    <div className="text-[10px] font-bold uppercase leading-4">
                      <div className="truncate">{album.name}</div>
                      <div className="truncate text-[9px] text-[#5d5360]">{album.artists.join(" / ") || "various"}</div>
                      <div className="mt-1 h-3 border border-[#202020] bg-white p-[1px]">
                        <div className="h-full bg-[#1746b8]" style={{ width: `${album.value}%` }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
          ) : null}

          {screen === "dna" ? (
          <Panel title="FASHION SIGNALS / MIXER">
            <div className="grid gap-3 md:grid-cols-2">
              {styleProfile.fashionSignals.slice(0, 8).map((signal) => (
                <div key={signal.name} className="grid items-center gap-3 md:grid-cols-[180px_1fr_40px]">
                  <div className="text-[11px] font-bold uppercase">{signal.name}</div>
                  <div className="relative h-5 border-2 border-[#202020] bg-[#f4f4f4]">
                    <div className="h-full border-r-2 border-[#202020] bg-[#e64aa0]" style={{ width: `${signal.value}%` }} />
                  </div>
                  <div className="text-right text-[11px] font-bold uppercase">{signal.value}%</div>
                </div>
              ))}
            </div>
          </Panel>
          ) : null}

          {screen === "dna" ? (
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel title="CORE TASTE / CURRENT ROTATION">
              <div className="space-y-3 text-[11px] font-bold uppercase">
                <div className="border-2 border-[#202020] bg-[#ffd3e8] p-2">
                  <div className="text-[13px] font-bold uppercase text-[#111111]">Tune the mix</div>
                  <div className="mt-1 text-[10px] normal-case leading-4 tracking-[0.02em] text-[#303746]">
                    Balance archive taste, seasonal favorites, and recent plays. Rebuild to apply the new weighting.
                  </div>
                </div>
                {[
                  { key: "longTerm" as const, label: "ARCHIVE", description: "years-deep taste" },
                  { key: "mediumTerm" as const, label: "SEASON", description: "last few months" },
                  { key: "shortTerm" as const, label: "NOW", description: "recent plays" },
                ].map((range) => (
                  <label key={range.key} className="block border-2 border-[#202020] bg-[#f7f7f7] p-2">
                    <div className="mb-2 grid grid-cols-[78px_minmax(0,1fr)_42px] items-center gap-2">
                      <span>{range.label}</span>
                      <span className="truncate text-[9px] text-[#5d5360]">{range.description}</span>
                      <span className="text-right">{timeWeights[range.key]}%</span>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={timeWeights[range.key]}
                        onChange={(event) => updateTimeWeight(range.key, Number(event.target.value))}
                        className="soundrobe-slider w-full"
                      />
                      <div className="h-4 border-2 border-[#202020] bg-white p-[2px]">
                        <div className="h-full bg-[#1746b8]" style={{ width: `${timeWeights[range.key]}%` }} />
                      </div>
                    </div>
                  </label>
                ))}
                <div className="grid gap-1.5 sm:grid-cols-3">
                  <RetroButton size="sm" onClick={() => setWeightPreset("core")}>CORE</RetroButton>
                  <RetroButton size="sm" onClick={() => setWeightPreset("balanced")}>BALANCED</RetroButton>
                  <RetroButton size="sm" onClick={() => setWeightPreset("current")}>NOW</RetroButton>
                </div>
                <div className={`border-2 border-[#202020] p-2 ${hasUnappliedMix ? "bg-[#fff7cc]" : "bg-white"}`}>
                  <div className="mb-2 flex items-center justify-between gap-2 text-[9px] leading-4">
                    <span>APPLIED MIX</span>
                    {hasUnappliedMix ? <span className="text-[#8a4d00]">REBUILD NEEDED</span> : <span className="text-[#5d5360]">LIVE</span>}
                  </div>
                  <div className="grid gap-1.5">
                    {[
                      { label: "ARCHIVE", value: displayedAppliedWeights.longTerm },
                      { label: "SEASON", value: displayedAppliedWeights.mediumTerm },
                      { label: "NOW", value: displayedAppliedWeights.shortTerm },
                    ].map((entry) => (
                      <div key={entry.label} className="grid grid-cols-[68px_minmax(0,1fr)_36px] items-center gap-2 text-[9px] leading-4">
                        <span>{entry.label}</span>
                        <div className="h-3 border border-[#202020] bg-white p-[1px]">
                          <div className="h-full bg-[#1746b8]" style={{ width: `${entry.value}%` }} />
                        </div>
                        <span className="text-right">{entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex">
                  <RetroButton size="sm" variant={hasUnappliedMix ? "primary" : "secondary"} onClick={handleRegenerateWithWeights}>
                    {isRebuildingMix ? "REBUILDING..." : "REBUILD WITH MIX"}
                  </RetroButton>
                </div>
              </div>
            </Panel>

            <Panel title="MUSIC / TAG DRIVERS">
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  {sourceDrivers.map((entry) => {
                    const value = entry.value;
                    const bars = [0.42, 0.68, 0.36, 0.9, 0.58, 0.76].map((scale, index) => Math.max(12, Math.round(value * scale + index * 2)));
                    return (
                      <div key={entry.name} className="border-2 border-[#303030] bg-[#f2f2f2] p-2">
                        <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase text-[#111111]">
                          <span>{entry.name}</span>
                          <span>{value}%</span>
                        </div>
                        <div className="flex h-[72px] items-end gap-1 border-2 border-[#202020] bg-white p-1">
                          {bars.map((height, index) => (
                            <span
                              key={`${entry.name}-${height}-${index}`}
                              className="block flex-1 border border-[#303030] bg-[#1746b8]"
                              style={{ height: `${Math.min(100, height)}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>
          </div>
          ) : null}
        </div>
      );
    }

    if (screen === "looks") {
      return (
        <div className="space-y-4 p-2 md:p-4">
          <div className="mb-3 text-[10px] font-bold uppercase text-[#4a4a4a]">LOOKBOOK</div>
          <div className="grid gap-4 xl:grid-cols-3">
            {lookPresets.map((look) => {
              const lookGarments = look.garmentIds.map((id) => garments.find((garment) => garment.id === id)).filter(Boolean) as Garment[];
              const total = lookGarments.reduce((sum, garment) => sum + garment.price, 0);

              return (
                <Panel key={look.id} title={look.name} className="look-card">
                  <div className="space-y-3">
                    <div className="grid h-[180px] grid-cols-2 gap-2 border-2 border-[#303030] bg-[#d9d9d9] p-2">
                      {lookGarments.slice(0, 6).map((garment, index) => (
                        <div key={`${look.id}-${garment.id}`} className="flex items-center justify-center border-2 border-[#303030] bg-[#eee]">
                          <span className="text-[9px] font-bold uppercase tracking-[0.08em]">{index + 1}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 text-[10px] font-bold uppercase">
                      <div className="flex justify-between">
                        <span>{lookGarments[0]?.influences[0] ?? "music"}</span>
                        <span>{lookGarments[0]?.matchScore ?? 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{lookGarments[1]?.influences[0] ?? "style"}</span>
                        <span>{lookGarments[1]?.matchScore ?? 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{lookGarments[2]?.influences[0] ?? "era"}</span>
                        <span>{lookGarments[2]?.matchScore ?? 0}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-2 border-[#303030] bg-[#f3f3f3] px-2 py-2 text-[10px] font-bold uppercase">
                      <span>${total}</span>
                      <div className="flex gap-2">
                        <RetroButton
                          size="sm"
                          onClick={() => {
                            setCurrentLook(look);
                            setScreen("soundrobe");
                          }}
                        >
                          OPEN
                        </RetroButton>
                        <RetroButton size="sm" onClick={() => handleSaveSpecificLook(look)}>SAVE</RetroButton>
                      </div>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      );
    }

    if (screen === "closet") {
      return (
        <div className="space-y-4 p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase text-[#4a4a4a]">MY CLOSET</div>
            <div className="flex gap-2">
              <RetroButton size="sm" onClick={() => setScreen("looks")}>PIECES</RetroButton>
              <RetroButton size="sm" onClick={() => setScreen("looks")}>LOOKS</RetroButton>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="PIECES">
              <div className="grid gap-2">
                {savedGarments.length ? savedGarments.map((garmentId) => {
                  const garment = garments.find((entry) => entry.id === garmentId);
                  if (!garment) return null;
                  return (
                    <button
                      key={garment.id}
                      type="button"
                      onClick={() => {
                        setSelectedGarmentId(garment.id);
                        setScreen("soundrobe");
                      }}
                      className="bevel-button flex items-center justify-between border-2 border-[#303030] bg-[#f4f4f4] p-2 text-left text-[10px] font-bold uppercase"
                    >
                      <span>{garment.name}</span>
                      <span>{garment.category}</span>
                    </button>
                  );
                }) : (
                  <div className="border-2 border-[#202020] bg-[#f8f9fb] p-3 text-[10px] font-bold uppercase leading-4 text-[#5d5360]">
                    No saved pieces yet. Open Soundrobe and save pieces you want to keep.
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="LOOKS">
              <div className="grid gap-2">
                {savedLooks.length ? savedLooks.map((lookId) => {
                  const look = lookPresets.find((entry) => entry.id === lookId) ?? defaultLook;
                  const lookName = savedLookNames[look.id] ?? look.name;
                  return (
                    <button
                      key={look.id}
                      type="button"
                      onClick={() => setCurrentLook({ ...look, name: lookName })}
                      className="bevel-button flex items-center justify-between border-2 border-[#303030] bg-[#f4f4f4] p-2 text-left text-[10px] font-bold uppercase"
                    >
                      <span>{lookName}</span>
                      <span>{look.garmentIds.length} ITEMS</span>
                    </button>
                  );
                }) : (
                  <div className="border-2 border-[#202020] bg-[#f8f9fb] p-3 text-[10px] font-bold uppercase leading-4 text-[#5d5360]">
                    No saved looks yet. Build a look, rename it, then hit Save Look.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-2 md:p-4">
        <Panel title="PROFILE">
          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="relative flex aspect-square items-center justify-center overflow-hidden border-2 border-[#303030] bg-[#d7d7d7] text-[#111111]">
                {profileImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pixelatedProfileImage ?? profileImage}
                      alt=""
                      className="h-full w-full object-cover"
                      style={{
                        imageRendering: "pixelated",
                        filter: `contrast(${1 + profilePixelation / 320}) saturate(${1 + profilePixelation / 360})`,
                      }}
                    />
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        backgroundImage: "linear-gradient(90deg, rgba(255,255,255,.22) 1px, transparent 1px), linear-gradient(180deg, rgba(0,0,0,.14) 1px, transparent 1px)",
                        backgroundSize: `${Math.max(4, 18 - Math.round(profilePixelation / 8))}px ${Math.max(4, 18 - Math.round(profilePixelation / 8))}px`,
                        opacity: profilePixelation / 140,
                      }}
                    />
                  </>
                ) : (
                  <UserRound className="h-16 w-16" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="bevel-button flex min-h-[34px] cursor-pointer items-center justify-center border-2 border-[#202020] bg-[#ffd3e8] px-2 py-1.5 text-center text-[10px] font-bold uppercase leading-none">
                  Choose image
                  <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="sr-only" />
                </label>
                <button type="button" onClick={() => setProfileImage(null)} className="bevel-button flex min-h-[34px] items-center justify-center border-2 border-[#202020] bg-[#d8dbe2] px-2 py-1.5 text-[10px] font-bold uppercase leading-none">
                  Clear
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-[9px] font-bold uppercase text-[#5d5360]">
                Display name
                <input
                  value={visibleProfileName}
                  onChange={(event) => setProfileDisplayName(event.target.value)}
                  className="mt-1 block w-full border-2 border-[#202020] bg-white px-2 py-2 text-[18px] font-black uppercase text-[#111111] outline-none focus:bg-[#ffd3e8]"
                />
              </label>
              <label className="block border-2 border-[#202020] bg-[#f8f9fb] p-2 text-[10px] font-bold uppercase">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span>Pixelate profile image</span>
                  <span>{profilePixelation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={profilePixelation}
                  onChange={(event) => setProfilePixelation(Number(event.target.value))}
                  className="soundrobe-slider w-full"
                />
              </label>
              <div className="space-y-2 text-[10px] font-bold uppercase">
                <div>Top artists: {musicProfile.artists.slice(0, 3).map((artist) => artist.name).join(" / ")}</div>
                <div>Primary eras: {musicProfile.eras.slice(0, 3).map((era) => era.name).join(" / ")}</div>
                <div>Style signal: {styleProfile.fashionSignals.slice(0, 2).map((signal) => signal.name).join(" with ")}</div>
              </div>
              <RetroButton onClick={() => setScreen("soundrobe")} variant="primary">VIEW SOUNDROBE</RetroButton>
            </div>
          </div>
        </Panel>
      </div>
    );
  };

  return (
    <main className="app-shell min-h-screen p-2 md:p-5">
      <div className="mx-auto max-w-[1280px] border-2 border-[#202020] bg-[#d5d5d5] shadow-[8px_8px_0_#111]">
        <div className="title-bar-blue flex items-center justify-between border-b-2 border-[#202020] px-2 py-1">
          <div className="ui-chrome-text text-[12px] font-bold uppercase text-white">soundrobe.exe</div>
          <div className="flex gap-2">
            <span className="window-button">_</span>
            <span className="window-button">□</span>
            <span className="window-button">×</span>
          </div>
        </div>

        <div className="browser-bar flex items-center gap-2 border-b-2 border-[#202020] px-2 py-1 text-[11px]">
          <span className="font-bold underline">File</span>
          <span className="font-bold underline">Edit</span>
          <span className="font-bold underline">View</span>
          <span className="font-bold underline">Play</span>
          <span className="font-bold underline">Tools</span>
          <span className="font-bold underline">Help</span>
        </div>

        <div className="toolbar-rail flex flex-wrap items-center gap-1 border-b-2 border-[#202020] px-2 py-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              className={`retro-tab ${screen === tab.value ? "bg-[#ffd3e8] text-[#111111]" : "text-[#111111]"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="border-b-2 border-[#202020] bg-[#151821] px-3 py-2 text-[10px] font-bold uppercase text-[#ffd3e8]">
          <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3 overflow-hidden">
            <span className="text-white">NOW PLAYING</span>
            <span className="ticker-window min-w-0 border-l border-[#ffd3e8]/40 pl-3">
              <span className="marquee">soundrobe // music dna // fashion matrix // your wardrobe is in motion //</span>
            </span>
          </div>
        </div>

        {renderScreen()}

        {screen === "soundrobe" && (
          <div className="space-y-4 p-2 md:p-4">
            <Panel title="SIGNATURE PIECES">
              {signatureGarments.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {signatureGarments.map((garment, index) => {
                    const exactInLook = displayedCurrentLook.garmentIds.includes(garment.id);
                    const sameCategoryInLook = displayedCurrentLook.garmentIds.some((id) => {
                      const inLook = garments.find((item) => item.id === id) ?? allSignatureGarments.find((item) => item.id === id);
                      return inLook?.category === garment.category;
                    });

                    return (
                      <GarmentCard
                        key={`signature-${garment.category}-${garment.id}-${index}`}
                        garment={garment}
                        isSelected={selectedGarmentId === garment.id}
                        isInLook={exactInLook}
                        isSaved={savedGarments.includes(garment.id)}
                        actionLabel={exactInLook ? "REMOVE" : sameCategoryInLook ? "SWAP" : "ADD"}
                        onSelect={(entry) => {
                          setSelectedCategory(entry.category);
                          setSelectedSlotCategory(entry.category);
                          toggleCurrentLookGarment(entry);
                        }}
                        onSave={handleSaveGarment}
                        onWhyThis={(entry) => setWhyThisGarmentId(entry.id)}
                        onNextOption={handleFindNextSignatureOption}
                        showNextOption
                        onMoreLikeThis={handleMoreLikeThis}
                        onNotForMe={handleNotForMe}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="border-2 border-[#202020] bg-[#fff7fb] p-4 text-[12px] font-bold uppercase leading-relaxed text-[#3a2631]">
                  No live product matches yet. Soundrobe will use cached SerpAPI results when available and leave empty spots instead of mixing in demo catalog pieces.
                </div>
              )}
            </Panel>
          </div>
        )}

        {screen === "looks" || screen === "closet" ? null : null}

        {screen === "soundrobe" && (
          <div className="space-y-4 p-2 md:p-4">
            <Panel title="WARDROBE.EXE">
              <div className="mb-4 border-2 border-[#202020] bg-[#f7f1f6] p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <label className="block text-[9px] font-bold uppercase text-[#5d5360]">
                    Look name
                    <input
                      value={currentLook.name}
                      onChange={(event) => handleRenameLook(event.target.value)}
                      className="mt-1 block w-full border-2 border-[#202020] bg-white px-2 py-2 text-[14px] font-bold uppercase text-[#111111] outline-none focus:bg-[#ffd3e8]"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="border-2 border-[#202020] bg-white px-3 py-2 text-[12px] font-bold uppercase">
                      ${displayedCurrentLook.garmentIds
                        .reduce(
                          (sum, id) =>
                            sum + (garments.find((item) => item.id === id)?.price ?? 0),
                          0
                        )
                        .toFixed(2)}
                      </div>
                    <RetroButton variant="secondary" onClick={() => setScreen("dna")}>TUNE MUSIC DNA</RetroButton>
                    <RetroButton onClick={handleRemix}>REMIX</RetroButton>
                    <RetroButton onClick={handleSaveSelectedPiece}>SAVE PIECE</RetroButton>
                    <RetroButton onClick={handleSaveLook}>SAVE LOOK</RetroButton>
                    <RetroButton onClick={handleShopCurrentLook}>SHOP</RetroButton>
                  </div>
                </div>
                {currentLook.description ? (
                  <div className="text-fit mt-2 text-[10px] uppercase tracking-[0.08em] text-[#4d4d4d]">{currentLook.description}</div>
                ) : null}
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                <OutfitCanvas
                  garments={currentLookGarments}
                  selectedCategory={normalizedSelectedCategory}
                  onSelectSlot={handleSelectOutfitSlot}
                  onRemoveGarment={removeCurrentLookGarment}
                  onCycleCategory={cycleCurrentLookCategory}
                />

                <div className="border-2 border-[#202020] bg-[#f3f3f3] p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] font-bold uppercase">ADD PIECES</div>
                    <div className="text-[9px] font-bold uppercase text-[#5d5360]">
                      {selectedCategoryFilteredGarments.length} in {categoryTabs.find((tab) => tab.value === selectedCategory)?.label.toLowerCase() ?? "category"}
                    </div>
                  </div>
                  <div className="mb-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-2">
                    {categoryTabs.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(tab.value);
                          setSelectedSlotCategory(tab.value);
                          setActiveProductTag(null);
                        }}
                        className={`bevel-button min-h-8 whitespace-normal border-2 px-2 py-1.5 text-center text-[9px] font-bold uppercase leading-3 ${
                          selectedCategory === tab.value ? "border-[#202020] bg-[#ffd3e8] text-[#111111]" : "border-[#202020] bg-[#f4f4f4] text-[#111111]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  {recommendationBubbles.length ? (
                    <div className="mb-3 flex flex-wrap gap-1.5 border-2 border-[#202020] bg-white p-2">
                      {recommendationBubbles.map((bubble) => (
                        <button
                          key={bubble.id}
                          type="button"
                          onClick={() => setActiveProductTag((current) => current === bubble.id ? null : bubble.id)}
                          className={`bevel-button border border-[#202020] px-2 py-1 text-[9px] font-bold uppercase ${
                            activeProductTag === bubble.id ? "bg-[#ffd3e8] text-[#111111]" : "bg-[#f4f4f4] text-[#303746]"
                          }`}
                        >
                          {bubble.label}
                        </button>
                      ))}
                      {activeProductTag ? (
                        <button
                          type="button"
                          onClick={() => setActiveProductTag(null)}
                          className="bevel-button border border-[#202020] bg-[#d8dbe2] px-2 py-1 text-[9px] font-bold uppercase"
                        >
                          clear
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => loadMoreCategoryOptions(selectedCategory)}
                    className="bevel-button mb-3 w-full border-2 border-[#202020] bg-[#ffd3e8] px-3 py-2 text-[10px] font-bold uppercase"
                  >
                    + Add next {categoryTabs.find((tab) => tab.value === selectedCategory)?.label.toLowerCase() ?? "pieces"}
                  </button>
                  <div className="max-h-[420px] overflow-y-auto pr-1">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      {selectedCategoryFilteredGarments.length ? selectedCategoryFilteredGarments.map((garment, index) => {
                        const isInLook = displayedCurrentLook.garmentIds.includes(garment.id);
                        return (
                          <button
                            key={`${selectedCategory}-${garment.id}-${index}`}
                            type="button"
                            onClick={() => toggleCurrentLookGarment(garment)}
                            className={`catalog-tile grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2 border-2 p-2 text-left text-[10px] font-bold uppercase ${
                              isInLook ? "border-[#e64aa0] bg-[#f7f1f6]" : "border-[#202020] bg-[#f8f8f8]"
                            } ${selectedGarmentId === garment.id ? "outline outline-2 outline-[#ffd3e8]" : ""}`}
                          >
                            <div className="flex h-[72px] items-center justify-center border-2 border-[#202020] bg-[#eef3fb] p-1">
                              {garment.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={garment.image} alt="" className="h-full w-full object-contain [image-rendering:pixelated]" />
                              ) : (
                                <div
                                  className="flex h-full w-full items-end justify-start border border-[#202020] p-1"
                                  style={{ background: placeholderBackground(garment.category) }}
                                >
                                  <span className="border border-[#202020] bg-white px-1 text-[8px] text-[#151821]">
                                    {garment.category}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-fit leading-4">{garment.name}</div>
                              <div className="mt-1 text-[9px] text-[#5d5360]">${garment.price}{garment.matchScore ? ` / ${garment.matchScore}%` : ""}</div>
                              <div className="mt-1 inline-flex border border-[#202020] bg-white px-1 text-[8px]">
                                {isInLook ? "IN LOOK" : "ADD"}
                              </div>
                            </div>
                          </button>
                        );
                      }) : (
                        <div className="border-2 border-dashed border-[#6f7684] bg-white p-3 text-[10px] font-bold uppercase text-[#5d5360]">
                          No {categoryTabs.find((tab) => tab.value === selectedCategory)?.label.toLowerCase() ?? "pieces"} yet. Load more to expand your wardrobe.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )}
      </div>

      {modalGarment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/35 p-4">
          <div className="w-full max-w-[520px] border-2 border-[#303030] bg-[#d8d8d8] shadow-[8px_8px_0_#363636]">
            <div className="title-bar flex items-center justify-between border-b-2 border-[#303030] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em]">
              <span>WHY THIS?</span>
              <div className="flex gap-2">
                <span className="window-button">_</span>
                <span className="window-button">□</span>
                <span
                  className="window-button cursor-pointer hover:bg-[#ffd3e8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e64aa0]"
                  onClick={() => setWhyThisGarmentId(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") setWhyThisGarmentId(null);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  ×
                </span>
              </div>
            </div>
            <div className="space-y-4 p-4 text-[11px] uppercase tracking-[0.12em]">
              <div className="text-[18px] font-bold">{modalGarment.name.toUpperCase()}</div>
              <div className="space-y-3">
                <div className="text-[#4d4d4d]">MUSIC SOURCE</div>
                {modalGarment.influences.map((influence) => (
                  <div key={influence} className="flex items-center justify-between gap-4">
                    <span>{influence}</span>
                    <div className="flex-1 border-2 border-[#303030] bg-[#f4f4f4]">
                      <div className="h-3 bg-[#1746b8]" style={{ width: `${Math.min(90, 35 + modalGarment.influences.indexOf(influence) * 18)}%` }} />
                    </div>
                    <span>{Math.min(90, 35 + modalGarment.influences.indexOf(influence) * 18)}%</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="text-[#4d4d4d]">WHY IT FITS</div>
                <p className="text-[11px] normal-case leading-5 tracking-[0.02em] text-[#1a1a1a]">
                  {modalGarment.explanation}
                </p>
              </div>
              {modalGarment.matchReasons?.length ? (
                <div className="space-y-2">
                  <div className="text-[#4d4d4d]">MATCH BREAKDOWN</div>
                  <div className="grid gap-1.5">
                    {modalGarment.matchReasons.map((reason, index) => {
                      const formatted = formatMatchReason(reason);
                      return (
                        <div key={`${reason.source}-${reason.signal}-${index}`} className="grid grid-cols-[minmax(0,1fr)_42px] gap-2 border-2 border-[#202020] bg-[#f8f8f8] p-2">
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#111111]">{formatted.label}</div>
                            <div className="mt-0.5 text-[10px] normal-case tracking-[0.02em] text-[#4d4d4d]">{formatted.detail}</div>
                          </div>
                          <div className="flex items-center justify-center border-2 border-[#202020] bg-white text-[11px] font-bold">
                            +{reason.contribution}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <div className="flex justify-end">
                <RetroButton onClick={() => setWhyThisGarmentId(null)}>OK</RetroButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
