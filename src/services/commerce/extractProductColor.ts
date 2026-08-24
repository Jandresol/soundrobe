import sharp from "sharp";

const imageColorCache = new Map<string, string[]>();
const imageFetchTimeoutMs = 2500;

export async function extractProductColorsFromImage(imageUrl: string | undefined) {
  if (!imageUrl) return [];
  const cached = imageColorCache.get(imageUrl);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), imageFetchTimeoutMs);
    const response = await fetch(imageUrl, { cache: "force-cache", signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return [];

    const input = Buffer.from(await response.arrayBuffer());
    const { data } = await sharp(input)
      .resize(64, 64, { fit: "inside", withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const colors = dominantProductColors(data);
    imageColorCache.set(imageUrl, colors);
    return colors;
  } catch {
    return [];
  }
}

export function productColorNameFromRgb(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness = (max + min) / 510;
  const hue = rgbHue(r, g, b);

  if (lightness < 0.18) return "black";
  if (lightness > 0.88 && saturation < 0.16) return "white";
  if (saturation < 0.12) return lightness > 0.68 ? "silver" : "charcoal";
  if (hue >= 28 && hue <= 52 && lightness > 0.72) return "cream";
  if (lightness < 0.32 && r > g && g >= b + 4) return "chocolate";
  if (hue >= 22 && hue <= 58 && lightness <= 0.58) return r > 145 && g > 78 ? "rust" : "chocolate";
  if ((hue >= 345 || hue <= 14) && lightness < 0.52) return "burgundy";
  if (hue >= 15 && hue < 28) return "rust";
  if (hue >= 52 && hue < 72) return "gold";
  if (hue >= 72 && hue < 165) return "olive green";
  if (hue >= 165 && hue < 205) return "turquoise";
  if (hue >= 205 && hue < 255) return lightness < 0.24 ? "navy" : "denim";
  if (hue >= 255 && hue < 310) return "grape";
  if (hue >= 310 && hue < 345) return lightness < 0.55 ? "burgundy" : "pink";
  return "brown";
}

function dominantProductColors(data: Buffer) {
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (let index = 0; index < data.length; index += 3) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    if (r === undefined || g === undefined || b === undefined) continue;
    if (isLikelyBackground(r, g, b)) continue;
    const key = `${Math.round(r / 32)},${Math.round(g / 32)},${Math.round(b / 32)}`;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  return unique(
    Array.from(buckets.values())
      .filter((bucket) => bucket.count >= 10)
      .sort((a, b) => colorBucketScore(b) - colorBucketScore(a))
      .slice(0, 3)
      .map((bucket) => productColorNameFromRgb(
        Math.round(bucket.r / bucket.count),
        Math.round(bucket.g / bucket.count),
        Math.round(bucket.b / bucket.count),
      ))
      .filter((color) => !["white", "silver"].includes(color) || buckets.size <= 2)
  ).slice(0, 2);
}

function isLikelyBackground(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness = (max + min) / 510;
  return lightness > 0.9 && saturation < 0.12;
}

function colorBucketScore(bucket: { r: number; g: number; b: number; count: number }) {
  const r = bucket.r / bucket.count;
  const g = bucket.g / bucket.count;
  const b = bucket.b / bucket.count;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness = (max + min) / 510;
  return bucket.count * (0.7 + saturation * 1.1 + (1 - Math.abs(lightness - 0.45)) * 0.25);
}

function rgbHue(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  if (delta === 0) return 0;
  const hue = max === rn
    ? ((gn - bn) / delta) % 6
    : max === gn
      ? (bn - rn) / delta + 2
      : (rn - gn) / delta + 4;
  return (hue * 60 + 360) % 360;
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
