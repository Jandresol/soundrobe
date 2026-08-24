import { NextRequest, NextResponse } from "next/server";
import { listSupabaseProducts } from "@/src/repositories/supabaseProductSearchCache";

const categoryMap: Record<string, string[]> = {
  top: ["top"],
  bottom: ["bottom"],
  dress: ["dress"],
  outerwear: ["outerwear"],
  shoe: ["shoes"],
  accessory: ["bag", "jewelry", "accessory"],
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category") ?? "";
  const categories = categoryMap[category] ?? [];
  const offset = Number(searchParams.get("offset") ?? 0);
  const limit = Number(searchParams.get("limit") ?? 24);
  const garmentTypes = (searchParams.get("garmentTypes") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const queries = (searchParams.get("queries") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!categories.length) {
    return NextResponse.json({ products: [] });
  }

  const products = await listSupabaseProducts({
    categories,
    queries,
    garmentTypes,
    offset: Number.isFinite(offset) ? offset : 0,
    limit: Number.isFinite(limit) ? limit : 24,
  });

  return NextResponse.json({ products: dedupeProducts(products) });
}

function dedupeProducts<T extends { id: string; productUrl?: string; retailer: string; title: string; price?: number }>(products: T[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = product.productUrl || `${product.id}:${product.retailer}:${product.title}:${product.price ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
