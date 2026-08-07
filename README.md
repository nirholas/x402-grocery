# x402-grocery

> Real grocery product search and cart building over the Kroger API, priced per operation.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![x402](https://img.shields.io/badge/payments-x402-0052ff.svg)](https://x402.org)

An x402-paid grocery service for AI agents and humans: search real products (prices, promos, aisle locations, stock levels) and build fully priced carts with substitutions and totals — each operation paid per request in USDC, artifact returned directly in the response.

## Why x402 for this

Grocery data APIs normally require developer accounts, OAuth apps, and rate-limit tiers before an agent can ask a single question. With x402, an agent pays $0.002 per search and $0.005 per cart in USDC over plain HTTP — no signup, no API key exchange, no subscription. Payment and delivery happen in one request/response cycle.

## Quickstart

```bash
git clone https://github.com/nirholas/x402-grocery
cd x402-grocery
npm install

# minimal config: where your USDC goes
cp .env.example .env   # then set PAY_TO_ADDRESS=0xYourAddress

npm run dev
# x402-grocery listening on http://localhost:4021
```

Try it:

```bash
curl -s http://localhost:4021/health
curl -si "http://localhost:4021/products?q=milk" | head -1   # HTTP/1.1 402 Payment Required
```

Make a paid call (wallet with base-sepolia USDC, faucet at [faucet.circle.com](https://faucet.circle.com)):

```bash
PRIVATE_KEY=0x... npm run client
```

## API

| Route | Price | What you get back |
|-------|-------|-------------------|
| `GET /products?q=` | $0.002 | Products with prices, promos, aisle locations, stock levels |
| `POST /cart` | $0.005 | Priced cart: line items, substitutions, subtotal, tax, total |
| `GET /health` | free | Service status + active data source |
| `GET /.well-known/x402` | free | x402 discovery manifest |

Full reference: [docs/api.md](docs/api.md) · [openapi.json](openapi.json)

## How x402 works

1. Client calls a paid route → server responds `402 Payment Required` with a JSON list of accepted payments (amount in USDC, pay-to address, network).
2. Client signs an EIP-712 USDC transfer authorization for the quoted amount and retries with an `X-PAYMENT` header.
3. The facilitator (default `https://x402.org/facilitator`) verifies and settles the transfer on Base.
4. Server responds `200` with the artifact and an `X-PAYMENT-RESPONSE` header containing the settlement receipt.

Defaults to `base-sepolia` testnet; set `NETWORK=base` and a mainnet `FACILITATOR_URL` for real USDC.

## Real backend / API keys

- **`KROGER_CLIENT_ID` + `KROGER_CLIENT_SECRET`** (free at [developer.kroger.com](https://developer.kroger.com)) unlock live Kroger product data; responses are labeled `"source": "kroger"`.
- **Without keys** the server runs on a deterministic ~30-product fixture catalog, honestly labeled `"source": "fixture"` in every response. The demo never requires a paid key.

## For AI agents

- **[skill.md](skill.md)** — agent-facing capability file: endpoints, prices, schemas, payment instructions.
- **[/.well-known/x402](public/.well-known/x402)** — machine-readable discovery manifest, served live at `GET /.well-known/x402`; indexable by [x402scan.com](https://x402scan.com), the x402 Bazaar, and [agentic.market](https://agentic.market).
- **MCP**: expose the service to Claude as tools — see [examples/mcp-tool.md](examples/mcp-tool.md).
- **Client flow**: [examples/agent-client.ts](examples/agent-client.ts) (x402-fetch) and [examples/curl.md](examples/curl.md) (raw 402 → pay → 200).

## Docs

- Site: **https://nirholas.github.io/x402-grocery/**
- [Tutorial](docs/tutorial.md) · [API reference](docs/api.md) · [For AI agents](docs/agents.md)

---

Part of the [x402 Suite](https://github.com/nirholas/x402-suite) — 50 open-source building blocks for agentic commerce.

## License

[Apache-2.0](LICENSE)
