# x402-grocery — agent skill

Grocery product search and cart building, paid per request with x402 micropayments (USDC on Base). Search real grocery products (live Kroger API when the operator has configured keys, clearly-labeled deterministic fixture data otherwise) and build fully priced carts with line totals, substitutions, and tax estimates. Every paid call returns the purchased artifact directly in the 200 response body — no accounts, no API keys, no subscriptions.

**Base URL**: `{BASE_URL}` (e.g. `http://localhost:4021` for local runs)

**Discovery**: `GET {BASE_URL}/.well-known/x402` (free, machine-readable resource list)

## Endpoints

### GET /products — $0.002

Search grocery products.

Query parameters:

| Param | Required | Description |
|-------|----------|-------------|
| `q` | yes | Search term, e.g. `milk` |
| `locationId` | no | Kroger store location id (live mode only) |
| `limit` | no | 1–50, default 10 |

Response (200, `application/json`):

```json
{
  "source": "fixture",
  "query": "milk",
  "locationId": "01400943",
  "count": 2,
  "products": [
    {
      "productId": "0001111041700",
      "upc": "0001111041700",
      "description": "Whole Milk, 1 Gallon",
      "brand": "Simple Truth",
      "category": "Dairy",
      "size": "1 gal",
      "price": { "regular": 3.49, "promo": 2.99 },
      "aisle": "Dairy Wall 2",
      "stockLevel": "HIGH"
    }
  ]
}
```

`source` is `"kroger"` when live Kroger credentials are configured on the server, `"fixture"` when the deterministic demo catalog is serving.

### POST /cart — $0.005

Build a priced cart from a shopping list.

Request body (`application/json`):

```json
{
  "items": [
    { "query": "whole milk", "quantity": 1 },
    { "query": "eggs", "quantity": 2 },
    { "upc": "0002100003563", "quantity": 1 }
  ],
  "locationId": "01400943"
}
```

Response (200): cart with `lines[]` (each line: `requested`, `matched` product, `substituted` flag, `substitutionNote`, `unitPrice`, `lineTotal`) and `summary` (`itemCount`, `matchedLines`, `unmatchedLines`, `substitutedLines`, `subtotal`, `estimatedTax`, `estimatedTotal`), plus `cartId`, `source`, `builtAt`.

## Payment

- Protocol: [x402](https://x402.org) (HTTP 402 Payment Required)
- Network: `base-sepolia` (testnet, default) or `base` (mainnet, operator-configured)
- Asset: USDC
- Facilitator: `https://x402.org/facilitator` (default)
- Flow: call the endpoint → receive `402` with payment requirements JSON → sign an USDC payment authorization → retry with `X-PAYMENT` header → receive `200` with the artifact and an `X-PAYMENT-RESPONSE` settlement header.
- Pay via `x402-fetch`, `x402-axios`, or any x402-compatible client. No account needed.

## Errors

| Code | Meaning |
|------|---------|
| 400 `missing_query` | `GET /products` without `?q=` |
| 400 `missing_items` / `too_many_items` | Bad `/cart` body (needs 1–50 items) |
| 402 | Payment required — retry with `X-PAYMENT` header |
| 502 `upstream_error` | Kroger API failure (live mode) |

## Free endpoints

- `GET /health` — service status and active data source
- `GET /.well-known/x402` — this service's x402 discovery manifest
