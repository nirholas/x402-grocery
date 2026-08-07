/**
 * x402-grocery — a complete paid call, end to end.
 *
 *   PRIVATE_KEY=0x... npm run client
 *
 * `wrapFetchWithPayment` intercepts the 402, signs an EIP-3009 USDC
 * authorization for exactly the quoted amount, and replays the request with the
 * `X-PAYMENT` header. You never write the retry loop.
 *
 * Fund the key with base-sepolia USDC: https://faucet.circle.com
 *
 * Prefer the Solana rail? See the commented section at the bottom — the same
 * 402 challenge carries a `solana` accept, and the server exposes the two
 * checkout helpers a Solana wallet needs.
 */

import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment } from "x402-fetch";

const BASE_URL = process.env.GROCERY_URL ?? "http://localhost:4021";

function decodeReceipt(header: string | null): unknown {
  if (!header) return null;
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    return header;
  }
}

async function main(): Promise<void> {
  // ── Step 1: see the challenge ─────────────────────────────────────────────
  // A plain fetch with no payment shows what the server wants. Both rails are
  // always listed; a client picks whichever wallet it holds.
  const unpaid = await fetch(new URL("/products", BASE_URL));
  if (unpaid.status === 402) {
    const challenge = (await unpaid.json()) as { accepts: Array<{ network: string; maxAmountRequired: string; payTo: string }> };
    console.log("402 challenge — accepted rails:");
    for (const a of challenge.accepts) {
      console.log(`  ${a.network.padEnd(14)} ${a.maxAmountRequired.padStart(8)} atomic USDC → ${a.payTo}`);
    }
    console.log();
  }

  const key = process.env.PRIVATE_KEY as `0x${string}` | undefined;
  if (!key) {
    console.error("Set PRIVATE_KEY to a base-sepolia key holding testnet USDC (https://faucet.circle.com).");
    console.error("Without it this script can only show the 402 challenge above.");
    process.exit(1);
  }

  // ── Step 2: pay and get the artifact ──────────────────────────────────────
  const payFetch = wrapFetchWithPayment(fetch, privateKeyToAccount(key));

  // A price check — $0.002
  const search = await payFetch(new URL("/products?q=whole+milk&limit=3", BASE_URL).toString());
  const products = (await search.json()) as { source: string; count: number; products: Array<{ description: string; price: { regular: number; promo: number | null } }> };
  console.log(`\n${products.count} products (source: ${products.source}):`);
  for (const p of products.products) {
    console.log(`  ${p.description} — $${p.price.promo ?? p.price.regular}`);
  }
  console.log("receipt:", decodeReceipt(search.headers.get("X-PAYMENT-RESPONSE")));

  // A whole shopping list, priced — $0.005 no matter how many lines
  const cart = await payFetch(new URL("/cart", BASE_URL).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        { query: "whole milk", quantity: 1 },
        { query: "eggs", quantity: 2 },
        { query: "sourdough bread", quantity: 1 },
      ],
    }),
  });
  const built = (await cart.json()) as {
    cartId: string;
    summary: { subtotal: number; estimatedTax: number; estimatedTotal: number; substitutedLines: number };
  };
  console.log(`\ncart ${built.cartId}`);
  console.log(`  subtotal  $${built.summary.subtotal}`);
  console.log(`  tax       $${built.summary.estimatedTax}`);
  console.log(`  total     $${built.summary.estimatedTotal}`);
  console.log(`  ${built.summary.substitutedLines} substitution(s)`);
  console.log("receipt:", decodeReceipt(cart.headers.get("X-PAYMENT-RESPONSE")));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/* ─────────────────────────────────────────────────────────────────────────────
 * Paying on Solana instead
 * ─────────────────────────────────────────────────────────────────────────────
 * The same 402 body carries a `solana` accept. A Solana wallet signs a
 * serialized SPL transfer rather than typed data, so the server builds it:
 *
 *   const { accepts } = await (await fetch(url)).json();
 *   const accept = accepts.find((a) => a.network === "solana");
 *
 *   // 1. Build the unsigned transfer
 *   const prep = await fetch(`${BASE_URL}/api/x402-checkout?action=prepare`, {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ accept, buyer: myBase58Pubkey }),
 *   }).then((r) => r.json());              // → { tx_base64, recent_blockhash }
 *
 *   // 2. Sign tx_base64 with your wallet (Phantom, @solana/web3.js, ...)
 *   const signedTxBase64 = await wallet.signTransaction(prep.tx_base64);
 *
 *   // 3. Wrap it into the X-PAYMENT header
 *   const { x_payment } = await fetch(`${BASE_URL}/api/x402-checkout?action=encode`, {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ accept, signed_tx_base64: signedTxBase64, resource_url: accept.resource }),
 *   }).then((r) => r.json());
 *
 *   // 4. Retry the original request
 *   const res = await fetch(url, { headers: { "X-PAYMENT": x_payment } });
 *
 * `accept.extra.feePayer` is a facilitator sponsor account that pays the SOL
 * network fee, so the agent's wallet needs only USDC.
 *
 * In a browser, @three-ws/x402-payment-modal does all four steps from one
 * <button> — for both rails.
 *
 * And the raw dual-rail 402 body, for reference:
 *
 *   $ curl -s 'http://localhost:4021/products?q=whole%20milk'
 *   {
 *     "x402Version": 1,
 *     "error": "X-PAYMENT header is required",
 *     "accepts": [
 *       {
 *         "scheme": "exact",
 *         "network": "base-sepolia",
 *         "maxAmountRequired": "2000",
 *         "resource": "http://localhost:4021/products",
 *         "description": "Search grocery products with prices, promos, aisle locations and stock levels.",
 *         "mimeType": "application/json",
 *         "payTo": "0x40252CFDF8B20Ed757D61ff157719F33Ec332402",
 *         "maxTimeoutSeconds": 60,
 *         "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
 *         "extra": {
 *           "name": "USDC",
 *           "version": "2"
 *         }
 *       },
 *       {
 *         "scheme": "exact",
 *         "network": "solana",
 *         "maxAmountRequired": "2000",
 *         "resource": "http://localhost:4021/products",
 *         "description": "Search grocery products with prices, promos, aisle locations and stock levels.",
 *         "mimeType": "application/json",
 *         "payTo": "WwwuGbqHrwF5RG89KhUbmRWEvjnRH9k5kVM5p7T3WwW",
 *         "maxTimeoutSeconds": 60,
 *         "asset": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
 *         "extra": {
 *           "name": "USD Coin",
 *           "decimals": 6,
 *           "feePayer": "2wKupLR9q6wXYppw8Gr2NvWxKBUqm4PPJKkQfoxHDBg4",
 *           "amount": "2000"
 *         }
 *       }
 *     ]
 *   }
 */
