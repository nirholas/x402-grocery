# x402-grocery for AI agents

This service is built to be consumed by autonomous agents: machine-discoverable, per-request paid, artifact-in-response.

## Discovery

Two artifacts tell an agent everything it needs:

1. **[skill.md](https://github.com/nirholas/x402-grocery/blob/main/skill.md)** (repo root) — human/agent-readable capability file: endpoints, prices, request/response schemas, payment protocol. Fetch it, hand it to your model as context, and the model knows how to shop here.
2. **`GET /.well-known/x402`** — machine-readable JSON manifest (`x402Version`, `resources[]` with `resource`, `price`, `network`, `asset`, `outputSchema`). This is the discovery format indexed by [x402scan.com](https://x402scan.com), the x402 Bazaar, and [agentic.market](https://agentic.market).

## Paying

Any x402 client works. With `x402-fetch`:

```ts
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const payFetch = wrapFetchWithPayment(fetch, account);

const res = await payFetch("https://your-deployment/products?q=milk");
const artifact = await res.json();                       // the purchased data
const receipt = decodeXPaymentResponse(res.headers.get("x-payment-response")!); // settlement proof
```

The wallet needs USDC on the configured network (`base-sepolia` by default — free faucet at faucet.circle.com). `wrapFetchWithPayment` caps per-request spend (default $0.10) as a safety rail.

## What you get back

Every paid call returns the full purchased artifact in the 200 body — never a job id to poll:

- `GET /products` → product list with prices, promos, aisles, stock.
- `POST /cart` → complete priced cart: per-line matches, explicit substitutions, subtotal/tax/total.

Responses always carry `source`: `"kroger"` (live upstream) or `"fixture"` (deterministic demo catalog) so agents can weigh data freshness honestly.

## MCP integration

To give Claude these capabilities as native tools, run the small MCP server in [examples/mcp-tool.md](https://github.com/nirholas/x402-grocery/blob/main/examples/mcp-tool.md) and register it in `claude_desktop_config.json`. Each tool call transparently pays the endpoint and returns the artifact as tool output.

## Listing this service

Operators who deploy x402-grocery publicly can get discovered by agent ecosystems:

- **x402scan.com** — indexes services exposing `/.well-known/x402`; submit your base URL.
- **x402 Bazaar** — CDP's discovery layer for x402 services; list via the Bazaar registration flow.
- **agentic.market** — marketplace for agent-usable paid APIs; the manifest + `skill.md` are the listing collateral.

Keep the manifest served at `/.well-known/x402` accurate — indexers re-crawl it.
