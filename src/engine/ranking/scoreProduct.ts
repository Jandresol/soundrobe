import { PRODUCT_SCORE_WEIGHTS } from "@/src/config/recommendationWeights";
import type { ProductCandidate, ProductMatchReason } from "@/src/domain/commerce/types";
import type { GarmentIntent, ShoppingPreferences } from "@/src/domain/style/types";

const hasAny = (wanted: string[], actual?: string[]) => wanted.some((item) => actual?.map((value) => value.toLowerCase()).includes(item.toLowerCase()));
const includesAny = (text: string, tokens: string[]) => tokens.some((token) => text.includes(token));

const activewearTokens = [
  "activewear",
  "athletic",
  "barry's",
  "barrys",
  "gym",
  "lululemon",
  "performance",
  "pilates",
  "racerback",
  "running",
  "sports bra",
  "tennis",
  "training",
  "workout",
  "yoga",
];

const activewearIntentTokens = [
  "activewear",
  "athletic",
  "gorpcore",
  "gym",
  "practical",
  "running",
  "sporty",
  "technical",
  "tennis",
  "track",
  "utility",
  "workout",
];

const preppyProductTokens = [
  "button front",
  "button-front",
  "button down",
  "button-down",
  "chino",
  "collared",
  "cotton button",
  "plaid cotton pleated",
  "polo",
  "private school",
  "rowing blazers",
  "rugby shirt",
  "school uniform",
  "shirt dress",
  "shirtdress",
  "tennis skirt",
];

const preppyIntentTokens = [
  "classic",
  "clean",
  "coquette",
  "ivy",
  "minimal",
  "old money",
  "prep",
  "preppy",
  "quiet luxury",
  "sporty",
  "tennis",
];

const romanticProductTokens = [
  "floral",
  "flower",
  "prairie",
  "rose print",
];

const romanticIntentTokens = [
  "bohemian",
  "boho",
  "coquette",
  "ethereal",
  "folk",
  "prairie",
  "romantic",
  "soft",
  "spring",
];

const retroDiscoProductTokens = [
  "1970s",
  "70s",
  "disco",
  "retro",
  "vintage",
];

const retroDiscoIntentTokens = [
  "1970s",
  "70s",
  "1980s",
  "80s",
  "boogie",
  "classic pop",
  "disco",
  "funk",
  "motown",
  "nightlife",
  "post-disco",
  "retro",
  "vintage",
];

const sensualProductTokens = [
  "bodycon",
  "corset",
  "lace",
  "low rise",
  "low-rise",
  "micro",
  "mini",
  "sheer",
  "slingback",
  "slip",
  "strappy",
  "tube",
];

const clubProductTokens = [
  "bodycon",
  "chain",
  "mesh",
  "metallic",
  "mini",
  "patent",
  "platform",
  "sequin",
  "sheer",
  "strappy",
];

const streetProductTokens = [
  "baggy",
  "baseball cap",
  "cargo",
  "chain",
  "low rise",
  "low-rise",
  "parachute",
  "sneaker",
  "varsity",
  "wide leg",
  "wide-leg",
];

const softPopProductTokens = [
  "ariana grande",
  "yours truly",
  "sweetener",
  "thank u next",
  "glinda",
];

const softPopIntentTokens = [
  "ariana grande",
  "clean girl",
  "coquette",
  "dream pop",
  "glossy pop",
  "minimal",
  "pop princess",
  "soft girl",
  "soft pop",
];

const y2kTattooProductTokens = [
  "affliction",
  "ed hardy",
  "flame",
  "flaming",
  "eagle",
  "skull",
  "scorpion",
  "tattoo",
  "tramp stamp",
  "tribal",
];

const leatherMotoProductTokens = [
  "biker",
  "leather jacket",
  "moto",
  "motorcycle",
];

const gothGraphicProductTokens = [
  "bat",
  "cross",
  "dark angel",
  "forest witch",
  "goth",
  "gothic",
  "hell babes",
  "natural born sinner",
  "sinner",
  "studded wings",
  "vamp",
  "witch",
];

