# x402-grocery

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![x402](https://img.shields.io/badge/x402-payment%20protocol-0052ff)](https://x402.org)
[![USDC on Base + Solana](https://img.shields.io/badge/USDC-Base%20%2B%20Solana-2775ca)](https://x402.org)

> Grocery search and priced carts an agent can buy one query at a time — real Kroger products, prices, and aisle locations.

Point an agent at a shopping list and get back a fully priced cart — real products, real shelf prices, real aisle numbers, with out-of-stock items substituted automatically. Each search costs $0.002 and each cart build costs $0.005, paid per call in USDC. No account, no API key, no subscription.

## Why x402 for this

An agent that wants one grocery price shouldn't have to register a developer account, agree to terms, and manage a rotating OAuth secret — and the operator shouldn't have to run a signup funnel to serve one query. x402 collapses that to a single HTTP round-trip: the agent asks, gets a price, pays $0.002 in USDC, and gets the data. Costs track usage exactly, so an agent that builds one cart a month pays for one cart a month.

## Quickstart

```bash
git clone https://github.com/nirholas/x402-grocery
cd x402-grocery
npm install
npm run dev          # http://localhost:4021
```

No configuration needed — the server ships with the suite's receive addresses and a deterministic fixture catalog, so the demo works before you have any Kroger credentials. Set `PAY_TO_ADDRESS` / `SOLANA_PAY_TO_ADDRESS` to receive funds yourself.

```bash
# 1. Unpaid → 402 listing both rails
curl -i 'http://localhost:4021/products?q=whole%20milk'

# 2. Paid, via any x402 client
npm run client
```

## API

| Route | Price | What you get back |
|---|---|---|
| `GET /products` | **$0.002** | matching products with regular and promo prices, size, aisle, and stock level |
| `POST /cart` | **$0.005** | a priced cart: matched line items, substitutions, line totals, subtotal, tax, and grand total |
| `GET /health` | free | Liveness, active data source, configured rails |
| `GET /.well-known/x402` | free | Machine-readable discovery manifest |

Every paid route returns the purchased artifact **in the 200 body**. Nothing is deferred to a webhook or a later fetch.

Full reference: [docs/api.md](docs/api.md) · [openapi.json](openapi.json) · [skill.md](skill.md)

## How x402 works

```
  agent                            x402-grocery                    facilitator
    │  GET /products          │                                │
    ├──────────────────────────────▶│                                │
    │  402 + accepts[base, solana]  │                                │
    ◀──────────────────────────────┤                                │
    │  sign USDC authorization      │                                │
    │  retry + X-PAYMENT            │                                │
    ├──────────────────────────────▶│  verify + settle               │
    │                               ├───────────────────────────────▶│
    │  200 + artifact               │                                │
    │  + X-PAYMENT-RESPONSE         │  ◀── tx hash / signature ──────┤
    ◀──────────────────────────────┤                                │
```

**Pay in USDC on Base or Solana — your client picks the rail.** The 402 challenge always lists both:

| Rail | Network | Asset | payTo |
|---|---|---|---|
| EVM | `base-sepolia` (`base` via `NETWORK=base`) | USDC | `0x40252CFDF8B20Ed757D61ff157719F33Ec332402` |
| Solana | `solana` | USDC (SPL) | `WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW` |

The Solana rail's `extra.feePayer` is a public facilitator sponsor account that pays the SOL network fee, so a buyer needs only USDC — no SOL for gas. Wallets that sign serialized transactions (Phantom, most agent SDKs) can use the built-in helpers at `POST /api/x402-checkout?action=prepare|encode`.

## Real backend / API keys

This service talks to the [Kroger Products API](https://developer.kroger.com/reference). A developer account is free and takes a few minutes.

| Env var | Unlocks |
|---|---|
| `KROGER_CLIENT_ID` | Live product search — real Kroger catalog, prices, aisles, stock |
| `KROGER_CLIENT_SECRET` | (same; both are required together) |
| `KROGER_BASE_URL` | Override the API host — rarely needed |

**Without them, everything still works.** The service falls back to a deterministic fixture catalog and marks every response `"source": "fixture"`. That's not a mock in disguise: the field is in the JSON, in the OpenAPI schema, and in `skill.md`, so an agent can tell live data from sample data programmatically. Set the two vars and `source` flips to `"kroger"`.

Kroger's client-credentials token (scope `product.compact`) is fetched on demand and cached until a minute before expiry.

## Human checkout

For a browser-facing checkout, drop in [`@three-ws/x402-payment-modal`](https://www.npmjs.com/package/@three-ws/x402-payment-modal) — it reads the 402 challenge and drives the whole connect → sign → settle flow for **both** rails (Phantom on Solana, any injected wallet on EVM), with SIWX re-entry so a returning buyer skips the wallet prompt, and client-side spending caps that stop an agent or a mis-click from over-spending. Reference it from npm or the CDN; it is a separate proprietary package and is never vendored here.

## For AI agents

- **[`skill.md`](skill.md)** — the agent-facing contract: every endpoint, its price, its response schema, and how to pay. Point your agent at this file.
- **`GET /.well-known/x402`** — machine-readable discovery ([manifest](public/.well-known/x402)). Lists both rails per resource.
- **[`examples/mcp-tool.md`](examples/mcp-tool.md)** — expose this service as an MCP tool for Claude in about 30 lines.
- **[`examples/agent-client.ts`](examples/agent-client.ts)** — a complete paid call with `x402-fetch`, printing the artifact and the decoded settlement receipt.
- **Discovery/listing** — indexable by [x402scan.com](https://x402scan.com), the [x402 Bazaar](https://x402.org), and [agentic.market](https://agentic.market). Deploy, then submit your public base URL; all three read `/.well-known/x402`.

## Docs

<https://nirholas.github.io/x402-grocery/> — [tutorial](docs/tutorial.md) · [API reference](docs/api.md) · [for agents](docs/agents.md)

## Support

nichxbt@gmail.com

## License

Apache-2.0 — see [LICENSE](LICENSE).

Part of the [x402 Suite](https://github.com/nirholas/x402-suite).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=nirholas/x402-grocery&type=Date)](https://www.star-history.com/#nirholas/x402-grocery&Date)

<!-- three.ws:growth -->
## Support the project

If x402-grocery saves you time, **[star it on GitHub](https://github.com/nirholas/x402-grocery)**. Stars are how other developers and AI agents find the repositories worth trusting, and they cost you one click.

Know someone who would use it? [Post on X](https://twitter.com/intent/tweet?text=x402-grocery%3A%20Real%20grocery%20product%20search%20and%20cart%20building%20over%20the%20Kroger%20API%2C%20priced%20per%20operation&url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-grocery) · [Share on Bluesky](https://bsky.app/intent/compose?text=x402-grocery%3A%20Real%20grocery%20product%20search%20and%20cart%20building%20over%20the%20Kroger%20API%2C%20priced%20per%20operation%20https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-grocery) · [Share on LinkedIn](https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-grocery) · [Submit to Hacker News](https://news.ycombinator.com/submitlink?u=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-grocery&t=x402-grocery%3A%20Real%20grocery%20product%20search%20and%20cart%20building%20over%20the%20Kroger%20API%2C%20priced%20per%20operation) · [Share on Reddit](https://www.reddit.com/submit?url=https%3A%2F%2Fgithub.com%2Fnirholas%2Fx402-grocery&title=x402-grocery%3A%20Real%20grocery%20product%20search%20and%20cart%20building%20over%20the%20Kroger%20API%2C%20priced%20per%20operation)

## Built for AI agents too

Coding agents and LLM tooling can read this repo directly: [AGENTS.md](./AGENTS.md), [llms.txt](./llms.txt), [llms-full.txt](./llms-full.txt). Point an agent at `https://github.com/nirholas/x402-grocery` and it has the context it needs.

## More from the same author

- [All repositories by nirholas](https://github.com/nirholas/nirholas#readme): the full catalog, grouped by topic
- [three.ws](https://three.ws): the platform for 3D AI agents with Solana wallets, a skill marketplace and x402 payments
- Questions or ideas: [open an issue](https://github.com/nirholas/x402-grocery/issues) or [start a discussion](https://github.com/nirholas/x402-grocery/discussions)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=nirholas/x402-grocery)](https://github.com/nirholas/x402-grocery/graphs/contributors)

<!-- /three.ws:growth -->
