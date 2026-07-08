// ---------- All hardcoded config lives here. No .env, nothing to set up. ----------

// Get a free publishable key at https://enter.pollinations.ai (2 min signup)
// and paste it below. Anonymous/no-key requests are rate-limited hard, so a
// free key is worth grabbing.
export const POLLINATIONS_API_KEY = "sk_UyboHfmxBAOemkIfLgO8k89ly99HIuCL";
export const POLLINATIONS_MODEL = "openai";

export const STARTING_CASH = 100000;
export const TICK_MS = 2500; // how often prices tick, in ms
export const HISTORY_LEN = 90; // how many points kept per chart
export const STORAGE_KEY = "dryrun-exchange-state";

// Seed prices are real snapshots from July 2026 - the app simulates
// forward from these in real time, it doesn't poll a live feed.
export const SEED_STOCKS = [
  { ticker: "AAPL", name: "Apple Inc.", price: 310.66, vol: 0.0032 },
  { ticker: "TSLA", name: "Tesla, Inc.", price: 409.4, vol: 0.009 },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: 367.03, vol: 0.0045 },
  { ticker: "AMZN", name: "Amazon.com, Inc.", price: 245.98, vol: 0.005 },
  { ticker: "MSFT", name: "Microsoft Corp.", price: 388.84, vol: 0.003 },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: 196.93, vol: 0.0075 },
  { ticker: "META", name: "Meta Platforms, Inc.", price: 615.58, vol: 0.006 },
  { ticker: "NFLX", name: "Netflix, Inc.", price: 1240.5, vol: 0.0055 },
];
