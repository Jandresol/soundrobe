import type { PaletteColor, StyleProfile } from "@/src/domain/style/types";
import { COLOR_FAMILIES, COLOR_HEX, colorCompatibilityScore } from "@/src/knowledge/colorCompatibility";

export function generatePalette(styleProfile: StyleProfile, albumColors: PaletteColor[] = []): PaletteColor[] {
  const selected: PaletteColor[] = [];
  for (const color of albumColors.sort((a, b) => colorUsefulness(b.hex) - colorUsefulness(a.hex) || b.score - a.score)) {
    if (!canAddAlbumColor(selected, color)) continue;
    selected.push(color);
    if (selected.length === 3) break;
  }
  for (const color of styleProfile.colors) {
    if (!COLOR_HEX[color.id]) continue;
    const family = COLOR_FAMILIES[color.id];
    const trial = [...selected.map((entry) => entry.name.toLowerCase()), color.id];
    const duplicateFamily = selected.filter((entry) => colorFamily(entry.hex, entry.name) === family).length;
    if (duplicateFamily > 0 && !["neutral", "metal"].includes(family)) continue;
    if (colorCompatibilityScore(trial) < 0.45) continue;
    selected.push({ name: color.label, hex: COLOR_HEX[color.id], score: color.weight, sources: styleProfile.sourcesBySignal[color.id] ?? [] });
    if (selected.length === 5) break;
  }
  if (selected.length < 5) {
    for (const fallback of fallbackColors(styleProfile)) {
      if (selected.some((entry) => entry.hex.toLowerCase() === fallback.hex.toLowerCase())) continue;
      if (!canAddAlbumColor(selected, fallback) && selected.length < 3) continue;
      selected.push(fallback);
      if (selected.length === 5) break;
    }
  }
  return selected;
}

function canAddAlbumColor(selected: PaletteColor[], color: PaletteColor) {
  if (selected.some((entry) => entry.hex.toLowerCase() === color.hex.toLowerCase())) return false;
  if (selected.some((entry) => colorDistance(entry.hex, color.hex) < 72)) return false;
  const family = colorFamily(color.hex, color.name);
  const familyCount = selected.filter((entry) => colorFamily(entry.hex, entry.name) === family).length;
  return familyCount === 0 || ["neutral", "metal"].includes(family);
}

function fallbackColors(styleProfile: StyleProfile): PaletteColor[] {
  return ["black", "white", "denim", "silver", "cream"]
    .filter((id) => COLOR_HEX[id])
    .map((id) => ({
      name: id,
      hex: COLOR_HEX[id],
      score: styleProfile.colors.find((color) => color.id === id)?.weight ?? 30,
      sources: styleProfile.sourcesBySignal[id] ?? [],
    }));
}

function colorUsefulness(hex: string) {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness = (max + min) / 510;
  const contrastFromMidBrown = Math.abs(r - 145) + Math.abs(g - 105) + Math.abs(b - 70);
  return saturation * 100 + (1 - Math.abs(lightness - 0.48)) * 45 + contrastFromMidBrown * 0.08;
}

function colorFamily(hex: string, name: string) {
  const named = COLOR_FAMILIES[name.toLowerCase()];
  if (named) return named;
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 510;
  const saturation = max === 0 ? 0 : (max - min) / max;
  if (lightness < 0.24) return "neutral";
  if (saturation < 0.18) return "neutral";
  if (r > g + 24 && r > b + 24) return "red";
  if (r > 110 && g > 70 && b < 85) return "brown";
  if (g > r + 12 && g > b + 12) return "green";
  if (b > r + 18 && b > g + 12) return "blue";
  if (r > 130 && b > 110 && g < 110) return "purple";
  if (r > 150 && g > 120 && b < 95) return "yellow";
  return "mixed";
}

function colorDistance(a: string, b: string) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2);
}

function rgb(hex: string) {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}
