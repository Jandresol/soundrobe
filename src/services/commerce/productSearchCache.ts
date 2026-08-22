import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { ProductCandidate } from "@/src/domain/commerce/types";

const CACHE_DIR = path.join(process.cwd(), ".cache", "products");
const DEFAULT_TTL_DAYS = 30;

type CachedProductSearch = {
  query: string;
  provider: string;
  fetchedAt: string;
  expiresAt: string;
  products: ProductCandidate[];
};

export async function readProductSearchCache(query: string, provider: string): Promise<ProductCandidate[] | null> {
  try {
    const payload = JSON.parse(await readFile(cachePath(query, provider), "utf8")) as CachedProductSearch;
    if (payload.query !== query || payload.provider !== provider) return null;
    if (Date.parse(payload.expiresAt) < Date.now()) return null;
    return payload.products;
  } catch {
    return null;
  }
}

export async function writeProductSearchCache(query: string, provider: string, products: ProductCandidate[], ttlDays = DEFAULT_TTL_DAYS) {
  await mkdir(CACHE_DIR, { recursive: true });
  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt);
  expiresAt.setDate(expiresAt.getDate() + ttlDays);
  const payload: CachedProductSearch = {
    query,
    provider,
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    products,
  };
  await writeFile(cachePath(query, provider), JSON.stringify(payload, null, 2));
}

function cachePath(query: string, provider: string) {
  const key = crypto.createHash("sha256").update(`${provider}:${query.toLowerCase().trim()}`).digest("hex");
  return path.join(CACHE_DIR, `${key}.json`);
}
