export const COLOR_HEX: Record<string, string> = {
  black: "#111111",
  white: "#ffffff",
  silver: "#c7c7c7",
  burgundy: "#641f32",
  "earth green": "#596247",
  cream: "#d8c9ae",
  gold: "#b99146",
  denim: "#303f58",
  chocolate: "#4a2c22",
  lilac: "#bca7ff",
  "ice blue": "#9bd8ff",
  "hot pink": "#ff3eb5",
  "acid green": "#b8ff38",
  camel: "#b98248",
  rust: "#a04e2f",
  navy: "#1c2f55",
  plum: "#4b244a",
  "smoky pink": "#d49ab7",
};

export const COLOR_FAMILIES: Record<string, string> = {
  black: "neutral",
  white: "neutral",
  silver: "neutral",
  cream: "warm-neutral",
  gold: "metal",
  burgundy: "deep",
  "earth green": "earth",
  denim: "cool-neutral",
  chocolate: "earth",
  camel: "earth",
  rust: "earth",
  lilac: "cool",
  "ice blue": "cool",
  navy: "cool-neutral",
  "hot pink": "bright",
  "acid green": "bright",
  plum: "deep",
  "smoky pink": "soft",
};

export function colorCompatibilityScore(colors: string[]) {
  const families = new Set(colors.map((color) => COLOR_FAMILIES[color] ?? color));
  const hasNeutral = colors.some((color) => ["black", "white", "silver", "cream", "denim"].includes(color));
  const brightCount = colors.filter((color) => COLOR_FAMILIES[color] === "bright").length;
  return Math.max(0, Math.min(1, 0.35 + (hasNeutral ? 0.3 : 0) + (families.size <= 4 ? 0.25 : 0) - Math.max(0, brightCount - 1) * 0.18));
}
