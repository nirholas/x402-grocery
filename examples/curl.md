# Raw HTTP walkthrough — x402-grocery

The full 402 → pay → 200 flow with nothing but `curl`. Start the server first:

```bash
npm run dev   # http://localhost:4021
```

## 0. Free routes need no payment

```bash
curl -s http://localhost:4021/health
curl -s http://localhost:4021/.well-known/x402
```

## 1. Ask without paying → `402`

```bash
curl -i 'http://localhost:4021/products?q=whole%20milk'
```

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
```

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

**Both rails, one challenge.** Pick either entry:

- the `base-sepolia` entry → sign an EIP-3009 USDC authorization
- the `solana` entry → sign an SPL `transferChecked`

`maxAmountRequired` is in USDC atomic units (6 decimals), so `"2000"` = `$0.002`.

## 2a. Pay on Base (EVM)

The EIP-3009 signature is produced by your wallet, so this step isn't a `curl`. The payload you base64-encode into `X-PAYMENT` looks like:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base-sepolia",
  "payload": {
    "signature": "0x…",
    "authorization": {
      "from": "0xYourWallet",
      "to": "0x40252CFDF8B20Ed757D61ff157719F33Ec332402",
      "value": "2000",
      "validAfter": "0",
      "validBefore": "1893456000",
      "nonce": "0x…"
    }
  }
}
```

```bash
X_PAYMENT=$(printf '%s' "$PAYLOAD_JSON" | base64 -w0)
```

In practice let [`x402-fetch`](https://www.npmjs.com/package/x402-fetch) build it — see [`agent-client.ts`](agent-client.ts).

## 2b. Pay on Solana

Solana wallets sign serialized transactions, so the server builds one:

```bash
# Save the solana accept from step 1
ACCEPT='{"scheme":"exact","network":"solana","amount":"2000","asset":"EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","payTo":"WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW","extra":{"name":"USD Coin","decimals":6,"feePayer":"2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4"}}'

# Build the unsigned transfer
curl -s -X POST 'http://localhost:4021/api/x402-checkout?action=prepare' \
  -H 'content-type: application/json' \
  -d "{\"accept\": $ACCEPT, \"buyer\": \"YOUR_BASE58_PUBKEY\"}"
# → { "network": "solana", "tx_base64": "…", "recent_blockhash": "…" }

# …sign tx_base64 in your wallet, then wrap it…
curl -s -X POST 'http://localhost:4021/api/x402-checkout?action=encode' \
  -H 'content-type: application/json' \
  -d "{\"accept\": $ACCEPT, \"signed_tx_base64\": \"SIGNED_TX\", \"resource_url\": \"http://localhost:4021/products\"}"
# → { "x_payment": "…" }
```

The `feePayer` sponsor pays the SOL network fee — you only need USDC.

## 3. Retry with the header → `200`

```bash
curl -sD - -H "X-PAYMENT: $X_PAYMENT" \
  'http://localhost:4021/products?q=whole%20milk&limit=2'
```

```http
HTTP/1.1 200 OK
X-PAYMENT-RESPONSE: eyJzdWNjZXNzIjp0cnVlLCJyYWlsIjoiZXZtIiwi…
```

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

Decode the receipt header:

```bash
echo "$RESPONSE_HEADER" | base64 -d
# {"success":true,"rail":"evm","network":"base-sepolia","transaction":"0x…","payer":"0x…"}
```

The same object is in the body's `payment` field, so you can skip the header entirely.

## Other routes

### `POST /cart` — $0.005

```bash
curl -s -X POST http://localhost:4021/cart \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"query":"whole milk","quantity":1},{"query":"eggs","quantity":2}]}'
```

## Errors you may hit

| Body `error` | HTTP | Fix |
|---|---|---|
| `missing_query` | 400 | `GET /products` called without `?q=` |
| `missing_items` | 400 | `POST /cart` body has no non-empty `items` array |
| `too_many_items` | 400 | More than 50 cart lines in one request |
| `upstream_error` | 502 | The Kroger API rejected the request or was unreachable |
| `facilitator_unreachable` | 502 | The facilitator is down or unreachable — retry; you were not charged |
