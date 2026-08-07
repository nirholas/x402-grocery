# x402-grocery tutorial

End-to-end walkthrough: install, run, hit your first 402, make a paid call, read the artifact, go to mainnet.

## 1. Install

```bash
git clone https://github.com/nirholas/x402-grocery
cd x402-grocery
npm install
```

Requires Node 18+.

## 2. Environment

Copy the example env and set the one required variable:

```bash
cp .env.example .env
```

```ini
# .env
PAY_TO_ADDRESS=0xYourAddress   # where USDC payments land
```

Optional — live Kroger data (free developer account at developer.kroger.com):

```ini
KROGER_CLIENT_ID=...
KROGER_CLIENT_SECRET=...
```

Without Kroger keys the server serves a deterministic fixture catalog and labels every response `"source": "fixture"`.

## 3. Run the server

```bash
npm run dev
```

```
x402-grocery listening on http://localhost:4021
  mode: fixture | network: base-sepolia | payTo: 0xYourAddress
  paid routes:
    GET /products      $0.002
    POST /cart         $0.005
  free routes: GET /health, GET /.well-known/x402
```

## 4. Your first 402

```bash
curl -si "http://localhost:4021/products?q=milk" | head -1
# HTTP/1.1 402 Payment Required
```

The body is the machine-readable price quote (`accepts[]` with `maxAmountRequired` in USDC base units, `payTo`, `network`, `asset`). This is the whole protocol: the server quotes, the client pays, the server delivers.

## 5. A paid call

Fund a testnet wallet with base-sepolia USDC (free faucet: https://faucet.circle.com), then:

```bash
PRIVATE_KEY=0xYourAgentKey npm run client
```

`examples/agent-client.ts` wraps `fetch` with `wrapFetchWithPayment` from `x402-fetch`. It:

1. reads the free `/.well-known/x402` manifest,
2. calls `GET /products?q=milk` — automatically handles the 402, signs the payment, retries,
3. calls `POST /cart` with a 4-item shopping list,
4. prints each artifact and the decoded `X-PAYMENT-RESPONSE` settlement receipt (tx hash, payer, network).

## 6. Reading the artifact

The purchased artifact is the JSON body of the 200 response — no follow-up calls:

```json
{
  "source": "fixture",
  "cartId": "cart_fixture_a1b2c3d4",
  "lines": [
    {
      "requested": { "query": "whole milk", "quantity": 1 },
      "matched": { "description": "Whole Milk, 1 Gallon", "aisle": "Dairy Wall 2" },
      "substituted": false,
      "unitPrice": 2.99,
      "lineTotal": 2.99
    }
  ],
  "summary": { "subtotal": 17.75, "estimatedTax": 1.15, "estimatedTotal": 18.9 }
}
```

Substitutions are explicit: when an exact UPC or in-stock item can't be matched, the line carries `"substituted": true` and a human-readable `substitutionNote`.

## 7. Going to mainnet

1. Set `NETWORK=base`.
2. Point `FACILITATOR_URL` at a mainnet-capable facilitator (e.g. Coinbase CDP's x402 facilitator).
3. Use a `PAY_TO_ADDRESS` you control on Base mainnet.
4. Clients now pay real USDC on Base; everything else is unchanged.

## Next steps

- [API reference](api.md)
- [For AI agents](agents.md) — discovery, MCP integration, listing
- [examples/curl.md](https://github.com/nirholas/x402-grocery/blob/main/examples/curl.md) — the raw protocol walkthrough
