# x402-grocery API reference

Base URL: your deployment (local default `http://localhost:4021`). Machine-readable spec: [openapi.json](https://github.com/nirholas/x402-grocery/blob/main/openapi.json).

All paid routes speak [x402](https://x402.org): call without payment → `402` + payment requirements; call with a valid `X-PAYMENT` header → `200` + artifact + `X-PAYMENT-RESPONSE` receipt header.

---

## GET /products — $0.002

Search grocery products.

| Query param | Required | Type | Description |
|-------------|----------|------|-------------|
| `q` | yes | string | Search term (`milk`, `peanut butter`, …) |
| `locationId` | no | string | Kroger store id — scopes prices/aisles to a store (live mode) |
| `limit` | no | int 1–50 | Max results, default 10 |

### Example

```
GET /products?q=milk&limit=5
```

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

### Errors

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{"error":"missing_query"}` | No `?q=` |
| 402 | payment requirements | No/invalid `X-PAYMENT` |
| 502 | `{"error":"upstream_error"}` | Kroger API failed (live mode) |

---

## POST /cart — $0.005

Build a fully priced cart from a shopping list. Each item is matched to the best product; out-of-stock and unmatched-UPC items get explicit substitutions.

### Request body

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

- `items` — 1–50 entries; each needs `query` or `upc`; `quantity` 1–99 (default 1).
- `locationId` — optional store scope (live mode).

### Response

```json
{
  "source": "fixture",
  "cartId": "cart_fixture_5f3a9c21",
  "locationId": "01400943",
  "builtAt": "2026-08-07T12:00:00.000Z",
  "lines": [
    {
      "requested": { "query": "whole milk", "quantity": 1 },
      "matched": { "productId": "0001111041700", "description": "Whole Milk, 1 Gallon", "price": { "regular": 3.49, "promo": 2.99 }, "aisle": "Dairy Wall 2" },
      "substituted": false,
      "substitutionNote": null,
      "unitPrice": 2.99,
      "lineTotal": 2.99
    }
  ],
  "summary": {
    "itemCount": 4,
    "matchedLines": 4,
    "unmatchedLines": 0,
    "substitutedLines": 0,
    "subtotal": 12.06,
    "estimatedTax": 0.78,
    "estimatedTotal": 12.84
  }
}
```

Notes:

- `unitPrice` uses the promo price when one exists.
- `estimatedTax` is a flat 6.5% estimate; groceries are taxed differently per jurisdiction.
- `cartId` is deterministic for a given item list in fixture mode (reproducible demos).

### Errors

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{"error":"missing_items"}` | Body missing `items[]` |
| 400 | `{"error":"too_many_items"}` | More than 50 items |
| 402 | payment requirements | No/invalid `X-PAYMENT` |
| 502 | `{"error":"upstream_error"}` | Kroger API failed (live mode) |

---

## Free routes

### GET /health

```json
{ "ok": true, "service": "x402-grocery", "source": "fixture", "network": "base-sepolia" }
```

### GET /.well-known/x402

The x402 discovery manifest: every paid resource with price, network, asset, and output schema.

---

## The 402 response

```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "2000",
      "resource": "http://localhost:4021/products",
      "description": "Grocery product search: real products with prices and aisle locations",
      "mimeType": "",
      "payTo": "0xYourAddress",
      "maxTimeoutSeconds": 300,
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    }
  ]
}
```

`maxAmountRequired` is USDC base units (6 decimals): `2000` = $0.002.
