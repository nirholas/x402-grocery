# Expose x402-grocery as an MCP tool

[MCP](https://modelcontextprotocol.io) lets Claude (and other MCP clients) call this service directly. The payment is invisible to the model: the wrapper handles the 402 and returns only the artifact.

## Install

```bash
npm install @modelcontextprotocol/sdk x402-fetch viem
```

## `mcp-server.ts`

```ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";

const BASE_URL = process.env.GROCERY_URL ?? "http://localhost:4021";

// One wallet, reused for every tool call. On base-sepolia this is testnet USDC.
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const payFetch = wrapFetchWithPayment(fetch, account);

const TOOLS = [
  {
    name: "grocery_search_products",
    description: "Search grocery products with prices, promos, aisle locations and stock levels. Costs $0.002 in USDC (paid automatically via x402).",
    inputSchema: {
          "type": "object",
          "properties": {
                "q": {
                      "type": "string",
                      "description": "Search term, e.g. `whole milk`."
                },
                "limit": {
                      "type": "integer",
                      "description": "Maximum products to return (1–50)."
                },
                "locationId": {
                      "type": "string",
                      "description": "Kroger store id to price against. Omit for the default location."
                }
          },
          "required": [
                "q"
          ]
    },
  },
  {
    name: "grocery_build_cart",
    description: "Build a fully priced cart from a shopping list, substituting out-of-stock items. Costs $0.005 in USDC (paid automatically via x402).",
    inputSchema: {
          "type": "object",
          "properties": {
                "items": {
                      "type": "array",
                      "items": {
                            "type": "object",
                            "properties": {
                                  "query": {
                                        "type": "string"
                                  },
                                  "quantity": {
                                        "type": "integer"
                                  }
                            }
                      },
                      "description": "See skill.md for the full shape of `items`."
                },
                "locationId": {
                      "type": "string",
                      "description": "See skill.md for the full shape of `locationId`."
                }
          },
          "required": [
                "items",
                "locationId"
          ]
    },
  },
];

const server = new Server({ name: "x402-grocery", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  let res: Response;

  switch (req.params.name) {
    case "grocery_search_products": {
      const url = new URL("/products", BASE_URL);
      if (args.q !== undefined) url.searchParams.set("q", String(args.q));
      if (args.limit !== undefined) url.searchParams.set("limit", String(args.limit));
      if (args.locationId !== undefined) url.searchParams.set("locationId", String(args.locationId));
      res = await payFetch(url.toString());
      break;
    }
    case "grocery_build_cart": {
      res = await payFetch(new URL("/cart", BASE_URL).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      break;
    }
    default:
      throw new Error(`unknown tool: ${req.params.name}`);
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`x402-grocery ${res.status}: ${detail}`);
  }

  // The artifact is the 200 body — hand it straight to the model.
  return { content: [{ type: "text", text: await res.text() }] };
});

await server.connect(new StdioServerTransport());
```

## Register it with Claude Desktop

```json
{
  "mcpServers": {
    "x402-grocery": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp-server.ts"],
      "env": {
        "PRIVATE_KEY": "0xYourFundedKey",
        "GROCERY_URL": "http://localhost:4021"
      }
    }
  }
}
```

## Notes

- **Budget the wallet.** Every tool call spends real USDC (GET /products = $0.002, POST /cart = $0.005). Fund the key with only what a session should be allowed to spend — that cap is your real spending limit.
- **Both rails work.** The example uses the EVM rail because `x402-fetch` handles it in one wrapper. For a Solana-funded agent, use the `/api/x402-checkout` helpers described in [`curl.md`](curl.md) and set the `X-PAYMENT` header yourself.
- **Receipts.** `res.headers.get("X-PAYMENT-RESPONSE")` (base64 JSON) is the settlement proof; the body's `payment` field carries the same thing if you'd rather log the parsed artifact.
- **Point the model at [`skill.md`](../skill.md)** as a resource so it knows the response schemas without a trial call.