const costumeGothProductTokens = [
  "costume",
  "gothic floral",
  "halloween",
  "punkdesign",
  "punk design",
  "vampire",
  "witchy costume",
];

const cyberGraphicProductTokens = [
  "cyber",
  "cyber sigilism",
  "cybersigilism",
  "sigil",
  "trompe l'oeil",
  "trompe",
  "8 ball",
];

const layeredRomanticProductTokens = [
  "frilly",
  "lace ruffle",
  "lacy",
  "ruffle",
  "tiered",
];

const genericBasicProductTokens = [
  "basic",
  "bamboo cotton",
  "built-in bra",
  "cargo pocket",
  "cargo pockets",
  "cotton linen",
  "double layer",
  "double-layer",
  "double lined",
  "everyday",
  "essential",
  "essentials",
  "generic",
  "hoodie",
  "minimalist",
  "organic cotton",
  "plain tee",
  "round neck",
  "sleeveless round neck",
  "soft breathable",
  "solid",
  "sweatshirt",
  "ultrasoft",
];

const massBasicRetailerTokens = [
  "a new day",
  "amazon essentials",
  "free assembly",
  "gap",
  "h&m",
  "kohl's",
  "lands' end",
  "old navy",
  "target",
  "universal thread",
  "walmart",
];

const matureBasicRetailerTokens = [
  "jessica london",
  "m&s",
  "macys",
  "macy's",
  "marks & spencer",
  "yumi",
];

const matureBasicProductTokens = [
  "boat neck",
  "business casual",
  "crew neck",
  "dolman sleeve",
  "high neck knit",
  "knitted top with lace sleeves",
  "office",
  "professional",
  "ribbed crew",
  "ribbed knitted",
  "ribbed slim fit",
  "ribbed t-shirt",
  "sweater",
  "turtleneck",
  "work",
];

const matureFriendlyIntentTokens = [
  "classic",
  "modest",
  "office",
  "preppy",
  "professional",
  "quiet luxury",
  "workwear",
];

const blockedExpressiveRetailerTokens = [
  "h&m",
];

const expressiveProductIdentityTokens = [
  "affliction",
  "akira",
  "animal print",
  "asymmetric",
  "biker",
  "body chain",
  "bodycon",
  "chainmail",
  "combat",
  "corset",
  "cowl",
  "cyber",
  "distressed",
  "draped",
  "ed hardy",
  "engineer boot",
  "goth",
  "grommet",
  "hardware",
  "leather jacket",
  "leather moto",
  "leather pants",
  "leather boot",
  "leopard",
  "mesh",
  "metallic",
  "moto",
  "motorcycle",
  "knee high",
  "knee-high",
  "patent",
  "pointed",
  "platform",
  "sculptural",
  "sequin",
  "sheer",
  "studded",
  "tattoo",
  "tripp nyc",
  "unusual",
];

const artistMerchProductTokens = [
  "ariana grande",
  "beyonce",
  "britney spears",
  "lady gaga",
  "nirvana",
  "paramore",
  "taylor swift",
];

const artistMerchIntentTokens = [
  "ariana grande",
  "band tee",
  "concert",
  "fan",
  "merch",
  "music tee",
  "pop princess",
  "soft girl",
  "soft pop",
  "clean girl",
  "glossy pop",
];

const animalPrintProductTokens = [
  "animal print",
  "cheetah",
  "leopard",
  "zebra",
];

const animalPrintIntentTokens = [
  "animal print",
  "animal-print",
  "baddie",
  "cheetah",
  "club",
  "glam",
  "leopard",
  "party",
  "sexy",
];

const expressiveIntentTokens = [
  "baddie",
  "club",
  "cyber",
  "dark",
  "digital",
  "distressed",
  "goth",
  "industrial",
  "mall-punk",
  "mcbling",
  "offbeat",
  "party",
  "punk",
  "rave",
  "rebellious",
  "riot-grrrl",
  "sexy",
  "sharp",
  "street",
  "y2k",
];

