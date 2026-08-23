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
  offset = 0,
  limit = 24,
}: {
  categories: string[];
  offset?: number;
  limit?: number;
}): Promise<ProductCandidate[]> {
  const config = getSupabaseConfig();
  if (!config || !categories.length) return [];

  const params = new URLSearchParams({
    select: "id,provider_product_id,retailer,brand,title,price,currency,image_url,product_url,availability,category,garment_type,colors,materials,aesthetics",
    category: `in.(${categories.join(",")})`,
    order: "updated_at.desc",
    limit: String(Math.max(1, Math.min(limit, 60))),
    offset: String(Math.max(0, offset)),
  });

  const response = await fetch(`${config.url}/rest/v1/products?${params.toString()}`, {
    headers: supabaseHeaders(config),
    cache: "no-store",
  });
  if (!response.ok) return [];

  const rows = await response.json() as SupabaseProductRow[];
  return rows.map(productFromRow);
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
