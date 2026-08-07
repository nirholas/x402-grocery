# API reference — x402-grocery

Base URL: `http://localhost:4021` locally, or your deployment's origin.

All paid routes answer `402` when called without an `X-PAYMENT` header, and the 402 body lists **both** payment rails. See [tutorial.md](tutorial.md) for the end-to-end flow and [agents.md](agents.md) for the agent integration.

---

## `GET /products`

**$0.002** · Search grocery products with prices, promos, aisle locations and stock levels.

Full-text search across the grocery catalog. Returns each product's identifiers, brand, package size, regular and promotional price, the aisle it sits in, and its current stock level. Pass a `locationId` to price against a specific store.

### Parameters

| Name | In | Type | Required | Default | Description |
|---|---|---|---|---|---|
| `q` | query | string | **yes** | — | Search term, e.g. `whole milk`. |
| `limit` | query | integer | no | `10` | Maximum products to return (1–50). |
| `locationId` | query | string | no | — | Kroger store id to price against. Omit for the default location. |

### Example

```bash
curl -s 'http://localhost:4021/products?q=whole%20milk&limit=2'
```

### Response `200`

matching products with regular and promo prices, size, aisle, and stock level. The `payment` field mirrors the `X-PAYMENT-RESPONSE` header.

```json
{
  "source": "fixture",
  "query": "whole milk",
  "locationId": "01400376",
  "count": 2,
  "products": [
    {
      "productId": "0001111041700",
      "upc": "0001111041700",
      "description": "Kroger Vitamin D Whole Milk",
      "brand": "Kroger",
      "category": "Dairy",
      "size": "1 gal",
      "price": {
        "regular": 3.79,
        "promo": 3.29
      },
      "aisle": "Dairy",
      "stockLevel": "HIGH"
    },
    {
      "productId": "0007084300001",
      "upc": "0007084300001",
      "description": "Horizon Organic Whole Milk",
      "brand": "Horizon Organic",
      "category": "Dairy",
      "size": "64 fl oz",
      "price": {
        "regular": 5.49,
        "promo": null
      },
      "aisle": "Dairy",
      "stockLevel": "HIGH"
    }
  ],
  "payment": {
    "success": true,
    "rail": "evm",
    "network": "base-sepolia",
    "transaction": "0x9c1f…",
    "payer": "0xA11ce…",
    "amount": "2000",
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "resource": "http://localhost:4021/products"
  }
}
```

### Errors

`400 missing_query` when `?q=` is absent or blank. `502 upstream_error` when Kroger rejects the search or is unreachable.

---

## `POST /cart`

**$0.005** · Build a fully priced cart from a shopping list, substituting out-of-stock items.

Takes a shopping list of free-text queries and/or UPCs with quantities. Each line is matched against the catalog; a UPC that doesn't resolve or a product that's temporarily out of stock is substituted with the closest in-stock match and the substitution is recorded on the line. Returns every line plus a summary with subtotal, estimated tax, and estimated total. One price regardless of line count.

### Request body

```json
{
  "items": [
    {
      "query": "whole milk",
      "quantity": 1
    },
    {
      "query": "eggs",
      "quantity": 2
    }
  ],
  "locationId": "01400376"
}
```

### Example

```bash
curl -s -X POST http://localhost:4021/cart \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"query":"whole milk","quantity":1},{"query":"eggs","quantity":2}]}'
```

### Response `200`

a priced cart: matched line items, substitutions, line totals, subtotal, tax, and grand total. The `payment` field mirrors the `X-PAYMENT-RESPONSE` header.

```json
{
  "source": "fixture",
  "cartId": "cart_fixture_3f2a91c4",
  "locationId": "01400376",
  "builtAt": "2026-08-07T12:00:00.000Z",
  "lines": [
    {
      "requested": {
        "query": "whole milk",
        "quantity": 1
      },
      "matched": {
        "productId": "0001111041700",
        "upc": "0001111041700",
        "description": "Kroger Vitamin D Whole Milk",
        "brand": "Kroger",
        "category": "Dairy",
        "size": "1 gal",
        "price": {
          "regular": 3.79,
          "promo": 3.29
        },
        "aisle": "Dairy",
        "stockLevel": "HIGH"
      },
      "substituted": false,
      "substitutionNote": null,
      "unitPrice": 3.29,
      "lineTotal": 3.29
    }
  ],
  "summary": {
    "itemCount": 3,
    "matchedLines": 2,
    "unmatchedLines": 0,
    "substitutedLines": 0,
    "subtotal": 10.27,
    "estimatedTax": 0.67,
    "estimatedTotal": 10.94
  },
  "payment": {
    "success": true,
    "rail": "solana",
    "network": "solana",
    "transaction": "5xkQ…",
    "payer": "9wFh…",
    "amount": "5000",
    "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "resource": "http://localhost:4021/cart"
  }
}
```

### Errors

`400 missing_items` when `items` is absent or empty. `400 too_many_items` above 50 lines. `502 upstream_error` on a Kroger failure. A line that matches nothing is returned with `matched: null` and `lineTotal: 0` rather than failing the whole cart.

---

## Free routes

### `GET /health`

```json
{
  "ok": true,
  "service": "x402-grocery",
  "source": "fixture",
  "rails": [
    { "rail": "evm", "network": "base-sepolia" },
    { "rail": "solana", "network": "solana" }
  ]
}
```

### `GET /.well-known/x402`

The discovery manifest. Every resource entry carries its price and an `accepts` array with both rails. This is what [x402scan.com](https://x402scan.com), the x402 Bazaar and [agentic.market](https://agentic.market) index.

---

## The 402 challenge

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
      "description": "Search grocery products with prices, promos, aisle locations and stock levels.",
      "mimeType": "application/json",
      "payTo": "0x40252CFDF8B20Ed757D61ff157719F33Ec332402",
      "maxTimeoutSeconds": 60,
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "extra": {
        "name": "USDC",
        "version": "2"
      }
    },
    {
      "scheme": "exact",
      "network": "solana",
      "maxAmountRequired": "2000",
      "resource": "http://localhost:4021/products",
      "description": "Search grocery products with prices, promos, aisle locations and stock levels.",
      "mimeType": "application/json",
      "payTo": "WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW",
      "maxTimeoutSeconds": 60,
      "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "extra": {
        "name": "USD Coin",
        "decimals": 6,
        "feePayer": "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4",
        "amount": "2000"
      }
    }
  ]
}
```

Amounts are USDC atomic units (6 decimals): `"2000"` is `$0.002`.

## Settlement receipt

Successful paid responses carry `X-PAYMENT-RESPONSE`, base64 JSON:

```json
{
  "success": true,
  "rail": "evm",
  "network": "base-sepolia",
  "transaction": "0x…",
  "payer": "0x…",
  "amount": "2000",
  "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "resource": "http://localhost:4021/products"
}
```

The same object is echoed in the response body's `payment` field, so an agent that only reads JSON still gets its receipt.

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `missing_query` | 400 | `GET /products` called without `?q=` |
| `missing_items` | 400 | `POST /cart` body has no non-empty `items` array |
| `too_many_items` | 400 | More than 50 cart lines in one request |
| `upstream_error` | 502 | The Kroger API rejected the request or was unreachable |
| `no_payment_rail` | 500 | Neither rail is configured on this instance |
| `facilitator_unreachable` | 502 | The rail's facilitator could not be reached to verify the payment |
| `settlement_error` | 502 | The payment verified but settlement failed — you were not charged |
