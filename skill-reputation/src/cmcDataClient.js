import { loadProjectEnv } from "./lib/loadEnv.js";

loadProjectEnv();

const CMC_BASE = "https://pro-api.coinmarketcap.com";
const CMC_AGENT_DOCS = "https://coinmarketcap.com/api/agent";

class RateLimiter {
  constructor(minIntervalMs = 1200) {
    this.minIntervalMs = minIntervalMs;
    this.lastCallAt = 0;
  }
  async wait() {
    const now = Date.now();
    const wait = this.minIntervalMs - (now - this.lastCallAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastCallAt = Date.now();
  }
}

const limiter = new RateLimiter(Number(process.env.CMC_MIN_REQUEST_INTERVAL_MS || "1200"));

function apiKey() {
  return process.env.CMC_API_KEY || "";
}

function useMock() {
  return process.env.CMC_USE_MOCK === "1" || !apiKey();
}

async function cmcFetch(path, params = {}) {
  if (useMock()) return null;
  const url = new URL(`${CMC_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  await limiter.wait();
  const res = await fetch(url, {
    headers: { "X-CMC_PRO_API_KEY": apiKey(), Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CMC ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

/** @param {string} symbol @param {string} convert */
export async function fetchSpotQuotes(symbol = "BNB", convert = "USDT") {
  if (useMock()) {
    return mockSpotQuotes(symbol, convert);
  }
  try {
    const json = await cmcFetch("/v1/cryptocurrency/quotes/latest", { symbol, convert });
    const q = json?.data?.[symbol]?.quote?.[convert];
    return {
      source: "cmc",
      symbol,
      convert,
      price: q?.price ?? 0,
      volume24h: q?.volume_24h ?? 0,
      percentChange24h: q?.percent_change_24h ?? 0,
      lastUpdated: json?.data?.[symbol]?.last_updated,
    };
  } catch (err) {
    console.warn("[cmcDataClient] spot quotes fallback:", err instanceof Error ? err.message : err);
    return mockSpotQuotes(symbol, convert, true);
  }
}

/** @param {string} symbol @param {number} count */
export async function fetchHistoricalOhlcv(symbol = "BNB", convert = "USDT", count = 90) {
  if (useMock()) {
    return mockHistoricalOhlcv(symbol, convert, count);
  }
  try {
    const json = await cmcFetch("/v1/cryptocurrency/ohlcv/historical", {
      symbol,
      convert,
      count,
      interval: "daily",
    });
    const quotes = json?.data?.quotes || [];
    return quotes
      .map((row) => {
        const q = row.quote?.[convert];
        if (!q) return null;
        return {
          timestamp: row.time_close || row.time_open,
          open: Number(q.open),
          high: Number(q.high),
          low: Number(q.low),
          close: Number(q.close),
          volume: Number(q.volume || 0),
        };
      })
      .filter(Boolean);
  } catch {
    try {
      const json = await cmcFetch("/v1/cryptocurrency/quotes/historical", {
        symbol,
        convert,
        count,
        interval: "1d",
      });
      return (json?.data?.quotes || []).map((row) => {
        const q = row.quote?.[convert];
        const px = Number(q?.price || 0);
        return {
          timestamp: row.timestamp || q?.timestamp,
          open: px,
          high: px,
          low: px,
          close: px,
          volume: Number(q?.volume_24h || 0),
        };
      });
    } catch (err) {
      console.warn("[cmcDataClient] OHLCV fallback to mock:", err instanceof Error ? err.message : err);
      return mockHistoricalOhlcv(symbol, convert, count, true);
    }
  }
}

export async function fetchOnChainMetrics(symbol = "BNB") {
  if (useMock()) return mockOnChainMetrics(symbol);
  try {
    // Placeholder endpoint shape for hackathon demo; falls back if unavailable
    const json = await cmcFetch("/v1/onchain/network/metrics/latest", { symbol });
    return {
      source: "cmc",
      symbol,
      whaleNetFlow: json?.data?.whale_net_flow ?? 0,
      exchangeInflow: json?.data?.exchange_inflow ?? 0,
      exchangeOutflow: json?.data?.exchange_outflow ?? 0,
    };
  } catch {
    return mockOnChainMetrics(symbol, true);
  }
}

export async function fetchSocialSentiment(symbol = "BNB") {
  if (useMock()) return mockSocialSentiment(symbol);
  try {
    const json = await cmcFetch("/v1/social/coin/latest", { symbol });
    return {
      source: "cmc",
      symbol,
      socialVolume: json?.data?.social_volume ?? 0,
      sentimentScore: json?.data?.sentiment_score ?? 0.5,
      kolMentions: json?.data?.kol_mentions ?? 0,
    };
  } catch {
    return mockSocialSentiment(symbol, true);
  }
}

export async function fetchDerivatives(symbol = "BNB") {
  if (useMock()) return mockDerivatives(symbol);
  try {
    const json = await cmcFetch("/v1/derivatives/open-interest/latest", { symbol });
    return {
      source: "cmc",
      symbol,
      fundingRate: json?.data?.funding_rate ?? 0,
      openInterest: json?.data?.open_interest ?? 0,
      openInterestChange24h: json?.data?.oi_change_24h ?? 0,
    };
  } catch {
    return mockDerivatives(symbol, true);
  }
}

export async function fetchFearGreedIndex() {
  if (useMock()) return mockFearGreed();
  try {
    const json = await cmcFetch("/v3/fear-and-greed/historical", { limit: 30 });
    const latest = json?.data?.[0];
    return {
      source: "cmc",
      value: latest?.value ?? 50,
      classification: latest?.value_classification ?? "Neutral",
    };
  } catch {
    return mockFearGreed(true);
  }
}

/**
 * Bundle all data types for strategy generation/backtest.
 * @param {{ symbol?: string, convert?: string, barCount?: number }} opts
 */
export async function fetchMarketBundle(opts = {}) {
  const symbol = opts.symbol || "BNB";
  const convert = opts.convert || "USDT";
  const barCount = opts.barCount || 90;
  const mock = useMock();

  const [spot, ohlcv, onChain, social, derivatives, fearGreed] = await Promise.all([
    fetchSpotQuotes(symbol, convert),
    fetchHistoricalOhlcv(symbol, convert, barCount),
    fetchOnChainMetrics(symbol),
    fetchSocialSentiment(symbol),
    fetchDerivatives(symbol),
    fetchFearGreedIndex(),
  ]);

  return {
    meta: {
      dataSource: mock ? "mock-with-warning" : "coinmarketcap-data-api",
      docs: CMC_AGENT_DOCS,
      mockWarning: mock ? "MOCK DATA — set CMC_API_KEY for live CoinMarketCap Data API" : null,
      symbol,
      convert,
    },
    spot,
    ohlcv,
    onChain,
    social,
    derivatives,
    fearGreed,
  };
}

export async function validateCmcApiKey(opts = {}) {
  if (!apiKey()) {
    if (opts.required) throw new Error("CMC_API_KEY is required");
    return { ok: false, skipped: true };
  }
  const q = await fetchSpotQuotes("BNB", "USDT");
  return { ok: q.source === "cmc", price: q.price };
}

function mockSpotQuotes(symbol, convert, warned = false) {
  return {
    source: warned ? "mock-fallback" : "mock",
    symbol,
    convert,
    price: symbol === "CAKE" ? 2.85 : 612.4,
    volume24h: 1_200_000_000,
    percentChange24h: 1.2,
    lastUpdated: new Date().toISOString(),
  };
}

function mockHistoricalOhlcv(symbol, convert, count, warned = false) {
  const bars = [];
  const base = symbol === "CAKE" ? 2.5 : 580;
  const start = new Date("2026-05-01T00:00:00Z");
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const close = base + Math.sin(i / 4) * 15 + i * 0.8;
    bars.push({
      timestamp: d.toISOString(),
      open: close - 2,
      high: close + 4,
      low: close - 4,
      close,
      volume: 500000 + i * 1200,
    });
  }
  bars._mock = warned ? "fallback" : true;
  return bars;
}

function mockOnChainMetrics(symbol, warned = false) {
  return {
    source: warned ? "mock-fallback" : "mock",
    symbol,
    whaleNetFlow: -1200000,
    exchangeInflow: 450000,
    exchangeOutflow: 620000,
  };
}

function mockSocialSentiment(symbol, warned = false) {
  return {
    source: warned ? "mock-fallback" : "mock",
    symbol,
    socialVolume: 8400,
    sentimentScore: 0.62,
    kolMentions: 128,
  };
}

function mockDerivatives(symbol, warned = false) {
  return {
    source: warned ? "mock-fallback" : "mock",
    symbol,
    fundingRate: 0.00012,
    openInterest: 890000000,
    openInterestChange24h: 0.034,
  };
}

function mockFearGreed(warned = false) {
  return {
    source: warned ? "mock-fallback" : "mock",
    value: 22,
    classification: "Extreme Fear",
  };
}

export { CMC_AGENT_DOCS, useMock };
