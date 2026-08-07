# x402-grocery

x402-grocery turns grocery retail into a per-call API an autonomous agent can pay for directly. `GET /products` searches a live Kroger catalog and returns products with regular and promo prices, package size, aisle location, and stock level. `POST /cart` takes a shopping list of free-text queries or UPCs, matches each one, substitutes anything out of stock, and returns a fully priced cart with line totals, subtotal, estimated tax, and grand total. Both return their artifact in the response body — there is no order to place and nothing to poll.

**Base URL:** `{BASE_URL}` (local default `http://localhost:4021`)

## Endpoints

### `GET /products` — $0.002

Full-text search across the grocery catalog. Returns each product's identifiers, brand, package size, regular and promotional price, the aisle it sits in, and its current stock level. Pass a `locationId` to price against a specific store.

| Param | In | Type | Required | Description |
|---|---|---|---|---|
| `q` | query | string | yes | Search term, e.g. `whole milk`. |
| `limit` | query | integer | no | Maximum products to return (1–50). |
| `locationId` | query | string | no | Kroger store id to price against. Omit for the default location. |

Returns matching products with regular and promo prices, size, aisle, and stock level:

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

### `POST /cart` — $0.005

Takes a shopping list of free-text queries and/or UPCs with quantities. Each line is matched against the catalog; a UPC that doesn't resolve or a product that's temporarily out of stock is substituted with the closest in-stock match and the substitution is recorded on the line. Returns every line plus a summary with subtotal, estimated tax, and estimated total. One price regardless of line count.

Request body:

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

Returns a priced cart: matched line items, substitutions, line totals, subtotal, tax, and grand total:

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

### Free routes

| Route | Returns |
|---|---|
| `GET /health` | `{ok, service, source, rails}` — liveness plus the rails this instance advertises |
| `GET /.well-known/x402` | The discovery manifest below |

## Payment

This service speaks **x402** (HTTP 402 payment protocol, <https://x402.org>). **Pay in USDC on Base or Solana — your client picks the rail.**

1. Call the endpoint normally. With no `X-PAYMENT` header you get `402` and a JSON body with an `accepts` array holding **both** rails.
2. Pick a rail, produce a payment for it, and retry the identical request with the base64 `X-PAYMENT` header.
3. You get `200` with the artifact **in the response body**, plus an `X-PAYMENT-RESPONSE` header carrying the settlement receipt (tx hash / signature + rail). The same receipt is echoed in the body's `payment` field.

| Rail | Network | Asset | payTo | Facilitator |
|---|---|---|---|---|
| EVM | `base-sepolia` (or `base`) | USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | `0x40252CFDF8B20Ed757D61ff157719F33Ec332402` | `https://x402.org/facilitator` |
| Solana | `solana` | USDC `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | `WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW` | `https://facilitator.payai.network` |

Pay via [`x402-fetch`](https://www.npmjs.com/package/x402-fetch) (EVM), [`@three-ws/x402-payment-modal`](https://www.npmjs.com/package/@three-ws/x402-payment-modal) (browser, both rails), or any x402 client. Solana wallets that sign serialized transactions can use this server's helper endpoints:

```
POST /api/x402-checkout?action=prepare   → unsigned SPL transfer for a chosen accept
POST /api/x402-checkout?action=encode    → wraps your signed tx into an X-PAYMENT header
```

The Solana `extra.feePayer` sponsor pays the SOL network fee, so you need only USDC.

## Errors

| Code | HTTP | Meaning |
|---|---|---|
| `missing_query` | 400 | `GET /products` called without `?q=` |
| `missing_items` | 400 | `POST /cart` body has no non-empty `items` array |
| `too_many_items` | 400 | More than 50 cart lines in one request |
| `upstream_error` | 502 | The Kroger API rejected the request or was unreachable |
| `no_payment_rail` | 500 | Neither rail is configured on this instance |
| `facilitator_unreachable` | 502 | The rail's facilitator could not be reached to verify |
| `settlement_error` | 502 | Verified, but settlement failed — you were not charged |

## Data source

Live Kroger data is used when `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET` are set (a free developer account at developer.kroger.com). Without them the service answers from a deterministic fixture catalog of ~30 common grocery items and labels every response `"source": "fixture"`. The shape of the response is identical either way, so an agent can develop against fixtures and switch to live data with no code change.

## Discovery

- Manifest: `{BASE_URL}/.well-known/x402`
- OpenAPI: [`openapi.json`](https://github.com/nirholas/x402-grocery/blob/main/openapi.json)
- Docs: <https://nirholas.github.io/x402-grocery/>
- Contact: nichxbt@gmail.com
