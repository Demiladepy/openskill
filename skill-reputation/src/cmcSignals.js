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
  parseCmcTimestamp,
  useMock,
} from "./cmcDataClient.js";
import { fetchCryptoTechnicals, mcpEnabled } from "./cmcMcpClient.js";
import { getTwakCli } from "./twakCliClient.js";
import { loadProjectEnv } from "./lib/loadEnv.js";

loadProjectEnv();

async function enrichWithTwak(symbol) {
  const twak = getTwakCli();
  if (!twak.available) return null;
  try {
    const [price, risk] = [twak.getPrice(symbol), twak.getTokenRisk(symbol)];
    if (!price && !risk) return null;
    return {
      price,
      risk,
      riskScore: risk,
      source: "twak-cli",
      version: twak.version,
      note: "Token risk scoring via Trust Wallet Agent Kit (Track 2 — no trade execution)",
    };
  } catch (err) {
    console.warn("[cmcSignals] TWAK enrichment failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

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

  const twak = await enrichWithTwak(symbol);
  const dataSources = [source];
  if (twak) dataSources.push("twak-cli");

  return {
    source,
    _dataSources: dataSources,
    _twakUsed: !!twak,
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
    twak,
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
  const twakExtra = await enrichWithTwak(symbol);
  if (twakExtra) {
    cmcSignals.twak = twakExtra;
    cmcSignals._twakUsed = true;
    cmcSignals._dataSources = [...(cmcSignals._dataSources || [cmcSignals.source]), "twak-cli"];
  }

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
    fearHistory.map((f) => [parseCmcTimestamp(f.timestamp).slice(0, 10), f.value])
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
