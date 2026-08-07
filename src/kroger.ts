// Live Kroger API adapter — used when KROGER_CLIENT_ID and KROGER_CLIENT_SECRET are set.
// Docs: https://developer.kroger.com/reference (free developer account)

import type { Product } from "./fixtures.js";

const KROGER_BASE = process.env.KROGER_BASE_URL ?? "https://api.kroger.com/v1";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function krogerConfigured(): boolean {
  return Boolean(process.env.KROGER_CLIENT_ID && process.env.KROGER_CLIENT_SECRET);
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const basic = Buffer.from(
    `${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`,
  ).toString("base64");
  const res = await fetch(`${KROGER_BASE}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });
  if (!res.ok) {
    throw new Error(`Kroger token request failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

interface KrogerProduct {
  productId: string;
  upc?: string;
  description?: string;
  brand?: string;
  categories?: string[];
  items?: Array<{
    price?: { regular?: number; promo?: number };
    size?: string;
    inventory?: { stockLevel?: string };
  }>;
  aisleLocations?: Array<{ description?: string; number?: string }>;
}

function mapProduct(kp: KrogerProduct): Product {
  const item = kp.items?.[0];
  const aisleLoc = kp.aisleLocations?.[0];
  const stock = item?.inventory?.stockLevel;
  return {
    productId: kp.productId,
    upc: kp.upc ?? kp.productId,
    description: kp.description ?? "Unknown product",
    brand: kp.brand ?? "Unknown",
    category: kp.categories?.[0] ?? "General",
    size: item?.size ?? "",
    price: {
      regular: item?.price?.regular ?? 0,
      promo: item?.price?.promo && item.price.promo > 0 ? item.price.promo : null,
    },
    aisle: aisleLoc?.description ?? (aisleLoc?.number ? `Aisle ${aisleLoc.number}` : "Unknown aisle"),
    stockLevel:
      stock === "LOW" ? "LOW" : stock === "TEMPORARILY_OUT_OF_STOCK" ? "TEMPORARILY_OUT_OF_STOCK" : "HIGH",
  };
}

export async function krogerSearchProducts(
  term: string,
  locationId: string | undefined,
  limit: number,
): Promise<Product[]> {
  const token = await getToken();
  const params = new URLSearchParams({ "filter.term": term, "filter.limit": String(limit) });
  if (locationId) params.set("filter.locationId", locationId);
  const res = await fetch(`${KROGER_BASE}/products?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Kroger product search failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { data: KrogerProduct[] };
  return data.data.map(mapProduct);
}
