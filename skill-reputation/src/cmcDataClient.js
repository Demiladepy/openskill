import { loadProjectEnv } from "./lib/loadEnv.js";

loadProjectEnv();

const CMC_BASE = "https://pro-api.coinmarketcap.com";
const CMC_AGENT_DOCS = "https://coinmarketcap.com/api/agent";

class RateLimiter {
  constructor(minIntervalMs = 2000) {
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

const limiter = new RateLimiter(Number(process.env.CMC_MIN_REQUEST_INTERVAL_MS || "2000"));

function apiKey() {
  return process.env.CMC_API_KEY || "";
}

function useMock() {
  return process.env.CMC_USE_MOCK === "1" || !apiKey();
}

async function cmcFetch(path, params = {}) {
  if (useMock()) return null;
  const url = new URL(`${CMC_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
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

function parseOhlcvQuotes(quotes, convert) {
  return (quotes || [])
    .map((row) => {
      const q = row.quote?.[convert];
      if (!q) return null;
      return {
        timestamp: row.time_close || row.time_open || row.timestamp,
        open: Number(q.open ?? q.price ?? 0),
        high: Number(q.high ?? q.price ?? 0),
        low: Number(q.low ?? q.price ?? 0),
        close: Number(q.close ?? q.price ?? 0),
        volume: Number(q.volume ?? q.volume_24h ?? 0),
      };
    })
    .filter((b) => b && b.close > 0)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/** @param {string} symbol @param {string} convert */
export async function fetchSpotQuotes(symbol = "BNB", convert = "USDT") {
  if (useMock()) return mockSpotQuotes(symbol, convert);
  try {
    const json = await cmcFetch("/v1/cryptocurrency/quotes/latest", { symbol, convert });
    const row = json?.data?.[symbol];
    const q = row?.quote?.[convert];
    return {
      source: "cmc",
      symbol,
      convert,
      price: q?.price ?? 0,
      volume24h: q?.volume_24h ?? 0,
      percentChange24h: q?.percent_change_24h ?? 0,
      percentChange7d: q?.percent_change_7d ?? 0,
      percentChange30d: q?.percent_change_30d ?? 0,
      cmcRank: row?.cmc_rank ?? null,
      numMarketPairs: row?.num_market_pairs ?? null,
      lastUpdated: row?.last_updated,
    };
  } catch (err) {
    console.warn("[cmcDataClient] spot quotes fallback:", err instanceof Error ? err.message : err);
    return mockSpotQuotes(symbol, convert, true);
  }
}

/** @param {string} symbol @param {number} count */
export async function fetchHistoricalOhlcv(symbol = "BNB", convert = "USDT", count = 90) {
  if (useMock()) return mockHistoricalOhlcv(symbol, convert, count);

  const paths = [
    ["/v2/cryptocurrency/ohlcv/historical", { symbol, convert, count, interval: "daily" }],
    ["/v1/cryptocurrency/ohlcv/historical", { symbol, convert, count, interval: "daily" }],
    ["/v1/cryptocurrency/quotes/historical", { symbol, convert, count, interval: "1d" }],
  ];

  for (const [path, params] of paths) {
    try {
      const json = await cmcFetch(path, params);
      const quotes =
        json?.data?.quotes ||
        json?.data?.[symbol]?.quotes ||
        (Array.isArray(json?.data) ? json.data : []);
      const bars = parseOhlcvQuotes(quotes, convert);
      if (bars.length >= 10) {
        return bars;
      }
    } catch (err) {
      console.warn(`[cmcDataClient] OHLCV ${path} failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.warn("[cmcDataClient] OHLCV fallback to mock for", symbol);
  return mockHistoricalOhlcv(symbol, convert, count, true);
}

export async function fetchGlobalMetrics(convert = "USDT") {
  if (useMock()) return mockGlobalMetrics(convert);
  try {
    const json = await cmcFetch("/v1/global-metrics/quotes/latest", { convert });
    const q = json?.data?.quote?.[convert];
    return {
      source: "cmc",
      totalMarketCap: q?.total_market_cap ?? 0,
      totalVolume24h: q?.total_volume_24h ?? 0,
      btcDominance: json?.data?.btc_dominance ?? 0,
      ethDominance: json?.data?.eth_dominance ?? 0,
    };
  } catch (err) {
    console.warn("[cmcDataClient] global metrics fallback:", err instanceof Error ? err.message : err);
    return mockGlobalMetrics(convert, true);
  }
}

export async function fetchOnChainMetrics(symbol = "BNB") {
  if (useMock()) return mockOnChainMetrics(symbol);
  try {
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
    const json = await cmcFetch("/v3/fear-and-greed/latest", {});
    const latest = json?.data ?? json?.data?.[0];
    if (latest?.value != null) {
      return {
        source: "cmc",
        value: latest.value,
        classification: latest.value_classification ?? "Neutral",
      };
    }
  } catch (err) {
    console.warn("[cmcDataClient] fear-greed latest failed:", err instanceof Error ? err.message : err);
  }
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
 * Fetches sequentially to respect free-tier rate limits (30 req/min).
 * @param {{ symbol?: string, convert?: string, barCount?: number }} opts
 */
export async function fetchMarketBundle(opts = {}) {
  const symbol = opts.symbol || "BNB";
  const convert = opts.convert || "USDT";
  const barCount = opts.barCount || 120;
  const mock = useMock();

  const spot = await fetchSpotQuotes(symbol, convert);
  const ohlcv = await fetchHistoricalOhlcv(symbol, convert, barCount);
  const globalMetrics = await fetchGlobalMetrics(convert);
  const onChain = await fetchOnChainMetrics(symbol);
  const social = await fetchSocialSentiment(symbol);
  const derivatives = await fetchDerivatives(symbol);
  const fearGreed = await fetchFearGreedIndex();

  const anyFallback = [spot, ohlcv, globalMetrics, onChain, social, derivatives, fearGreed].some(
    (x) => x?.source?.includes?.("mock") || x?._mock
  );

  return {
    meta: {
      dataSource: mock ? "mock-with-warning" : anyFallback ? "cmc-mixed" : "coinmarketcap-data-api",
      docs: CMC_AGENT_DOCS,
      mockWarning: mock
        ? "MOCK DATA — set CMC_API_KEY for live CoinMarketCap Data API"
        : anyFallback
          ? "Partial mock fallback — some CMC endpoints unavailable on this tier"
          : null,
      symbol,
      convert,
    },
    spot,
    ohlcv,
    globalMetrics,
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
  const prices = { BTC: 95000, ETH: 3500, BNB: 612, CAKE: 2.85 };
  return {
    source: warned ? "mock-fallback" : "mock",
    symbol,
    convert,
    price: prices[symbol] ?? 100,
    volume24h: 1_200_000_000,
    percentChange24h: 1.2,
    percentChange7d: -8.5,
    percentChange30d: 12.0,
    cmcRank: 10,
    numMarketPairs: 500,
    lastUpdated: new Date().toISOString(),
  };
}

function mockHistoricalOhlcv(symbol, convert, count, warned = false) {
  const bases = { BTC: 95000, ETH: 3500, BNB: 580, CAKE: 2.5 };
  const base = bases[symbol] ?? 580;
  const bars = [];
  const start = new Date("2026-01-01T00:00:00Z");

  for (let i = 0; i < count; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    let price;
    if (i < 30) price = base * (0.82 + i * 0.002);
    else if (i < 75) price = base * (0.88 + (i - 30) * 0.011);
    else if (i < 82) price = base * 1.385 * (1 - (i - 75) * 0.017);
    else if (i < 140) price = base * 1.25 * (1 + (i - 82) * 0.005);
    else price = base * 1.55 * (1 + Math.sin(i / 10) * 0.02);

    const open = price * 0.999;
    const close = price;
    bars.push({
      timestamp: d.toISOString(),
      open,
      high: Math.max(open, close) * 1.01,
      low: Math.min(open, close) * 0.99,
      close,
      volume: 500000 + i * 1200,
    });
  }
  bars._mock = warned ? "fallback" : true;
  return bars;
}

function mockGlobalMetrics(convert, warned = false) {
  return {
    source: warned ? "mock-fallback" : "mock",
    totalMarketCap: 2.5e12,
    totalVolume24h: 8e10,
    btcDominance: 52.5,
    ethDominance: 16.2,
  };
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
    value: 38,
    classification: "Fear",
  };
}

export { CMC_AGENT_DOCS, useMock };