const basicFriendlyIntentTokens = [
  "casual",
  "clean",
  "clean girl",
  "classic",
  "everyday",
  "minimal",
  "quiet luxury",
  "soft",
  "soft girl",
];

const retailerStyleAffinities: Array<{ tokens: string[]; signals: string[] }> = [
  { tokens: ["akira", "edikted", "house of cb", "oh polly", "princess polly", "windsor"], signals: ["club", "party", "sexy", "sensual", "confident", "glossy", "y2k"] },
  { tokens: ["fashion nova"], signals: ["sexy", "sensual", "baddie"] },
  { tokens: ["dolls kill", "disturbia", "hot topic", "killstar", "minga london", "tripp nyc"], signals: ["goth", "dark", "punk", "industrial", "grunge", "rebellious"] },
  { tokens: ["free people", "anthropologie", "urban outfitters"], signals: ["indie", "boho", "folk", "dream pop", "soft", "romantic", "soft girl"] },
  { tokens: ["aritzia", "cos", "mango", "reformation", "zara"], signals: ["polished", "sleek", "minimal", "glossy"] },
  { tokens: ["affliction", "ed hardy"], signals: ["mcbling", "y2k", "baddie", "rebellious", "mall-punk"] },
  { tokens: ["asos", "h&m", "target"], signals: ["pop", "casual", "playful"] },
  { tokens: ["depop", "grailed", "ssense"], signals: ["archive", "street", "downtown", "experimental"] },
];

function productText(product: ProductCandidate) {
  return `${product.title} ${product.brand ?? ""} ${product.retailer}`.toLowerCase();
}

function intentText(intent: GarmentIntent) {
  return [
    intent.garmentType,
    ...intent.aesthetics,
    ...intent.materials,
    ...intent.silhouettes,
    ...intent.eras,
    ...intent.musicSources.flatMap((source) => [source.id, source.label]),
  ].join(" ").toLowerCase();
}

function isMenswearProduct(text: string) {
  return /\b(men'?s|mens|male|boys?)\b/.test(text) && !/\b(women'?s|womens|female)\b/.test(text);
}

function inferProductStyleSignals(text: string) {
  const signals = new Set<string>();
  if (includesAny(text, leatherMotoProductTokens)) {
    signals.add("rebellious");
    signals.add("punk");
    signals.add("rock");
    signals.add("distressed");
  }
  if (includesAny(text, sensualProductTokens)) {
    signals.add("sensual");
    signals.add("confident");
  }
  if (includesAny(text, clubProductTokens)) {
    signals.add("club");
    signals.add("glossy");
  }
  if (includesAny(text, streetProductTokens)) {
    signals.add("street");
    signals.add("confident");
  }
  if (includesAny(text, softPopProductTokens)) {
    signals.add("soft girl");
    signals.add("clean girl");
    signals.add("glossy");
    signals.add("pop");
  }
  if (includesAny(text, y2kTattooProductTokens)) {
    signals.add("mcbling");
    signals.add("y2k");
    signals.add("rebellious");
    signals.add("baddie");
  }
  if (includesAny(text, gothGraphicProductTokens)) {
    signals.add("goth");
    signals.add("dark");
    signals.add("rebellious");
  }
  if (includesAny(text, cyberGraphicProductTokens)) {
    signals.add("cyber");
    signals.add("digital");
    signals.add("offbeat");
  }
  if (includesAny(text, layeredRomanticProductTokens)) {
    signals.add("romantic");
    signals.add("soft");
    signals.add("whimsical");
  }
  return signals;
}

function retailerAffinitySignals(text: string) {
  return retailerStyleAffinities.flatMap((affinity) => includesAny(text, affinity.tokens) ? affinity.signals : []);
}

function matchesWantedInAttrsOrTitle(wanted: string[], actual: string[] | undefined, text: string) {
  return hasAny(wanted, actual) || includesAny(text, wanted.map((value) => value.toLowerCase()));
}

