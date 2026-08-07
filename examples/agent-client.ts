/**
 * x402-grocery agent client example.
 *
 * Full x402 flow: request → 402 → sign payment → retry → artifact + receipt.
 *
 * Usage:
 *   PRIVATE_KEY=0x... BASE_URL=http://localhost:4021 npm run client
 *
 * The wallet needs base-sepolia USDC (faucet: https://faucet.circle.com).
 */
import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment, decodeXPaymentResponse } from "x402-fetch";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4021";
const pk = process.env.PRIVATE_KEY;
if (!pk || !pk.startsWith("0x")) {
  console.error("Set PRIVATE_KEY=0x... (a wallet holding base-sepolia USDC) to run this example.");
  process.exit(1);
}

const account = privateKeyToAccount(pk as `0x${string}`);
const fetchWithPay = wrapFetchWithPayment(fetch, account);

function printReceipt(res: Response): void {
  const header = res.headers.get("x-payment-response");
  if (header) {
    const receipt = decodeXPaymentResponse(header);
    console.log("payment receipt (X-PAYMENT-RESPONSE):", JSON.stringify(receipt, null, 2));
  } else {
    console.log("(no X-PAYMENT-RESPONSE header — this route may be free)");
  }
}

async function main(): Promise<void> {
  console.log(`agent wallet: ${account.address}`);
  console.log(`server:       ${BASE_URL}\n`);

  // 0. Free discovery — what does this service sell?
  const manifest = await fetch(`${BASE_URL}/.well-known/x402`).then((r) => r.json());
  console.log("discovered resources:");
  for (const r of manifest.resources) console.log(`  ${r.resource}  ${r.price}`);

  // 1. Paid: search products ($0.002)
  console.log("\n--- GET /products?q=milk (pays $0.002) ---");
  const searchRes = await fetchWithPay(`${BASE_URL}/products?q=milk&limit=5`);
  const search = await searchRes.json();
  console.log(JSON.stringify(search, null, 2));
  printReceipt(searchRes);

  // 2. Paid: build a cart ($0.005)
  console.log("\n--- POST /cart (pays $0.005) ---");
  const cartRes = await fetchWithPay(`${BASE_URL}/cart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        { query: "whole milk", quantity: 1 },
        { query: "eggs", quantity: 2 },
        { query: "peanut butter", quantity: 1 },
        { query: "coffee", quantity: 1 },
      ],
    }),
  });
  const cart = await cartRes.json();
  console.log(JSON.stringify(cart, null, 2));
  printReceipt(cartRes);

  console.log(
    `\ncart total: $${cart.summary?.estimatedTotal} across ${cart.summary?.itemCount} items (source: ${cart.source})`,
  );
}

main().catch((err) => {
  console.error("client error:", err);
  process.exit(1);
});
