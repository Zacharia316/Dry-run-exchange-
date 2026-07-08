import { POLLINATIONS_API_KEY, POLLINATIONS_MODEL, HISTORY_LEN } from "./config.js";

// Box-Muller gaussian random, for realistic-looking price noise
export function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function fmtMoney(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function fmtNum(n, d = 2) {
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function backfillHistory(startPrice, vol) {
  const arr = [];
  let p = startPrice * (1 - vol * 6);
  for (let i = 0; i < HISTORY_LEN; i++) {
    p = p * (1 + vol * 0.4 * gaussian() + 0.0004);
    arr.push({ t: i, price: Math.max(p, 0.5) });
  }
  arr[arr.length - 1].price = startPrice;
  return arr;
}

// Calls Pollinations' simple GET text endpoint.
// Pass wantJson=true to force strict JSON back (used for market events).
export async function callPollinations(userPrompt, systemPrompt, wantJson) {
  const url = new URL(`https://gen.pollinations.ai/text/${encodeURIComponent(userPrompt)}`);
  url.searchParams.set("model", POLLINATIONS_MODEL);
  if (systemPrompt) url.searchParams.set("system", systemPrompt);
  if (wantJson) url.searchParams.set("json", "true");
  if (POLLINATIONS_API_KEY && POLLINATIONS_API_KEY !== "PASTE_YOUR_FREE_PK_KEY_HERE") {
    url.searchParams.set("key", POLLINATIONS_API_KEY);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Pollinations request failed: ${res.status}`);
  return await res.text();
}