function signalMatchesDesired(signal: string, desiredText: string) {
  const normalized = signal.toLowerCase();
  if (desiredText.includes(normalized)) return true;
  if (normalized === "rebellious") return includesAny(desiredText, ["riot-grrrl", "punk", "gothic", "goth", "hard rock", "rock"]);
  if (normalized === "punk") return includesAny(desiredText, ["riot-grrrl", "feminist", "hard rock", "alternative rock", "rock"]);
  if (normalized === "rock") return includesAny(desiredText, ["alternative rock", "hard rock", "punk", "riot-grrrl"]);
  if (normalized === "dark") return includesAny(desiredText, ["goth", "gothic", "industrial", "moody"]);
  return false;
}

function tokensFor(value?: string) {
  return (value ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

function hasMeaningfulGarmentTypeOverlap(productType: string | undefined, intentType: string) {
  const normalizedProduct = productType?.toLowerCase() ?? "";
  const normalizedIntent = intentType.toLowerCase();
  if (normalizedProduct.includes(normalizedIntent) || normalizedIntent.includes(normalizedProduct)) return true;
  const productTokens = new Set(tokensFor(productType));
  const intentTokens = tokensFor(intentType);
  return intentTokens.some((token) => productTokens.has(token));
}

function hasSpecificGarmentTypeMatch(productType: string | undefined, intentType: string) {
  const normalizedProduct = productType?.toLowerCase() ?? "";
  const normalizedIntent = intentType.toLowerCase();
  return Boolean(normalizedProduct) && (normalizedProduct === normalizedIntent || normalizedProduct.includes(normalizedIntent) || normalizedIntent.includes(normalizedProduct));
}

function missesRequiredDistinctiveSignal(text: string, intentType: string) {
  const normalizedIntent = intentType.toLowerCase();
  if (includesAny(normalizedIntent, ["leopard", "cheetah", "animal-print", "animal print"])) {
    return !includesAny(text, ["leopard", "cheetah", "animal print", "animal-print"]);
  }
  if (normalizedIntent.includes("stiletto")) {
    return !includesAny(text, ["stiletto", "heel", "pump"]);
  }
  if (normalizedIntent.includes("body chain")) {
    return !includesAny(text, ["body chain", "belly chain", "harness necklace"]);
  }
  return false;
}

function missesContextualStyleWorld(text: string, desiredText: string) {
  if (includesAny(text, preppyProductTokens) && !includesAny(desiredText, preppyIntentTokens)) {
    return true;
  }
  if (
    includesAny(text, softPopProductTokens) &&
    includesAny(desiredText, expressiveIntentTokens) &&
    !includesAny(desiredText, softPopIntentTokens)
  ) {
    return true;
  }
  if (includesAny(text, romanticProductTokens) && !includesAny(desiredText, romanticIntentTokens)) {
    return true;
  }
  if (includesAny(text, retroDiscoProductTokens) && !includesAny(desiredText, retroDiscoIntentTokens)) {
    return true;
  }
  if (
    includesAny(text, [...gothGraphicProductTokens, ...costumeGothProductTokens]) &&
    !includesAny(desiredText, ["dark", "goth", "gothic", "industrial", "moody", "dramatic", "witchy", "mall goth", "whimsigoth"])
  ) {
    return true;
  }
  if (includesAny(text, artistMerchProductTokens) && !includesAny(desiredText, artistMerchIntentTokens)) {
    return true;
  }
  if (includesAny(text, animalPrintProductTokens) && !includesAny(desiredText, animalPrintIntentTokens)) {
    return true;
  }
  if (
    includesAny(text, layeredRomanticProductTokens) &&
    includesAny(desiredText, expressiveIntentTokens) &&
    !includesAny(desiredText, ["bohemian", "boho", "coquette", "fairy", "soft girl", "whimsical"])
  ) {
    return true;
  }
  return false;
}

function isBlandBasicForExpressiveIntent(text: string, desiredText: string, inferredSignals: Set<string>, affinitySignals: string[]) {
  if (!includesAny(text, genericBasicProductTokens)) return false;
  if (!includesAny(desiredText, expressiveIntentTokens)) return false;
  if (includesAny(desiredText, basicFriendlyIntentTokens)) return false;
  const contextualSignals = new Set([...inferredSignals, ...affinitySignals].map((signal) => signal.toLowerCase()));
  return ![...contextualSignals].some((signal) => expressiveIntentTokens.includes(signal));
}

function isCookieCutterForExpressiveIntent(text: string, desiredText: string, inferredSignals: Set<string>, affinitySignals: string[]) {
  if (!includesAny(desiredText, expressiveIntentTokens)) return false;
  if (includesAny(desiredText, basicFriendlyIntentTokens)) return false;
  if (!includesAny(text, [...genericBasicProductTokens, ...massBasicRetailerTokens])) return false;
  if (includesAny(text, expressiveProductIdentityTokens)) return false;
  const contextualSignals = new Set([...inferredSignals, ...affinitySignals].map((signal) => signal.toLowerCase()));
  return ![...contextualSignals].some((signal) => expressiveIntentTokens.includes(signal));
}

function isMassBasicRetailerInExpressiveLane(text: string, desiredText: string) {
  if (!includesAny(text, massBasicRetailerTokens)) return false;
  if (!includesAny(desiredText, expressiveIntentTokens)) return false;
  if (includesAny(desiredText, basicFriendlyIntentTokens)) return false;
  return true;
}

function isMatureBasicForDiscoveryIntent(text: string, desiredText: string) {
  if (!includesAny(text, [...matureBasicRetailerTokens, ...matureBasicProductTokens])) return false;
  if (includesAny(desiredText, matureFriendlyIntentTokens)) return false;
  if (includesAny(text, expressiveProductIdentityTokens)) return false;
  return true;
}

function isBlockedExpressiveRetailer(text: string, desiredText: string) {
  if (!includesAny(text, blockedExpressiveRetailerTokens)) return false;
  if (!includesAny(desiredText, expressiveIntentTokens)) return false;
  if (includesAny(desiredText, basicFriendlyIntentTokens)) return false;
  return true;
}

function mismatchesJewelryIntent(productType: string | undefined, intentType: string) {
  const normalizedProduct = productType?.toLowerCase() ?? "";
  if (!normalizedProduct) return false;
  if (!["gold jewelry", "silver jewelry", "statement jewelry", "pearl jewelry"].includes(intentType.toLowerCase())) return false;
  if (includesAny(normalizedProduct, ["scarf", "bag", "cap", "sunglasses", "belt", "gloves", "tights"])) return true;
  return false;
}

function isDistinctiveProductType(productType?: string) {
  const normalized = productType?.toLowerCase() ?? "";
  return includesAny(normalized, [
    "animal-print",
    "animal print",
    "body chain",
    "cheetah",
    "leopard",
    "stiletto",
  ]);
}

export function scoreProduct(product: ProductCandidate, intent: GarmentIntent, preferences?: ShoppingPreferences) {
  const reasons: ProductMatchReason[] = [];
  const text = productText(product);
  if (isMenswearProduct(text)) {
    return { score: 0, reasons };
  }
  if (product.attributes.category && product.attributes.category !== intent.category) {
    return { score: 0, reasons };
  }
  const desiredText = intentText(intent);
  if (missesContextualStyleWorld(text, desiredText)) {
    return { score: 0, reasons };
  }
  if (isMatureBasicForDiscoveryIntent(text, desiredText)) {
    return { score: 0, reasons };
  }
  if (isBlockedExpressiveRetailer(text, desiredText)) {
    return { score: 0, reasons };
  }
  if (mismatchesJewelryIntent(product.attributes.garmentType, intent.garmentType)) {
    return { score: 0, reasons };
  }
  if (missesRequiredDistinctiveSignal(text, intent.garmentType)) {
    return { score: 0, reasons };
  }
  if (isDistinctiveProductType(product.attributes.garmentType) && !hasMeaningfulGarmentTypeOverlap(product.attributes.garmentType, intent.garmentType)) {
    return { score: 0, reasons };
  }
  if (intent.category === "shoes" && product.attributes.garmentType && !hasMeaningfulGarmentTypeOverlap(product.attributes.garmentType, intent.garmentType)) {
    return { score: 0, reasons };
  }
  const add = (signal: string, source: string, contribution: number) => {
    if (contribution > 0) reasons.push({ signal, source, contribution });
  };
  const inferredSignals = inferProductStyleSignals(text);
  const affinitySignals = retailerAffinitySignals(text);
  if (isBlandBasicForExpressiveIntent(text, desiredText, inferredSignals, affinitySignals)) {
    return { score: 0, reasons };
  }
  if (isCookieCutterForExpressiveIntent(text, desiredText, inferredSignals, affinitySignals)) {
    return { score: 0, reasons };
  }
  const textMatchesIntent = [...inferredSignals].some((signal) => signalMatchesDesired(signal, desiredText));
  const affinityMatchesIntent = affinitySignals.some((signal) => desiredText.includes(signal));
  const productAesthetics = (product.attributes.aesthetics ?? []).filter((signal) => {
    const normalized = signal.toLowerCase();
    return inferredSignals.has(normalized) || includesAny(text, [normalized]);
  });

  add(intent.garmentType, "garment type", hasSpecificGarmentTypeMatch(product.attributes.garmentType, intent.garmentType) ? PRODUCT_SCORE_WEIGHTS.garmentType : 0);
  add(intent.colors.join(", "), "color", matchesWantedInAttrsOrTitle(intent.colors, product.attributes.colors, text) ? PRODUCT_SCORE_WEIGHTS.color : 0);
  add(intent.materials.join(", "), "material", matchesWantedInAttrsOrTitle(intent.materials, product.attributes.materials, text) ? PRODUCT_SCORE_WEIGHTS.material : 0);
  add(intent.silhouettes.join(", "), "silhouette", hasAny(intent.silhouettes, product.attributes.silhouettes) ? PRODUCT_SCORE_WEIGHTS.silhouette : 0);
  add(intent.aesthetics.join(", "), "aesthetic", hasAny(intent.aesthetics, productAesthetics) ? PRODUCT_SCORE_WEIGHTS.aesthetic : 0);
  add(intent.eras.join(", "), "era", hasAny(intent.eras, product.attributes.eras) ? PRODUCT_SCORE_WEIGHTS.era : 0);
  add([...inferredSignals].join(", "), "product text", textMatchesIntent ? PRODUCT_SCORE_WEIGHTS.productTextSignal : 0);
  add(affinitySignals.slice(0, 3).join(", "), "retailer fit", affinityMatchesIntent ? PRODUCT_SCORE_WEIGHTS.retailerStyleAffinity : 0);
  add("music priority", "style engine", Math.round((intent.priority / 100) * PRODUCT_SCORE_WEIGHTS.priority));
  add(product.availability ?? "availability", "commerce", product.availability === "in_stock" ? PRODUCT_SCORE_WEIGHTS.availability : 0);
  if (preferences?.maxPrice && product.price <= preferences.maxPrice) add("budget", "shopping preferences", PRODUCT_SCORE_WEIGHTS.priceFit);
  const offContextPenalty = includesAny(text, activewearTokens) && !includesAny(desiredText, activewearIntentTokens) ? PRODUCT_SCORE_WEIGHTS.offContextPenalty : 0;
  const massBasicRetailerPenalty = isMassBasicRetailerInExpressiveLane(text, desiredText) ? PRODUCT_SCORE_WEIGHTS.massBasicRetailerPenalty : 0;
  const score = Math.max(0, Math.min(100, Math.round(reasons.reduce((sum, reason) => sum + reason.contribution, 0) - offContextPenalty - massBasicRetailerPenalty)));
  return { score, reasons };
}
