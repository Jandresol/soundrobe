export const MUSIC_TIME_WEIGHTS = {
  longTerm: 0.5,
  mediumTerm: 0.3,
  shortTerm: 0.2,
} as const;

export const PRODUCT_SCORE_WEIGHTS = {
  garmentType: 32,
  color: 18,
  material: 15,
  silhouette: 10,
  aesthetic: 12,
  era: 7,
  priority: 10,
  availability: 6,
  priceFit: 8,
} as const;

export const OUTFIT_SCORE_WEIGHTS = {
  averageProductMatch: 0.45,
  colorCompatibility: 0.18,
  silhouetteCompatibility: 0.12,
  styleCoverage: 0.15,
  musicInfluenceCoverage: 0.18,
  redundancyPenalty: 0.12,
} as const;
