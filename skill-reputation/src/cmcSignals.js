/**
 * CMC pre-computed signal aggregation — REST (Option A) + MCP (Option B).
 * Strategies consume this layer instead of recomputing indicators from raw OHLCV.
 */
import {
  fetchSpotQuotes,
  fetchGlobalMetrics,
  fetchFearGreedIndex,
  fetchFearGreedHistorical,
  fetchMarketBundle,
  useMock,
} from "./cmcDataClient.js";
import { fetchCryptoTechnicals, mcpEnabled } from "./cmcMcpClient.js";
import { loadProjectEnv } from "./lib/loadEnv.js";

loadProjectEnv();

/**
 * Returns pre-computed CMC signals for a given asset (point-in-time snapshot).
 * @param {string} symbol
 * @param {string} convert
 */
export async function getSignals(symbol = "BTC", convert = "USDT") {
  const spot = await fetchSpotQuotes(symbol, convert);
  const global = await fetchGlobalMetrics(convert);
  const fear = await fetchFearGreedIndex();

  let technicals = null;
  let source = useMock() ? "mock" : "cmc-rest";

  if (mcpEnabled()) {
    try {
      technicals = await fetchCryptoTechnicals(symbol);
      source = "cmc-mcp+rest";
    } catch (err) {
      console.warn("[cmcSignals] MCP technicals unavailable:", err instanceof Error ? err.message : err);
    }
  }

  const marketCap = spot.price && spot.cmcRank ? spot.price * 1e9 : null;
  const volumeMcRatio =
    spot.volume24h && global.totalMarketCap
      ? spot.volume24h / global.totalMarketCap
      : spot.volume24h && marketCap
        ? spot.volume24h / marketCap
        : null;

  return {
    source,
    symbol,
    convert,
    price: {
      current: spot.price ?? 0,
      change_1h: spot.percentChange1h ?? null,
      change_24h: spot.percentChange24h ?? 0,
      change_7d: spot.percentChange7d ?? 0,
      change_30d: spot.percentChange30d ?? 0,
      change_90d: spot.percentChange90d ?? null,
    },
    market: {
      total_market_cap: global.totalMarketCap ?? 0,
      btc_dominance: global.btcDominance ?? 0,
      eth_dominance: global.ethDominance ?? 0,
      total_volume_24h: global.totalVolume24h ?? 0,
      active_cryptocurrencies: global.activeCryptocurrencies ?? null,
    },
    sentiment: {
      fear_greed_value: fear.value ?? 50,
      fear_greed_label: fear.classification ?? "Neutral",
      fear_greed_timestamp: fear.timestamp ?? new Date().toISOString(),
    },
    volume: {
      volume_24h: spot.volume24h ?? 0,
      volume_change_24h: spot.volumeChange24h ?? null,
      volume_market_cap_ratio: volumeMcRatio,
    },
    relative: {
      market_cap_rank: spot.cmcRank ?? null,
      market_cap_dominance: spot.marketCapDominance ?? null,
      num_market_pairs: spot.numMarketPairs ?? null,
    },
    technicals: technicals
      ? {
          rsi: technicals.rsi,
          macd: technicals.macd,
          macd_signal: technicals.macd_signal,
          macd_histogram: technicals.macd_histogram,
          ema_12: technicals.ema_12,
          ema_26: technicals.ema_26,
          support: technicals.support,
          resistance: technicals.resistance,
          source: "cmc-mcp",
        }
      : null,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Enrich a market bundle with CMC signals + optional MCP global metrics.
 * @param {Awaited<ReturnType<typeof fetchMarketBundle>>} bundle
 */
export async function enrichMarketBundle(bundle) {
  const symbol = bundle.meta?.symbol || "BNB";
  const convert = bundle.meta?.convert || "USDT";

  const cmcSignals = await buildSignalsFromBundle(bundle, symbol, convert);

  if (mcpEnabled() && !cmcSignals.technicals) {
    try {
      cmcSignals.technicals = await fetchCryptoTechnicals(symbol);
      cmcSignals.source = "cmc-mcp+rest";
    } catch {
      /* REST-only path */
    }
  }

  let fearHistory = [];
  try {
    fearHistory = await fetchFearGreedHistorical(90);
  } catch {
    /* optional */
  }

  const fearByDate = new Map(
    fearHistory.map((f) => [new Date(f.timestamp).toISOString().slice(0, 10), f.value])
  );

  return {
    ...bundle,
    cmcSignals,
    fearGreedHistory: fearHistory,
    fearGreedByDate: fearByDate,
  };
}

function buildSignalsFromBundle(bundle, symbol, convert) {
  const spot = bundle.spot || {};
  const global = bundle.globalMetrics || {};
  const fear = bundle.fearGreed || {};

  return {
    source: bundle.meta?.mockWarning ? "mock" : "cmc-rest",
    symbol,
    convert,
    price: {
      current: spot.price ?? 0,
      change_1h: spot.percentChange1h ?? null,
      change_24h: spot.percentChange24h ?? 0,
      change_7d: spot.percentChange7d ?? 0,
      change_30d: spot.percentChange30d ?? 0,
      change_90d: spot.percentChange90d ?? null,
    },
    market: {
      total_market_cap: global.totalMarketCap ?? 0,
      btc_dominance: global.btcDominance ?? 0,
      eth_dominance: global.ethDominance ?? 0,
      total_volume_24h: global.totalVolume24h ?? 0,
    },
    sentiment: {
      fear_greed_value: fear.value ?? 50,
      fear_greed_label: fear.classification ?? "Neutral",
    },
    volume: {
      volume_24h: spot.volume24h ?? 0,
      volume_market_cap_ratio:
        spot.volume24h && global.totalMarketCap ? spot.volume24h / global.totalMarketCap : null,
    },
    relative: {
      market_cap_rank: spot.cmcRank ?? null,
      num_market_pairs: spot.numMarketPairs ?? null,
    },
    technicals: null,
    fetched_at: new Date().toISOString(),
  };
}

/** Lookup CMC Fear & Greed for a bar date (YYYY-MM-DD). */
export function fearGreedForBar(marketData, barTimestamp) {
  const day = new Date(barTimestamp).toISOString().slice(0, 10);
  const map = marketData.fearGreedByDate;
  if (map instanceof Map && map.has(day)) return map.get(day);
  return marketData.cmcSignals?.sentiment?.fear_greed_value ?? marketData.fearGreed?.value ?? 50;
}

export { getSignals as default };
