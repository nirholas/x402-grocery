import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  activeRails,
  mountSolanaCheckout,
  paymentReceipt,
  paywall,
  usingSuiteDefaultPayTo,
  type RoutePrices,
} from "./payments.js";
import { activeSource, buildCart, searchProducts, type CartItemRequest } from "./service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

const PRICES: RoutePrices = {
  "GET /products": "$0.002",
  "POST /cart": "$0.005",
};

const app = express();
app.use(express.json({ limit: "256kb" }));

// ----- Free routes (declared before the paywall so they stay free) -----

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "x402-grocery",
    source: activeSource(),
    rails: activeRails().map((r) => ({ rail: r.rail, network: r.network })),
  });
});

app.get("/.well-known/x402", (_req, res) => {
  const manifest = JSON.parse(readFileSync(path.join(PUBLIC_DIR, ".well-known", "x402"), "utf8"));
  res.type("application/json").json(manifest);
});

app.use(express.static(PUBLIC_DIR, { dotfiles: "allow" }));

// Solana checkout helpers (prepare/encode) for wallets that sign serialized txs.
await mountSolanaCheckout(app);

// ----- Paywall: dual-rail x402, USDC on Base or Solana -----
app.use(paywall(PRICES, { service: "x402-grocery" }));

// ----- Paid routes: every one returns the purchased artifact in the 200 body -----

app.get("/products", async (req, res) => {
  try {
    const term = String(req.query.q ?? "").trim();
    if (!term) {
      res.status(400).json({ error: "missing_query", message: "Provide ?q=<search term>" });
      return;
    }
    const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 10) || 10));
    const locationId = req.query.locationId ? String(req.query.locationId) : undefined;
    const result = await searchProducts(term, locationId, limit);
    res.json({ ...result, payment: paymentReceipt(res) });
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
    const cart = await buildCart(body.items, body.locationId);
    res.json({ ...cart, payment: paymentReceipt(res) });
  } catch (err) {
    res.status(502).json({ error: "upstream_error", message: (err as Error).message });
  }
});

const port = Number(process.env.PORT ?? 4021);
app.listen(port, () => {
  console.log(`x402-grocery listening on http://localhost:${port}`);
  console.log(`  data source: ${activeSource()}`);
  console.log("  payment rails:");
  for (const rail of activeRails()) {
    console.log(`    ${rail.rail.padEnd(7)} ${rail.network.padEnd(14)} → ${rail.payTo}`);
  }
  if (usingSuiteDefaultPayTo()) {
    console.log(
      "  note: using suite default payTo — set PAY_TO_ADDRESS/SOLANA_PAY_TO_ADDRESS to receive funds yourself",
    );
  }
  console.log("  paid routes:");
  for (const [route, price] of Object.entries(PRICES)) {
    console.log(`    ${route.padEnd(18)} ${price}`);
  }
  console.log("  free routes: GET /health, GET /.well-known/x402");
});
