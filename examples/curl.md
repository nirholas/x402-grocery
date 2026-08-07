# curl walkthrough: 402 → pay → 200

This walks the raw x402 flow against a local x402-grocery server.

## 0. Start the server

```bash
PAY_TO_ADDRESS=0xYourAddress npm run dev
```

## 1. Free routes need no payment

```bash
curl -s http://localhost:4021/health
# {"ok":true,"service":"x402-grocery","source":"fixture","network":"base-sepolia"}

curl -s http://localhost:4021/.well-known/x402 | jq .resources[].resource
# "GET /products"
# "POST /cart"
```

## 2. A paid route without payment returns HTTP 402

```bash
curl -si "http://localhost:4021/products?q=milk" | head -1
# HTTP/1.1 402 Payment Required

curl -s "http://localhost:4021/products?q=milk" | jq
```

The 402 body carries the payment requirements:

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
      "payTo": "0xYourAddress",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "maxTimeoutSeconds": 300
    }
  ]
}
```

`maxAmountRequired` is in USDC base units (6 decimals): `2000` = $0.002.

## 3. Pay and retry

The `X-PAYMENT` header is an EIP-712-signed USDC transfer authorization — impractical
to build by hand in curl. Use any x402 client to construct it:

```bash
PRIVATE_KEY=0x... BASE_URL=http://localhost:4021 npm run client
```

Under the hood the client:

1. sends the same request and reads the 402 requirements,
2. signs an `exact` payment for `maxAmountRequired` to `payTo`,
3. retries with the `X-PAYMENT: <base64 payload>` header,
4. the facilitator verifies + settles the USDC transfer on Base,
5. the server responds `200` with the artifact and an `X-PAYMENT-RESPONSE` header
   containing the settlement receipt (transaction hash, network, payer).

## 4. The paid response

```json
{
  "source": "fixture",
  "query": "milk",
  "count": 2,
  "products": [
    { "description": "Whole Milk, 1 Gallon", "price": { "regular": 3.49, "promo": 2.99 }, "aisle": "Dairy Wall 2" }
  ]
}
```
