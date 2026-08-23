import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ProductCandidate } from "@/src/domain/commerce/types";
import { isSupabaseProductCacheConfigured, writeSupabaseProductSearchCache } from "@/src/repositories/supabaseProductSearchCache";

const cacheDir = path.join(process.cwd(), ".cache", "products");

type LocalProductSearchCache = {
  query: string;
  provider: string;
  canonicalKey?: string;
  intentCategory?: string;
  intentGarmentType?: string;
  fetchedAt: string;
  expiresAt: string;
  products: ProductCandidate[];
};

loadLocalEnv();

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !isSupabaseProductCacheConfigured()) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  const files = await readdir(cacheDir).catch(() => []);
  const jsonFiles = files.filter((file) => file.endsWith(".json")).sort();
  let valid = 0;
  let expired = 0;
  let skipped = 0;
  let written = 0;
  let productCount = 0;

  for (const file of jsonFiles) {
    const payload = await readLocalCacheFile(path.join(cacheDir, file));
    if (!payload) {
      skipped += 1;
      continue;
    }
    if (Date.parse(payload.expiresAt) < Date.now()) {
      expired += 1;
      continue;
    }

    valid += 1;
    productCount += payload.products.length;
    if (dryRun) continue;

    const didWrite = await writeSupabaseProductSearchCache({
      cacheKey: cacheKey(payload.query, payload.provider),
      query: payload.query,
      provider: payload.provider,
      canonicalKey: payload.canonicalKey ?? payload.query.toLowerCase().replace(/\s+/g, " ").trim(),
      fetchedAt: payload.fetchedAt,
      expiresAt: payload.expiresAt,
      products: payload.products,
      intentCategory: payload.intentCategory,
      intentGarmentType: payload.intentGarmentType,
    });
    if (didWrite) written += 1;
    else skipped += 1;
  }

  console.log(JSON.stringify({
    dryRun,
    localFiles: jsonFiles.length,
    valid,
    expired,
    skipped,
    written,
    products: productCount,
  }, null, 2));
}

async function readLocalCacheFile(filePath: string): Promise<LocalProductSearchCache | null> {
  try {
    const payload = JSON.parse(await readFile(filePath, "utf8")) as LocalProductSearchCache;
    if (!payload.query || !payload.provider || !payload.fetchedAt || !payload.expiresAt || !Array.isArray(payload.products)) return null;
    return payload;
  } catch {
    return null;
  }
}

function cacheKey(query: string, provider: string) {
  return crypto.createHash("sha256").update(`${provider}:${query.toLowerCase().trim()}`).digest("hex");
}

function loadLocalEnv() {
  try {
    const content = readFileSync(".env.local", "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      process.env[match[1]] ??= match[2];
    }
  } catch {
    // Optional for deployed/CI environments where env vars are already injected.
  }
}
