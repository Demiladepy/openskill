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
      volumeChange24h: q?.volume_change_24h ?? null,
      percentChange1h: q?.percent_change_1h ?? null,
      percentChange24h: q?.percent_change_24h ?? 0,
      percentChange7d: q?.percent_change_7d ?? 0,
      percentChange30d: q?.percent_change_30d ?? 0,
      percentChange90d: q?.percent_change_90d ?? null,
      marketCap: q?.market_cap ?? null,
      marketCapDominance: q?.market_cap_dominance ?? null,
      cmcRank: row?.cmc_rank ?? null,
      numMarketPairs: row?.num_market_pairs ?? null,
      lastUpdated: row?.last_updated,
    };
  } catch (err) {
    console.warn("[cmcDataClient] spot quotes fallback:", err instanceof Error ? err.message : err);
    return mockSpotQuotes(symbol, convert, true);
  }
}

export function parseCmcTimestamp(ts) {
  if (ts == null) return new Date().toISOString();
  if (typeof ts === "number") {
    const ms = ts < 1e12 ? ts * 1000 : ts;
    return new Date(ms).toISOString();
  }
  const asNum = Number(ts);
  if (!Number.isNaN(asNum) && /^\d+$/.test(String(ts).trim())) {
    const ms = asNum < 1e12 ? asNum * 1000 : asNum;
    return new Date(ms).toISOString();
  }
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Free-tier fallback: daily bars anchored to live CMC spot + pre-computed % changes.
 * Honest label — not full OHLCV history (paid endpoint).
 */
function synthesizeOhlcvFromSpot(spot, symbol, count) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const priceNow = spot.price;
  const r7 = (spot.percentChange7d ?? 0) / 100;
  const r30 = (spot.percentChange30d ?? 0) / 100;
  const r90 = (spot.percentChange90d ?? spot.percentChange30d ?? 0) / 100;
  const seed = [...String(symbol)].reduce((a, c) => a + c.charCodeAt(0), 0);

  const anchors = [
    { days: 0, price: priceNow },
    { days: 7, price: priceNow / (1 + r7 || 1) },
    { days: 30, price: priceNow / (1 + r30 || 1) },
    { days: 90, price: priceNow / (1 + r90 || 1) },
  ];

  function priceAtDaysAgo(daysAgo) {
    if (daysAgo <= 0) return priceNow;
    const maxDay = Math.max(count - 1, 90);
    const target = Math.min(daysAgo, maxDay);
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      if (target >= a.days && target <= b.days) {
        const t = b.days === a.days ? 0 : (target - a.days) / (b.days - a.days);
        return a.price * (1 - t) + b.price * t;
      }
    }
    return anchors[anchors.length - 1].price;
  }

  const bars = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = count - 1 - i;
    const d = new Date(end.getTime() - daysAgo * 86400000);
    const base = priceAtDaysAgo(daysAgo);
    const wobble = 1 + Math.sin((i + seed) / 11) * 0.006;
    const close = base * wobble;
    const open = close * (1 + Math.sin(i * 0.5 + seed) * 0.004);
    bars.push({
      timestamp: d.toISOString(),
      open,
      high: Math.max(open, close) * 1.008,
      low: Math.min(open, close) * 0.992,
      close,
      volume: (spot.volume24h ?? 1e9) * (0.85 + Math.sin(i / 7) * 0.1),
    });
  }
  bars._synthetic = "cmc-anchored";
  bars._anchor = { price: priceNow, percentChange7d: spot.percentChange7d, percentChange30d: spot.percentChange30d };
  return bars;
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

  try {
    const spot = await fetchSpotQuotes(symbol, convert);
    if (spot.source === "cmc" && spot.price > 0) {
      console.warn(
        `[cmcDataClient] OHLCV paid endpoint unavailable on your plan — synthesizing ${count} daily bars from live CMC quotes (% changes) for`,
        symbol
      );
      return synthesizeOhlcvFromSpot(spot, symbol, count);
    }
  } catch (err) {
    console.warn("[cmcDataClient] spot anchor for OHLCV failed:", err instanceof Error ? err.message : err);
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
      activeCryptocurrencies: json?.data?.active_cryptocurrencies ?? null,
      marketCapChange24h: q?.total_market_cap_yesterday
        ? ((q.total_market_cap - q.total_market_cap_yesterday) / q.total_market_cap_yesterday) * 100
        : null,
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

export async function fetchFearGreedHistorical(limit = 90) {
  if (useMock()) return mockFearGreedHistorical(limit);
  try {
    const json = await cmcFetch("/v3/fear-and-greed/historical", { limit });
    return (json?.data || []).map((row) => ({
      source: "cmc",
      timestamp: parseCmcTimestamp(row.timestamp || row.time_open),
      value: row.value ?? 50,
      classification: row.value_classification ?? "Neutral",
    }));
  } catch {
    return mockFearGreedHistorical(limit, true);
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

  const dataProvenance = {
    spot: spot?.source,
    ohlcv: ohlcv?._mock ? "mock" : ohlcv?._synthetic ? "cmc-synthetic-ohlcv" : Array.isArray(ohlcv) ? "cmc" : ohlcv?.source,
    globalMetrics: globalMetrics?.source,
    onChain: onChain?.source,
    social: social?.source,
    derivatives: derivatives?.source,
    fearGreed: fearGreed?.source,
    fetched_at: new Date().toISOString(),
  };

  return {
    meta: {
      dataSource: mock ? "mock-with-warning" : anyFallback ? "cmc-mixed" : "coinmarketcap-data-api",
      dataProvenance,
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
    volumeChange24h: 2.5,
    percentChange1h: 0.3,
    percentChange24h: 1.2,
    percentChange7d: -8.5,
    percentChange30d: 12.0,
    percentChange90d: 25.0,
    marketCapDominance: symbol === "BTC" ? 52 : 1.2,
    cmcRank: symbol === "BTC" ? 1 : symbol === "ETH" ? 2 : 10,
    numMarketPairs: 500,
    lastUpdated: new Date().toISOString(),
  };
}

function mockHistoricalOhlcv(symbol, convert, count, warned = false) {
  const bases = { BTC: 95000, ETH: 3500, BNB: 580, CAKE: 2.5 };
  const base = bases[symbol] ?? 580;
  const seed = [...String(symbol)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const phase = (seed % 17) * 0.15;
  const bars = [];
  const start = new Date("2025-06-01T00:00:00Z");

  for (let i = 0; i < count; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const cycle = Math.sin((i + seed) / 18 + phase) * 0.12;
    const trend = i * 0.0008 * (1 + (seed % 5) * 0.1);
    let price = base * (0.75 + trend + cycle);

    if (i >= 40 && i < 55) price *= 0.92 - (i - 40) * 0.002;
    if (i >= 55 && i < 70) price *= 1.0 + (i - 55) * 0.008;
    if (i >= 120 && i < 135) price *= 0.94;
    if (i >= 200 && i < 220) price *= 1.0 + (i - 200) * 0.006;

    const open = price * (0.998 + Math.sin(i + seed) * 0.002);
    const close = price;
    bars.push({
      timestamp: d.toISOString(),
      open,
      high: Math.max(open, close) * (1.008 + (seed % 3) * 0.002),
      low: Math.min(open, close) * (0.992 - (seed % 3) * 0.002),
      close,
      volume: 400000 + i * 1500 + seed * 100,
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
    activeCryptocurrencies: 12000,
    marketCapChange24h: 1.5,
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
  const seed = [...String(symbol)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    source: warned ? "mock-fallback" : "mock",
    symbol,
    fundingRate: 0.00008 + (seed % 7) * 0.00002,
    openInterest: 800000000 + seed * 1e6,
    openInterestChange24h: -0.02 + (seed % 5) * 0.015,
  };
}

function mockFearGreed(warned = false) {
  return {
    source: warned ? "mock-fallback" : "mock",
    value: 38,
    classification: "Fear",
    timestamp: new Date().toISOString(),
  };
}

function mockFearGreedHistorical(limit, warned = false) {
  const out = [];
  const start = new Date("2025-06-01T00:00:00Z").getTime();
  for (let i = 0; i < limit; i++) {
    const d = new Date(start + i * 86400000);
    const value = Math.round(42 + Math.sin(i / 9) * 18 + Math.cos(i / 23) * 8);
    out.push({
      source: warned ? "mock-fallback" : "mock",
      timestamp: d.toISOString(),
      value: Math.max(10, Math.min(90, value)),
      classification: value < 35 ? "Fear" : value > 65 ? "Greed" : "Neutral",
    });
  }
  return out;
}

export { CMC_AGENT_DOCS, useMock };
