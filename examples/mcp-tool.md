# Exposing x402-grocery as an MCP tool for Claude

Model Context Protocol (MCP) lets Claude call external tools. Wrapping x402-grocery
endpoints as MCP tools gives Claude the ability to search groceries and build carts,
paying per call from its own wallet.

## Minimal MCP server (stdio)

```ts
// mcp-server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";

const BASE_URL = process.env.GROCERY_BASE_URL ?? "http://localhost:4021";
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const payFetch = wrapFetchWithPayment(fetch, account);

const server = new McpServer({ name: "x402-grocery", version: "0.1.0" });

server.tool(
  "grocery_search",
  "Search real grocery products with prices and aisle locations. Costs $0.002 USDC per query.",
  { q: z.string(), limit: z.number().optional() },
  async ({ q, limit }) => {
    const res = await payFetch(`${BASE_URL}/products?q=${encodeURIComponent(q)}&limit=${limit ?? 10}`);
    return { content: [{ type: "text", text: await res.text() }] };
  },
);

server.tool(
  "grocery_build_cart",
  "Build a fully priced grocery cart (line prices, substitutions, totals). Costs $0.005 USDC per build.",
  {
    items: z.array(z.object({ query: z.string().optional(), upc: z.string().optional(), quantity: z.number().optional() })),
  },
  async ({ items }) => {
    const res = await payFetch(`${BASE_URL}/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    return { content: [{ type: "text", text: await res.text() }] };
  },
);

await server.connect(new StdioServerTransport());
```

Dependencies: `npm i @modelcontextprotocol/sdk zod x402-fetch viem tsx`

## Claude Desktop config

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "x402-grocery": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp-server.ts"],
      "env": {
        "GROCERY_BASE_URL": "http://localhost:4021",
        "PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

## Spending safety

The paying wallet's exposure is bounded by its USDC balance, and `wrapFetchWithPayment`
enforces a per-request maximum (default $0.10). Fund the MCP wallet with only what the
agent should be able to spend.
