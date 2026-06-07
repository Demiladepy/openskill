#!/usr/bin/env node
import { loadProjectEnv } from "./lib/loadEnv.js";

export { loadProjectEnv };
loadProjectEnv();

const CMC_BASE = "https://pro-api.coinmarketcap.com";
const DEFAULT_PAIRS = [
  { symbol: "BNB", convert: "USDT", label: "BNB/USDT (BSC perps)" },
  { symbol: "CAKE", convert: "USDT", label: "CAKE/USDT (PancakeSwap)" },
];

/** @typedef {{ timestamp: string, open: number, high: number, low: number, close: number, volume: number }} OhlcvBar */

class RateLimiter {
  /** @param {number} minIntervalMs */
  constructor(minIntervalMs) {
    this.minIntervalMs = minIntervalMs;
    this.lastCallAt = 0;
  }

  async wait() {
    const now = Date.now();
    const elapsed = now - this.lastCallAt;
    if (elapsed < this.minIntervalMs) {
      await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
    }
    this.lastCallAt = Date.now();
  }
}

const limiter = new RateLimiter(Number(process.env.CMC_MIN_REQUEST_INTERVAL_MS || "1200"));

function getApiKey() {
  return process.env.CMC_API_KEY || process.env.CMC_PRO_API_KEY || "";
}

/**
 * @param {Response} res
 * @param {string} context
 */
