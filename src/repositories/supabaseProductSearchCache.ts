import crypto from "node:crypto";
import type { ProductCandidate } from "@/src/domain/commerce/types";

export type ProductSearchCacheRecord = {
  cacheKey: string;
  query: string;
  provider: string;
  canonicalKey?: string;
  fetchedAt: string;
  expiresAt: string;
  products: ProductCandidate[];
  intentCategory?: string;
  intentGarmentType?: string;
};

type SupabaseProductSearchCacheRow = {
  cache_key: string;
  query: string;
  provider: string;
  fetched_at: string;
  expires_at: string;
  products: ProductCandidate[];
};

type SupabaseProductRow = {
  id: string;
  provider_product_id: string | null;
  retailer: string;
  brand: string | null;
  title: string;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  product_url: string;
  availability: string | null;
  category: string | null;
  garment_type: string | null;
  colors: string[] | null;
  materials: string[] | null;
  aesthetics: string[] | null;
};

type SupabaseProductSearchRow = {
  id: string;
  query: string;
  canonical_key: string;
  intent_category: string | null;
  intent_garment_type: string | null;
  fetched_at: string;
};

type SupabaseProductSearchResultRow = {
  search_id: string;
  product_id: string;
  position: number | null;
  source_rank: number | null;
  products: SupabaseProductRow | SupabaseProductRow[] | null;
};

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

export function isSupabaseProductCacheConfigured() {
  return Boolean(getSupabaseConfig());
}

