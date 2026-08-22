import type { Garment, MusicProfile, Outfit, StyleProfile } from "@/types/soundrobe";

export const musicProfile: MusicProfile = {
  userName: "Jasmine",
  genres: [
    { name: "Neo-soul", value: 29 },
    { name: "Punk", value: 23 },
    { name: "R&B", value: 21 },
    { name: "Rock", value: 17 },
    { name: "Other", value: 10 },
  ],
  eras: [
    { name: "1970s", value: 12 },
    { name: "1980s", value: 7 },
    { name: "1990s", value: 22 },
    { name: "2000s", value: 31 },
    { name: "2010s", value: 16 },
    { name: "2020s", value: 12 },
  ],
  moodTags: [
    { name: "Sensual", value: 66 },
    { name: "Experimental", value: 57 },
    { name: "Polished", value: 42 },
  ],
  trackTags: [
    { name: "soul", value: 100 },
    { name: "r&b", value: 84 },
    { name: "smooth", value: 62 },
  ],
  artists: [
    { name: "Erykah Badu", label: "neo-soul" },
    { name: "The Slits", label: "punk" },
    { name: "Aaliyah", label: "R&B" },
    { name: "The Strokes", label: "rock" },
    { name: "The Faint", label: "2000s alt" },
  ],
  tracks: [
    { name: "On & On", artists: ["Erykah Badu"], albumName: "Baduizm", releaseYear: 1997, value: 100 },
    { name: "Try Again", artists: ["Aaliyah"], albumName: "Romeo Must Die", releaseYear: 2000, value: 84 },
    { name: "Last Nite", artists: ["The Strokes"], albumName: "Is This It", releaseYear: 2001, value: 72 },
  ],
  albums: [
    { name: "Baduizm", artists: ["Erykah Badu"], value: 100 },
    { name: "Romeo Must Die", artists: ["Aaliyah"], value: 84 },
    { name: "Is This It", artists: ["The Strokes"], value: 72 },
  ],
  traits: [
    { name: "Rebellious", value: 89 },
    { name: "Earthy", value: 81 },
    { name: "Nostalgic", value: 76 },
    { name: "Sensual", value: 66 },
    { name: "Experimental", value: 57 },
    { name: "Polished", value: 42 },
  ],
};

export const styleProfile: StyleProfile = {
  styleThread:
    "Earthy soulfulness meets the harder edge of 90s and 2000s alternative culture. Rich, dark colors and lived-in textures are balanced by fitted silhouettes and polished gold details.",
  palette: [
    { name: "Black", hex: "#111111" },
    { name: "Earth Green", hex: "#596247" },
    { name: "Burgundy", hex: "#641F32" },
    { name: "Faded Cream", hex: "#D8C9AE" },
    { name: "Gold", hex: "#B99146" },
  ],
  fashionSignals: [
    { name: "Rebellious", value: 89 },
    { name: "Earthy", value: 81 },
    { name: "Nostalgic", value: 76 },
    { name: "Sensual", value: 66 },
    { name: "Experimental", value: 57 },
    { name: "Polished", value: 42 },
  ],
  signaturePieces: [],
};

