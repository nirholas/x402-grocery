import {
  FIXTURE_LOCATION,
  searchFixtureProducts,
  type Product,
} from "./fixtures.js";
import { krogerConfigured, krogerSearchProducts } from "./kroger.js";

export type Source = "kroger" | "fixture";

export interface ProductSearchResult {
  source: Source;
  query: string;
  locationId: string | null;
  count: number;
  products: Product[];
}

export interface CartItemRequest {
  query?: string;
  upc?: string;
  quantity?: number;
}

export interface CartLine {
  requested: { query?: string; upc?: string; quantity: number };
  matched: Product | null;
  substituted: boolean;
  substitutionNote: string | null;
  unitPrice: number;
  lineTotal: number;
}

export interface CartResult {
  source: Source;
  cartId: string;
  locationId: string | null;
  builtAt: string;
  lines: CartLine[];
  summary: {
    itemCount: number;
    matchedLines: number;
    unmatchedLines: number;
    substitutedLines: number;
    subtotal: number;
    estimatedTax: number;
    estimatedTotal: number;
  };
}

const TAX_RATE = 0.065;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function activeSource(): Source {
  return krogerConfigured() ? "kroger" : "fixture";
}

export async function searchProducts(
  term: string,
  locationId: string | undefined,
  limit: number,
): Promise<ProductSearchResult> {
  const source = activeSource();
  const products =
    source === "kroger"
      ? await krogerSearchProducts(term, locationId, limit)
      : searchFixtureProducts(term, limit);
  return {
    source,
    query: term,
    locationId: locationId ?? (source === "fixture" ? FIXTURE_LOCATION.locationId : null),
    count: products.length,
    products,
  };
}

/** Deterministic cart id derived from the request so fixture runs are reproducible. */
function cartIdFor(items: CartItemRequest[], source: Source): string {
  const seed = JSON.stringify(items);
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `cart_${source}_${h.toString(16).padStart(8, "0")}`;
}

export async function buildCart(
  items: CartItemRequest[],
  locationId: string | undefined,
): Promise<CartResult> {
  const source = activeSource();
  const lines: CartLine[] = [];

  for (const item of items) {
    const quantity = Math.max(1, Math.min(99, Math.floor(item.quantity ?? 1)));
    const term = item.upc ?? item.query ?? "";
    const candidates =
      source === "kroger"
        ? await krogerSearchProducts(term, locationId, 5)
        : searchFixtureProducts(term, 5);

    let matched: Product | null = null;
    let substituted = false;
    let substitutionNote: string | null = null;

    if (item.upc) {
      matched = candidates.find((p) => p.upc === item.upc) ?? null;
      if (!matched && candidates.length > 0) {
        matched = candidates[0];
        substituted = true;
        substitutionNote = `UPC ${item.upc} not found; substituted closest match "${matched.description}"`;
      }
    } else if (candidates.length > 0) {
      matched = candidates[0];
    }

    if (matched && matched.stockLevel === "TEMPORARILY_OUT_OF_STOCK") {
      const alt = candidates.find((p) => p.productId !== matched?.productId && p.stockLevel !== "TEMPORARILY_OUT_OF_STOCK");
      if (alt) {
        substitutionNote = `"${matched.description}" is out of stock; substituted "${alt.description}"`;
        matched = alt;
        substituted = true;
      }
    }

    const unitPrice = matched ? matched.price.promo ?? matched.price.regular : 0;
    lines.push({
      requested: { query: item.query, upc: item.upc, quantity },
      matched,
      substituted,
      substitutionNote,
      unitPrice: round2(unitPrice),
      lineTotal: round2(unitPrice * quantity),
    });
  }

  const matchedLines = lines.filter((l) => l.matched !== null);
  const subtotal = round2(matchedLines.reduce((sum, l) => sum + l.lineTotal, 0));
  const estimatedTax = round2(subtotal * TAX_RATE);

  return {
    source,
    cartId: cartIdFor(items, source),
    locationId: locationId ?? (source === "fixture" ? FIXTURE_LOCATION.locationId : null),
    builtAt: new Date().toISOString(),
    lines,
    summary: {
      itemCount: lines.reduce((sum, l) => sum + l.requested.quantity, 0),
      matchedLines: matchedLines.length,
      unmatchedLines: lines.length - matchedLines.length,
      substitutedLines: lines.filter((l) => l.substituted).length,
      subtotal,
      estimatedTax,
      estimatedTotal: round2(subtotal + estimatedTax),
    },
  };
}