export async function readSupabaseProductSearchCache(cacheKey: string): Promise<ProductSearchCacheRecord | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  try {
    const params = new URLSearchParams({
      select: "cache_key,query,provider,fetched_at,expires_at,products",
      cache_key: `eq.${cacheKey}`,
      limit: "1",
    });
    const response = await fetch(`${config.url}/rest/v1/product_search_cache?${params.toString()}`, {
      headers: supabaseHeaders(config),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const rows = await response.json() as SupabaseProductSearchCacheRow[];
    const row = rows[0];
    if (!row || Date.parse(row.expires_at) < Date.now()) return null;
    return fromRow(row);
  } catch {
    return null;
  }
}

export async function writeSupabaseProductSearchCache(record: ProductSearchCacheRecord) {
  const config = getSupabaseConfig();
  if (!config) return false;

  try {
    await Promise.all([
      upsertRows(config, "product_search_cache", "cache_key", [{
        cache_key: record.cacheKey,
        provider: record.provider,
        query: record.query,
        fetched_at: record.fetchedAt,
        expires_at: record.expiresAt,
        products: record.products,
        updated_at: new Date().toISOString(),
      }]),
      writeNormalizedProductSearch(config, record),
    ]);
    return true;
  } catch (error) {
    // Product caching is an optimization; recommendation generation should not fail if Supabase is unavailable.
    if (process.env.SUPABASE_CACHE_DEBUG === "true") console.warn(error);
    return false;
  }
}

export async function listSupabaseProducts({
  categories,
  queries = [],
  garmentTypes = [],
  offset = 0,
  limit = 24,
}: {
  categories: string[];
  queries?: string[];
  garmentTypes?: string[];
  offset?: number;
  limit?: number;
}): Promise<ProductCandidate[]> {
  const config = getSupabaseConfig();
  if (!config || !categories.length) return [];

  const searchProducts = await listSupabaseProductsFromSearchResults(config, {
    categories,
    queries,
    garmentTypes,
    offset,
    limit,
  });
  if (searchProducts.length) return searchProducts;

  return listSupabaseProductsFlat(config, { categories, garmentTypes, offset, limit });
}

async function listSupabaseProductsFromSearchResults(
  config: SupabaseConfig,
  {
    categories,
    queries = [],
    garmentTypes = [],
    offset = 0,
    limit = 24,
  }: {
    categories: string[];
    queries?: string[];
    garmentTypes?: string[];
    offset?: number;
    limit?: number;
  },
): Promise<ProductCandidate[]> {
  const searchParams = new URLSearchParams({
    select: "id,query,canonical_key,intent_category,intent_garment_type,fetched_at",
    intent_category: `in.(${categories.join(",")})`,
    expires_at: `gte.${new Date().toISOString()}`,
    order: "fetched_at.desc",
    limit: "80",
  });
  const filters = [
    ...queries.flatMap(searchQueryFilters),
    ...garmentTypes.flatMap(intentGarmentTypeFilters),
  ];
  if (filters.length) searchParams.set("or", `(${filters.join(",")})`);

  const searchResponse = await fetch(`${config.url}/rest/v1/product_searches?${searchParams.toString()}`, {
    headers: supabaseHeaders(config),
    cache: "no-store",
  });
  if (!searchResponse.ok) return [];

  const searches = await searchResponse.json() as SupabaseProductSearchRow[];
  if (!searches.length) return [];

  const orderedSearches = orderSearchesByIntent(searches, { queries, garmentTypes });
  const searchIds = orderedSearches.map((search) => search.id);
  const resultParams = new URLSearchParams({
    select: "search_id,product_id,position,source_rank,products(id,provider_product_id,retailer,brand,title,price,currency,image_url,product_url,availability,category,garment_type,colors,materials,aesthetics)",
    search_id: `in.(${searchIds.join(",")})`,
    order: "position.asc",
    limit: String(Math.max(1, Math.min(limit + offset + 80, 600))),
  });

  const resultResponse = await fetch(`${config.url}/rest/v1/product_search_results?${resultParams.toString()}`, {
    headers: supabaseHeaders(config),
    cache: "no-store",
  });
  if (!resultResponse.ok) return [];

  const rows = await resultResponse.json() as SupabaseProductSearchResultRow[];
  const searchOrder = new Map(searchIds.map((id, index) => [id, index]));
  const productRows = rows
    .map((row) => {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      if (!product) return null;
      return {
        product,
        position: row.position ?? row.source_rank ?? 999,
        searchIndex: searchOrder.get(row.search_id) ?? 999,
      };
    })
    .filter((entry): entry is { product: SupabaseProductRow; position: number; searchIndex: number } => Boolean(entry))
    .sort((a, b) => a.searchIndex - b.searchIndex || a.position - b.position);

  const byUrl = new Map<string, SupabaseProductRow>();
  for (const entry of productRows) {
    if (!byUrl.has(entry.product.product_url)) byUrl.set(entry.product.product_url, entry.product);
  }

  return Array.from(byUrl.values()).slice(offset, offset + limit).map(productFromRow);
}

async function listSupabaseProductsFlat(
  config: SupabaseConfig,
  {
    categories,
    garmentTypes = [],
    offset = 0,
    limit = 24,
  }: {
    categories: string[];
    garmentTypes?: string[];
    offset?: number;
    limit?: number;
  },
): Promise<ProductCandidate[]> {
  const params = new URLSearchParams({
    select: "id,provider_product_id,retailer,brand,title,price,currency,image_url,product_url,availability,category,garment_type,colors,materials,aesthetics",
    category: `in.(${categories.join(",")})`,
    order: "updated_at.desc",
    limit: String(Math.max(1, Math.min(limit, 200))),
    offset: String(Math.max(0, offset)),
  });
  if (garmentTypes.length) params.set("or", `(${garmentTypes.flatMap(garmentTypeFilters).join(",")})`);

  const response = await fetch(`${config.url}/rest/v1/products?${params.toString()}`, {
    headers: supabaseHeaders(config),
    cache: "no-store",
  });
  if (!response.ok) return [];

  const rows = await response.json() as SupabaseProductRow[];
  return rows.map(productFromRow);
}

function orderSearchesByIntent(searches: SupabaseProductSearchRow[], { queries, garmentTypes }: { queries: string[]; garmentTypes: string[] }) {
  if (!queries.length && !garmentTypes.length) return searches;
  const normalizedQueries = queries.map(normalizeSearchValue);
  const normalizedGarmentTypes = garmentTypes.map((garmentType) => garmentType.toLowerCase());
  return [...searches].sort((a, b) => {
    const leftQuery = Math.min(queryPriority(a.query, normalizedQueries), queryPriority(a.canonical_key, normalizedQueries));
    const rightQuery = Math.min(queryPriority(b.query, normalizedQueries), queryPriority(b.canonical_key, normalizedQueries));
    const leftIntent = intentPriority((a.intent_garment_type ?? "").toLowerCase(), normalizedGarmentTypes);
    const rightIntent = intentPriority((b.intent_garment_type ?? "").toLowerCase(), normalizedGarmentTypes);
    return leftQuery - rightQuery || leftIntent - rightIntent || Date.parse(b.fetched_at) - Date.parse(a.fetched_at);
  });
}

function queryPriority(value: string, orderedQueries: string[]) {
  const normalizedValue = normalizeSearchValue(value);
  const index = orderedQueries.findIndex((query) =>
    normalizedValue === query ||
    normalizedValue.includes(query) ||
    query.includes(normalizedValue)
  );
  return index >= 0 ? index : 999;
}

export function intentPriority(value: string, orderedGarmentTypes: string[]) {
  const index = orderedGarmentTypes.findIndex((garmentType) =>
    value === garmentType ||
    value.includes(garmentType) ||
    garmentType.includes(value)
  );
  return index >= 0 ? index : 999;
}

function searchQueryFilters(value: string) {
  const normalized = normalizeSearchValue(value);
  const escaped = normalized.replaceAll("\"", "\\\"");
  const loose = normalized.replaceAll("*", "").replaceAll(",", " ");
  return [
    `canonical_key.eq."${escaped}"`,
    `query.eq."${escaped}"`,
    `canonical_key.ilike.*${loose}*`,
    `query.ilike.*${loose}*`,
  ];
}

function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function intentGarmentTypeFilters(value: string) {
  const normalized = value.trim();
  const escaped = normalized.replaceAll("\"", "\\\"");
  return [
    `intent_garment_type.eq."${escaped}"`,
    `intent_garment_type.ilike.*${normalized.replaceAll("*", "").replaceAll(",", " ")}*`,
  ];
}

function garmentTypeFilters(value: string) {
  const normalized = value.trim();
  const escaped = normalized.replaceAll("\"", "\\\"");
  return [
    `garment_type.eq."${escaped}"`,
    `garment_type.ilike.*${normalized.replaceAll("*", "").replaceAll(",", " ")}*`,
  ];
}

async function writeNormalizedProductSearch(config: SupabaseConfig, record: ProductSearchCacheRecord) {
  await upsertRows(config, "product_searches", "id", [{
    id: record.cacheKey,
    provider: record.provider,
    query: record.query,
    canonical_key: record.canonicalKey ?? record.cacheKey,
    intent_category: record.intentCategory ?? firstDefined(record.products.map((product) => product.attributes.category)),
    intent_garment_type: record.intentGarmentType ?? firstDefined(record.products.map((product) => product.attributes.garmentType)),
    fetched_at: record.fetchedAt,
    expires_at: record.expiresAt,
    updated_at: new Date().toISOString(),
  }]);

  const productRows = record.products.map((product) => ({
    id: productKey(record.provider, product),
    provider_product_id: product.id ?? null,
    retailer: product.retailer,
    brand: product.brand ?? null,
    title: product.title,
    price: product.price ?? null,
    currency: product.currency ?? null,
    image_url: product.imageUrl ?? null,
    product_url: product.productUrl,
    availability: product.availability ?? null,
    category: product.attributes.category ?? null,
    garment_type: product.attributes.garmentType ?? null,
    colors: product.attributes.colors ?? [],
    materials: product.attributes.materials ?? [],
    aesthetics: product.attributes.aesthetics ?? [],
    updated_at: new Date().toISOString(),
  }));

  if (productRows.length) await upsertRows(config, "products", "id", productRows);

  const resultRows = record.products.map((product, index) => ({
    search_id: record.cacheKey,
    product_id: productKey(record.provider, product),
    position: index + 1,
    raw_score: null,
    source_rank: index + 1,
  }));

  if (resultRows.length) await upsertRows(config, "product_search_results", "search_id,product_id", resultRows);
}

async function upsertRows(config: SupabaseConfig, table: string, conflictTarget: string, rows: unknown[]) {
  const response = await fetch(`${config.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflictTarget)}`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(config),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Supabase upsert failed for ${table}: ${response.status} ${body.slice(0, 500)}`);
  }
}

function productKey(provider: string, product: ProductCandidate) {
  const stableId = product.productUrl || product.id;
  return crypto.createHash("sha256").update(`${provider}:${stableId}`.toLowerCase()).digest("hex");
}

function firstDefined(values: Array<string | undefined>) {
  return values.find((value): value is string => Boolean(value));
}

function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    return { url: parsed.toString().replace(/\/$/, ""), serviceRoleKey };
  } catch {
    return null;
  }
}

function supabaseHeaders(config: SupabaseConfig) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
  };
}

function fromRow(row: SupabaseProductSearchCacheRow): ProductSearchCacheRecord {
  return {
    cacheKey: row.cache_key,
    query: row.query,
    provider: row.provider,
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
    products: row.products,
  };
}

function productFromRow(row: SupabaseProductRow): ProductCandidate {
  return {
    id: row.id,
    retailer: row.retailer,
    title: row.title,
    brand: row.brand ?? undefined,
    price: Number(row.price ?? 0),
    currency: row.currency ?? "USD",
    imageUrl: row.image_url ?? "",
    productUrl: row.product_url,
    availability: row.availability ?? undefined,
    attributes: {
      category: row.category ?? undefined,
      garmentType: row.garment_type ?? undefined,
      colors: row.colors ?? [],
      materials: row.materials ?? [],
      aesthetics: row.aesthetics ?? [],
    },
  };
}
