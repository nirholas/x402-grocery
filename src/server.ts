import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { paymentMiddleware, type RoutesConfig } from "x402-express";
import { activeSource, buildCart, searchProducts, type CartItemRequest } from "./service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

const payTo = process.env.PAY_TO_ADDRESS;
if (!payTo || !payTo.startsWith("0x")) {
  console.error(
    "FATAL: PAY_TO_ADDRESS is not set.\n" +
      "Set PAY_TO_ADDRESS to the EVM address that should receive USDC payments, e.g.\n" +
      "  PAY_TO_ADDRESS=0xYourAddress npm run dev",
  );
  process.exit(1);
}

const network = process.env.NETWORK === "base" ? "base" : "base-sepolia";
const facilitatorUrl = (process.env.FACILITATOR_URL ?? "https://x402.org/facilitator") as `${string}://${string}`;

const PRICES: Record<string, string> = {
  "GET /products": "$0.002",
  "POST /cart": "$0.005",
};

const routes: RoutesConfig = {
  "GET /products": {
    price: PRICES["GET /products"],
    network,
    config: { description: "Grocery product search: real products with prices and aisle locations" },
  },
  "POST /cart": {
    price: PRICES["POST /cart"],
    network,
    config: { description: "Build a priced grocery cart with line prices, totals, and substitutions" },
  },
};

const app = express();
app.use(express.json({ limit: "256kb" }));

// Payment middleware — free routes are not in the route map.
app.use(paymentMiddleware(payTo as `0x${string}`, routes, { url: facilitatorUrl }));

// ----- Free routes -----

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "x402-grocery", source: activeSource(), network });
});

app.get("/.well-known/x402", (_req, res) => {
  const manifest = JSON.parse(readFileSync(path.join(PUBLIC_DIR, ".well-known", "x402"), "utf8"));
  res.type("application/json").json(manifest);
});

app.use(express.static(PUBLIC_DIR, { dotfiles: "allow" }));

// ----- Paid routes -----

app.get("/products", async (req, res) => {
  try {
    const term = String(req.query.q ?? "").trim();
    if (!term) {
      res.status(400).json({ error: "missing_query", message: "Provide ?q=<search term>" });
      return;
    }
    const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 10) || 10));
    const locationId = req.query.locationId ? String(req.query.locationId) : undefined;
    res.json(await searchProducts(term, locationId, limit));
  } catch (err) {
    res.status(502).json({ error: "upstream_error", message: (err as Error).message });
  }
});

app.post("/cart", async (req, res) => {
  try {
    const body = req.body as { items?: CartItemRequest[]; locationId?: string };
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      res.status(400).json({
        error: "missing_items",
        message: 'Body must be {"items":[{"query":"milk","quantity":2}, ...], "locationId"?: "..."}',
      });
      return;
    }
    if (body.items.length > 50) {
      res.status(400).json({ error: "too_many_items", message: "Maximum 50 items per cart" });
      return;
    }
    res.json(await buildCart(body.items, body.locationId));
  } catch (err) {
    res.status(502).json({ error: "upstream_error", message: (err as Error).message });
  }
});

const port = Number(process.env.PORT ?? 4021);
app.listen(port, () => {
  console.log(`x402-grocery listening on http://localhost:${port}`);
  console.log(`  mode: ${activeSource()} | network: ${network} | payTo: ${payTo}`);
  console.log("  paid routes:");
  for (const [route, price] of Object.entries(PRICES)) {
    console.log(`    ${route.padEnd(18)} ${price}`);
  }
  console.log("  free routes: GET /health, GET /.well-known/x402");
});
