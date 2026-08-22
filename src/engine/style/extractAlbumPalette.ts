import sharp from "sharp";
import namer from "color-namer";
import type { MusicProfile } from "@/src/domain/music/types";
import type { MusicTimeWeights } from "@/src/engine/music/combineTimeRanges";
import type { PaletteColor } from "@/src/domain/style/types";

const albumColorCache = new Map<string, PaletteColor | null>();
const MAX_ALBUM_IMAGES = 6;
const DEFAULT_TIME_WEIGHTS: MusicTimeWeights = {
  longTerm: 0.5,
  mediumTerm: 0.3,
  shortTerm: 0.2,
} as const;

export async function extractAlbumPalette(musicProfile: MusicProfile, timeWeights: MusicTimeWeights = DEFAULT_TIME_WEIGHTS): Promise<PaletteColor[]> {
  const albumEntries = new Map<string, { imageUrl: string; trackNames: string[]; score: number }>();
  for (const [rangeKey, range] of [
    ["longTerm", musicProfile.longTerm],
    ["mediumTerm", musicProfile.mediumTerm],
    ["shortTerm", musicProfile.shortTerm],
  ] as const) {
    for (const track of range.tracks) {
      if (!track.imageUrl) continue;
      const current = albumEntries.get(track.imageUrl) ?? { imageUrl: track.imageUrl, trackNames: [], score: 0 };
      current.trackNames.push(track.name);
      current.score += track.weight * timeWeights[rangeKey];
      albumEntries.set(track.imageUrl, current);
    }
  }

  const imageEntries = Array.from(albumEntries.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ALBUM_IMAGES);

  const colors = await Promise.all(imageEntries.map((entry) => albumColorFromImage(entry.imageUrl, entry.trackNames[0] ?? "top album", entry.score)));
  return dedupeAlbumColors(colors.filter((color): color is PaletteColor => Boolean(color)));
}

async function albumColorFromImage(imageUrl: string, trackName: string, score: number): Promise<PaletteColor | null> {
  const cached = albumColorCache.get(imageUrl);
  if (cached !== undefined) return cached;
  if (!isSafeImageUrl(imageUrl)) return null;

  try {
    const normalized = await dominantColorFromImageUrl(imageUrl);
    if (!normalized || isWashedOut(normalized)) {
      albumColorCache.set(imageUrl, null);
      return null;
    }
    const paletteColor: PaletteColor = {
      name: albumColorName(normalized),
      hex: normalized,
      score: Math.round(Math.min(100, Math.max(35, score))),
      sources: [{ kind: "palette", id: imageUrl, label: `Album art: ${trackName}`, weight: score }],
    };
    albumColorCache.set(imageUrl, paletteColor);
    return paletteColor;
  } catch {
    albumColorCache.set(imageUrl, null);
    return null;
  }
}

function dedupeAlbumColors(colors: PaletteColor[]) {
  const selected: PaletteColor[] = [];
  for (const color of colors.sort((a, b) => b.score - a.score)) {
    if (selected.some((existing) => colorDistance(existing.hex, color.hex) < 72 || colorFamily(existing.hex) === colorFamily(color.hex))) continue;
    selected.push(color);
    if (selected.length === 4) break;
  }
  return selected;
}

function isSafeImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["i.scdn.co", "mosaic.scdn.co", "lastfm.freetls.fastly.net"].some((host) => url.hostname.endsWith(host));
  } catch {
    return false;
  }
}

async function dominantColorFromImageUrl(imageUrl: string) {
  const response = await fetch(imageUrl, { cache: "force-cache" });
  if (!response.ok) return null;
  const input = Buffer.from(await response.arrayBuffer());
  const { data } = await sharp(input)
    .resize(48, 48, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (let index = 0; index < data.length; index += 3) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    if (r === undefined || g === undefined || b === undefined) continue;
    const key = `${Math.round(r / 32)},${Math.round(g / 32)},${Math.round(b / 32)}`;
    const current = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    current.r += r;
    current.g += g;
    current.b += b;
    current.count += 1;
    buckets.set(key, current);
  }
  const bucket = Array.from(buckets.values())
    .filter((entry) => entry.count > 8)
    .filter((entry) => !isWashedOut(toHex(Math.round(entry.r / entry.count), Math.round(entry.g / entry.count), Math.round(entry.b / entry.count)) ?? "#000000"))
    .sort((a, b) => bucketScore(b) - bucketScore(a))[0];
  if (!bucket) return null;
  return toHex(Math.round(bucket.r / bucket.count), Math.round(bucket.g / bucket.count), Math.round(bucket.b / bucket.count));
}

function normalizeHex(hex: string) {
  const match = hex.toLowerCase().match(/^#[0-9a-f]{6}$/);
  return match ? match[0] : null;
}

function toHex(r: number, g: number, b: number) {
  return normalizeHex(`#${hexPair(r)}${hexPair(g)}${hexPair(b)}`);
}

function hexPair(value: number) {
  return Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
}

function isWashedOut(hex: string) {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness = (max + min) / 510;
  return saturation < 0.14 || lightness > 0.9 || lightness < 0.16;
}

function bucketScore(bucket: { r: number; g: number; b: number; count: number }) {
  const r = bucket.r / bucket.count;
  const g = bucket.g / bucket.count;
  const b = bucket.b / bucket.count;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness = (max + min) / 510;
  const midLightnessBonus = 1 - Math.abs(lightness - 0.52);
  return bucket.count * (0.55 + saturation * 1.15 + midLightnessBonus * 0.45);
}

function colorDistance(a: string, b: string) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

function colorFamily(hex: string) {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 510;
  const saturation = max === 0 ? 0 : (max - min) / max;
  if (lightness < 0.24 || saturation < 0.18) return "neutral";
  if (r > 110 && g > 65 && b < 90) return "brown";
  if (r > g + 24 && r > b + 24) return "red";
  if (g > r + 12 && g > b + 12) return "green";
  if (b > r + 18 && b > g + 12) return "blue";
  if (r > 130 && b > 110 && g < 115) return "purple";
  if (r > 150 && g > 120 && b < 100) return "yellow";
  return "mixed";
}

function rgb(hex: string) {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}

function albumColorName(hex: string) {
  const names = namer(hex);
  const match = names.ntc[0] ?? names.x11[0] ?? names.html[0] ?? names.basic[0];
  return match?.name.toLowerCase() ?? "album color";
}