async function throwForStatus(res, context) {
  if (res.ok) return;
  const body = await res.text().catch(() => "");
  if (res.status === 429) {
    throw new Error(`CMC rate limit (429) during ${context}. Retry later or increase CMC_MIN_REQUEST_INTERVAL_MS.`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(`CMC auth failed (${res.status}) during ${context}. Check CMC_API_KEY.`);
  }
  throw new Error(`CMC ${context} failed (${res.status}): ${body.slice(0, 300)}`);
}

/**
 * Validate API key using quotes/latest (hackathon smoke check).
 * @param {{ required?: boolean, symbol?: string, convert?: string }} [opts]
 */
export async function validateCmcApiKey(opts = {}) {
  const key = getApiKey();
  if (!key) {
    if (opts.required) throw new Error("CMC_API_KEY is not set in environment or skill/.env");
    return { ok: false, skipped: true, reason: "CMC_API_KEY not configured" };
  }

  const symbol = opts.symbol || process.env.CMC_VALIDATE_SYMBOL || "BNB";
  const convert = opts.convert || process.env.CMC_VALIDATE_CONVERT || "USDT";
  const url = new URL(`${CMC_BASE}/v1/cryptocurrency/quotes/latest`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("convert", convert);

  await limiter.wait();
  const res = await fetch(url, {
    headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" },
  });
  await throwForStatus(res, "quotes/latest validation");

  const json = await res.json();
  const quote = json?.data?.[symbol]?.quote?.[convert];
  if (!quote?.price) {
    throw new Error(`CMC validation returned no ${symbol}/${convert} price`);
  }

  return {
    ok: true,
    symbol,
    convert,
    price: quote.price,
    lastUpdated: json?.data?.[symbol]?.last_updated || null,
  };
}

/**
 * Fetch historical OHLCV bars for backtesting.
 * Uses CMC ohlcv/historical (Pro). Falls back to quotes/historical if OHLCV unavailable.
 * @param {{ symbol: string, convert?: string, count?: number, interval?: string }} params
 * @returns {Promise<OhlcvBar[]>}
 */
export async function fetchHistoricalOhlcv(params) {
  const key = getApiKey();
  if (!key) throw new Error("CMC_API_KEY is required for historical data");

  const symbol = params.symbol.toUpperCase();
  const convert = (params.convert || "USDT").toUpperCase();
  const count = params.count ?? Number(process.env.CMC_OHLCV_COUNT || "120");
  const interval = params.interval || process.env.CMC_OHLCV_INTERVAL || "daily";

  try {
    return await fetchOhlcvHistorical({ key, symbol, convert, count, interval });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("404") && !message.toLowerCase().includes("ohlcv")) throw err;
    return fetchQuotesHistoricalFallback({ key, symbol, convert, count, interval });
  }
}

/**
 * @param {{ key: string, symbol: string, convert: string, count: number, interval: string }} p
 * @returns {Promise<OhlcvBar[]>}
 */
async function fetchOhlcvHistorical(p) {
  const url = new URL(`${CMC_BASE}/v1/cryptocurrency/ohlcv/historical`);
  url.searchParams.set("symbol", p.symbol);
  url.searchParams.set("convert", p.convert);
  url.searchParams.set("count", String(p.count));
  url.searchParams.set("interval", p.interval);

  await limiter.wait();
  const res = await fetch(url, {
    headers: { "X-CMC_PRO_API_KEY": p.key, Accept: "application/json" },
  });
  await throwForStatus(res, `ohlcv/historical ${p.symbol}/${p.convert}`);

  const json = await res.json();
  const quotes = json?.data?.quotes;
  if (!Array.isArray(quotes) || quotes.length === 0) {
    throw new Error(`No OHLCV rows for ${p.symbol}/${p.convert}`);
  }

  return quotes
    .map((row) => normalizeBar(row, p.convert))
    .filter(Boolean)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Fallback when OHLCV endpoint is unavailable on plan/tier.
 * @param {{ key: string, symbol: string, convert: string, count: number, interval: string }} p
 */
async function fetchQuotesHistoricalFallback(p) {
  const url = new URL(`${CMC_BASE}/v1/cryptocurrency/quotes/historical`);
  url.searchParams.set("symbol", p.symbol);
  url.searchParams.set("convert", p.convert);
  url.searchParams.set("count", String(p.count));
  url.searchParams.set("interval", p.interval === "daily" ? "1d" : p.interval);

  await limiter.wait();
  const res = await fetch(url, {
    headers: { "X-CMC_PRO_API_KEY": p.key, Accept: "application/json" },
  });
  await throwForStatus(res, `quotes/historical ${p.symbol}/${p.convert}`);

  const json = await res.json();
  const quotes = json?.data?.quotes;
  if (!Array.isArray(quotes) || quotes.length === 0) {
    throw new Error(`No historical quotes for ${p.symbol}/${p.convert}`);
  }

  return quotes
    .map((row) => {
      const q = row.quote?.[p.convert];
      if (!q?.price) return null;
      const ts = row.timestamp || q.timestamp;
      const px = Number(q.price);
      return {
        timestamp: ts,
        open: px,
        high: px,
        low: px,
        close: px,
        volume: Number(q.volume_24h || q.volume || 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/** @param {Record<string, unknown>} row @param {string} convert */
function normalizeBar(row, convert) {
  const q = row.quote?.[convert];
  if (!q) return null;
  const ts = row.time_close || row.time_open || q.timestamp;
  return {
    timestamp: String(ts),
    open: Number(q.open),
    high: Number(q.high),
    low: Number(q.low),
    close: Number(q.close),
    volume: Number(q.volume || 0),
  };
}

/** @returns {typeof DEFAULT_PAIRS} */
export function getDefaultPairs() {
  return DEFAULT_PAIRS;
}

/**
 * Fetch OHLCV for default hackathon pairs.
 * @returns {Promise<Record<string, OhlcvBar[]>>}
 */
export async function fetchDefaultPairSeries() {
  const out = {};
  for (const pair of DEFAULT_PAIRS) {
    out[`${pair.symbol}/${pair.convert}`] = await fetchHistoricalOhlcv({
      symbol: pair.symbol,
      convert: pair.convert,
    });
  }
  return out;
}

if (import.meta.url === new URL(process.argv[1] || "", "file:").href) {
  const validation = await validateCmcApiKey({ required: true });
  console.log(JSON.stringify({ validation }, null, 2));
  const series = await fetchDefaultPairSeries();
  for (const [pair, bars] of Object.entries(series)) {
    console.log(`${pair}: ${bars.length} bars, last close=${bars.at(-1)?.close}`);
  }
}