export const garments: Garment[] = [
  {
    id: "worn-leather-jacket",
    name: "Worn Leather Jacket",
    category: "outerwear",
    price: 280,
    influences: ["Punk", "2000s alternative", "Rock"],
    eras: ["1990s", "2000s"],
    explanation:
      "Your punk and rock listening introduces harder textures and hardware, while the worn finish keeps it compatible with the earthier neo-soul side of your profile.",
  },
  {
    id: "burgundy-fitted-knit",
    name: "Burgundy Fitted Knit",
    category: "top",
    price: 120,
    influences: ["R&B", "Neo-soul"],
    eras: ["1990s", "2000s"],
    explanation:
      "The warm burgundy settles right into your neo-soul and R&B references, bringing a softer, more polished layer to the harder pieces around it.",
  },
  {
    id: "dark-low-rise-jeans",
    name: "Dark Low-Rise Jeans",
    category: "bottom",
    price: 140,
    influences: ["2000s rock", "R&B", "Punk"],
    eras: ["2000s"],
    explanation:
      "Low-rise denim is a classic bridge between your 2000s rock edge and your R&B-inspired fitted silhouettes.",
  },
  {
    id: "graphic-baby-tee",
    name: "Graphic Baby Tee",
    category: "top",
    price: 60,
    influences: ["2000s pop-rock", "Punk"],
    eras: ["2000s"],
    explanation:
      "The graphic tee echoes the playful, slightly rebellious part of your 2000s listening while keeping the overall look rooted in everyday wear.",
  },
  {
    id: "earthy-patterned-scarf",
    name: "Earthy Patterned Scarf",
    category: "accessory",
    price: 75,
    influences: ["Neo-soul", "Earthy"],
    eras: ["1970s", "1990s"],
    explanation:
      "The scarf introduces texture and color from your soul roots, softening the harder pieces while reinforcing your earthy palette.",
  },
  {
    id: "gold-hoop-earrings",
    name: "Gold Hoop Earrings",
    category: "accessory",
    price: 90,
    influences: ["R&B", "Neo-soul"],
    eras: ["1990s", "2000s"],
    explanation:
      "Gold hoops pull in the sleek, confident polish of your R&B and neo-soul references without overpowering the rebellious core.",
  },
  {
    id: "black-shoulder-bag",
    name: "Black Leather Shoulder Bag",
    category: "accessory",
    price: 160,
    influences: ["Punk", "Alternative", "Rock"],
    eras: ["2000s"],
    explanation:
      "The compact shoulder bag reflects the practicality of 2000s alternative dressing while keeping your look streamlined and intentional.",
  },
  {
    id: "black-boots",
    name: "Black Worn Boots",
    category: "shoe",
    price: 220,
    influences: ["Punk", "Alternative", "Rock"],
    eras: ["1990s", "2000s"],
    explanation:
      "Heavy boots ground the whole outfit, giving the wardrobe the lived-in edge of punk and rock without losing your softer, soulful sensibility.",
  },
  {
    id: "black-tank",
    name: "Black Ribbed Tank",
    category: "top",
    price: 55,
    influences: ["R&B", "Alternative"],
    eras: ["1990s", "2000s"],
    explanation: "A fitted black tank gives you the sleek baseline your R&B influences need while staying strong enough for the edgier side of your taste.",
  },
  {
    id: "cropped-denim-jacket",
    name: "Cropped Denim Jacket",
    category: "outerwear",
    price: 170,
    influences: ["Rock", "Alternative"],
    eras: ["1990s", "2000s"],
    explanation: "The cropped cut nods to 90s and 2000s alternative culture, especially the layering and utility that show up in your deeper rock references.",
  },
  {
    id: "studded-belt",
    name: "Studded Belt",
    category: "accessory",
    price: 95,
    influences: ["Punk", "Rock"],
    eras: ["1990s", "2000s"],
    explanation: "Hardware and stud detailing are the visual shorthand for the tougher, louder side of your music profile.",
  },
  {
    id: "cream-knit-cardigan",
    name: "Cream Knit Cardigan",
    category: "top",
    price: 130,
    influences: ["Neo-soul", "1970s soul"],
    eras: ["1970s", "1990s"],
    explanation: "The cream knit references the warmth and softness of older soul textures, giving the wardrobe a lived-in and human quality.",
  },
  {
    id: "slip-skirt",
    name: "Dark Slip Skirt",
    category: "bottom",
    price: 110,
    influences: ["R&B", "Neo-soul"],
    eras: ["1990s", "2000s"],
    explanation: "A slim skirt adds the sleek sensuality of your R&B and soul taste while still feeling grounded in your darker palette.",
  },
  {
    id: "converse-low",
    name: "Low Converse",
    category: "shoe",
    price: 90,
    influences: ["Punk", "Alternative", "2000s pop-rock"],
    eras: ["2000s"],
    explanation: "A light skate reference brings in the casual rebellion of your pop-rock years without flattening the more elevated pieces.",
  },
];

export const defaultLook: Outfit = {
  id: "after-dark",
  name: "LOOK 01 — AFTER DARK",
  description: "Worn leather, burgundy knit, low-rise denim, gold hoops, scarf, boots.",
  garmentIds: [
    "worn-leather-jacket",
    "burgundy-fitted-knit",
    "dark-low-rise-jeans",
    "gold-hoop-earrings",
    "earthy-patterned-scarf",
    "black-boots",
  ],
};

export const lookPresets: Outfit[] = [
  defaultLook,
  {
    id: "record-store",
    name: "LOOK 02 — RECORD STORE",
    description: "Graphic tee, leather jacket, black bag, denim, Converse, chain details.",
    garmentIds: [
      "graphic-baby-tee",
      "cropped-denim-jacket",
      "dark-low-rise-jeans",
      "black-shoulder-bag",
      "converse-low",
      "studded-belt",
    ],
  },
  {
    id: "late-train",
    name: "LOOK 03 — LATE TRAIN",
    description: "Dark tank, slip skirt, boots, scarf, cream cardigan, gold hoops.",
    garmentIds: [
      "black-tank",
      "cream-knit-cardigan",
      "slip-skirt",
      "black-boots",
      "earthy-patterned-scarf",
      "gold-hoop-earrings",
    ],
  },
];

export const provenance = [
  { label: "PUNK", values: ["100%"] },
  { label: "NEO-SOUL", values: ["86%"] },
  { label: "R&B", values: ["74%"] },
  { label: "2000S ROCK", values: ["61%"] },
];

export const defaultSavedGarments: string[] = [
  "worn-leather-jacket",
  "burgundy-fitted-knit",
  "gold-hoop-earrings",
  "black-boots",
];

export const defaultSavedLooks: string[] = ["after-dark", "record-store"];
