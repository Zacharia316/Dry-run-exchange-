// ---------- All hardcoded config lives here. No .env, nothing to set up. ----------

// Get a free publishable key at https://enter.pollinations.ai (2 min signup)
// and paste it below. Anonymous/no-key requests are rate-limited hard, so a
// free key is worth grabbing.
export const POLLINATIONS_API_KEY = "sk_UyboHfmxBAOemkIfLgO8k89ly99HIuCL";
export const POLLINATIONS_MODEL = "openai";

// Get a free key at https://finnhub.io/register (no credit card).
// Used to periodically re-anchor simulated prices to the real market.
export const FINNHUB_API_KEY = "d97mq99r01qicrqvkrv0d97mq99r01qicrqvkrvg";
export const SYNC_INTERVAL_MS = 180000; // re-sync real prices every 3 min (well under the 60/min free limit)

export const STARTING_CASH = 10000;
export const TICK_MS = 2500; // how often prices tick, in ms
export const HISTORY_LEN = 90; // how many points kept per chart
export const STORAGE_KEY = "dryrun-exchange-state";

// Seed prices are rough placeholders shown for an instant before the
// first Finnhub sync overwrites them with real quotes. vol = simulated
// volatility used to animate price movement between syncs.
export const SEED_STOCKS = [
  { ticker: "AAPL", name: "Apple Inc.", price: 310.66, vol: 0.0032 },
  { ticker: "MSFT", name: "Microsoft Corp.", price: 388.84, vol: 0.003 },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: 367.03, vol: 0.0045 },
  { ticker: "AMZN", name: "Amazon.com, Inc.", price: 245.98, vol: 0.005 },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: 196.93, vol: 0.0075 },
  { ticker: "META", name: "Meta Platforms, Inc.", price: 615.58, vol: 0.006 },
  { ticker: "TSLA", name: "Tesla, Inc.", price: 409.4, vol: 0.009 },
  { ticker: "NFLX", name: "Netflix, Inc.", price: 1240.5, vol: 0.0055 },
  { ticker: "AMD", name: "Advanced Micro Devices", price: 178.2, vol: 0.008 },
  { ticker: "INTC", name: "Intel Corp.", price: 32.1, vol: 0.006 },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", price: 268.4, vol: 0.004 },
  { ticker: "V", name: "Visa Inc.", price: 341.6, vol: 0.0035 },
  { ticker: "MA", name: "Mastercard Inc.", price: 552.1, vol: 0.0035 },
  { ticker: "DIS", name: "The Walt Disney Company", price: 112.5, vol: 0.005 },
  { ticker: "KO", name: "The Coca-Cola Company", price: 71.8, vol: 0.002 },
  { ticker: "PEP", name: "PepsiCo, Inc.", price: 148.9, vol: 0.002 },
  { ticker: "WMT", name: "Walmart Inc.", price: 96.3, vol: 0.0025 },
  { ticker: "COST", name: "Costco Wholesale Corp.", price: 985.7, vol: 0.003 },
  { ticker: "BA", name: "The Boeing Company", price: 195.4, vol: 0.007 },
  { ticker: "XOM", name: "Exxon Mobil Corp.", price: 118.2, vol: 0.0045 },
];
