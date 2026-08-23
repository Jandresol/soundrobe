import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { ProductCandidate } from "@/src/domain/commerce/types";
import { readSupabaseProductSearchCache, writeSupabaseProductSearchCache } from "@/src/repositories/supabaseProductSearchCache";

const CACHE_DIR = path.join(process.cwd(), ".cache", "products");
const DEFAULT_TTL_DAYS = 30;

type CachedProductSearch = {
  query: string;
  provider: string;
  canonicalKey?: string;
  intentCategory?: string;
  intentGarmentType?: string;
  fetchedAt: string;
  expiresAt: string;
  products: ProductCandidate[];
};

type ProductSearchCacheMetadata = {
  canonicalKey?: string;
  intentCategory?: string;
  intentGarmentType?: string;
};

export async function readProductSearchCache(query: string, provider: string): Promise<ProductCandidate[] | null> {
  const key = cacheKey(query, provider);
  const supabasePayload = await readSupabaseProductSearchCache(key);
  if (supabasePayload?.query === query && supabasePayload.provider === provider) return supabasePayload.products;

  try {
    const payload = JSON.parse(await readFile(cachePathFromKey(key), "utf8")) as CachedProductSearch;
    if (payload.query !== query || payload.provider !== provider) return null;
    if (Date.parse(payload.expiresAt) < Date.now()) return null;
    await writeSupabaseProductSearchCache({
      cacheKey: key,
      query: payload.query,
      provider: payload.provider,
      canonicalKey: payload.canonicalKey,
      fetchedAt: payload.fetchedAt,
      expiresAt: payload.expiresAt,
      products: payload.products,
      intentCategory: payload.intentCategory,
      intentGarmentType: payload.intentGarmentType,
    });
    return payload.products;
  } catch {
    return null;
  }
}

export async function writeProductSearchCache(
  query: string,
  provider: string,
  products: ProductCandidate[],
  ttlDays = DEFAULT_TTL_DAYS,
  metadata: ProductSearchCacheMetadata = {},
) {
  const key = cacheKey(query, provider);
  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt);
  expiresAt.setDate(expiresAt.getDate() + ttlDays);
  const payload: CachedProductSearch = {
    query,
    provider,
    canonicalKey: metadata.canonicalKey,
    intentCategory: metadata.intentCategory,
    intentGarmentType: metadata.intentGarmentType,
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    products,
  };
  await Promise.all([
    writeLocalProductSearchCache(key, payload),
    writeSupabaseProductSearchCache({ cacheKey: key, ...payload }),
  ]);
}

async function writeLocalProductSearchCache(key: string, payload: CachedProductSearch) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(cachePathFromKey(key), JSON.stringify(payload, null, 2));
  } catch {
    // Local file caching is best-effort so production can rely on Supabase instead.
  }
}

function cachePathFromKey(key: string) {
  return path.join(CACHE_DIR, `${key}.json`);
}

function cacheKey(query: string, provider: string) {
  return crypto.createHash("sha256").update(`${provider}:${query.toLowerCase().trim()}`).digest("hex");
}
