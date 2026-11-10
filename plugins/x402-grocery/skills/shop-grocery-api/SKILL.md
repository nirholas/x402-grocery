---
name: shop-grocery-api
description: Run and call the x402-grocery service to search grocery products and price a cart (Kroger API data) over HTTP, paying per call in USDC through x402. Use when an agent needs real grocery prices, promos, aisles or a priced basket.
---

# Shop with the x402-grocery API

x402-grocery is an Express service with two paid routes. Each paid route returns its artifact in the
200 body. Payment is x402 (HTTP 402) in USDC on Base or Solana.

Paying is irreversible. Before any paid call, show the user the route, price, network and payTo
address from the 402 response, and wait for an explicit yes.

## Run it

From a clone (the package is not published to npm):

```bash
git clone https://github.com/nirholas/x402-grocery
cd x402-grocery
npm install
npm run dev        # tsx src/server.ts, http://localhost:4021 (PORT overrides)
```

Live data needs `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET` (free Kroger developer account). Without
both, the service answers from a deterministic fixture catalog and sets `"source": "fixture"` in
every response. Always read `source` (also shown by `GET /health`) and tell the user when the data is
fixture data, not live Kroger prices.

Payment env vars: `PAY_TO_ADDRESS` and `NETWORK` (`base-sepolia` default, `base` for mainnet),
`SOLANA_PAY_TO_ADDRESS` and `SOLANA_NETWORK`, `FACILITATOR_URL`, `SOLANA_FACILITATOR_URL`.

## Routes

| Route | Price | Result |
|---|---|---|
| `GET /products?q=<term>` | $0.002 | Products with regular and promo price, size, aisle, stock |
| `POST /cart` | $0.005 | Priced cart: matched items, substitutions, line totals, subtotal, tax, grand total |
| `GET /health` | free | Liveness, data source, configured rails |
| `GET /.well-known/x402` | free | Discovery manifest |

`/products` takes `q` (required, else 400 `missing_query`), `limit` (1 to 50, default 10) and
`locationId` (Kroger store id). `/cart` takes
`{"items":[{"query":"whole milk","quantity":2}],"locationId":"..."}` with 1 to 50 items. Upstream
failures return 502 `upstream_error`.

## Paying

An unpaid call returns 402 with an `accepts` array listing both rails. Sign the entry your wallet
supports and retry with the base64 `X-PAYMENT` header. The settlement receipt is in the
`X-PAYMENT-RESPONSE` header and in the body's `payment` field. The reference client is
`npm run client` (`examples/agent-client.ts`, uses `x402-fetch`).

## Example

```bash
curl -s localhost:4021/health
curl -i 'localhost:4021/products?q=whole%20milk&limit=2'    # 402 with accepts[]
curl -s localhost:4021/cart -H 'content-type: application/json' \
  -d '{"items":[{"query":"whole milk","quantity":1},{"query":"eggs","quantity":2}]}'
```
