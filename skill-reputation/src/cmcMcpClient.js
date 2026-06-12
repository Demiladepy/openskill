/**
 * CoinMarketCap MCP client — bridge to https://mcp.coinmarketcap.com/mcp
 * Uses pre-computed indicators (RSI, MACD, EMA, Fear & Greed) via MCP tools.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { loadProjectEnv } from "./lib/loadEnv.js";

loadProjectEnv();

const MCP_URL = process.env.CMC_MCP_URL || "https://mcp.coinmarketcap.com/mcp";

/** @type {Client | null} */
let client = null;
/** @type {Promise<Client> | null} */
let connectPromise = null;

export function mcpEnabled() {
  return process.env.MCP_ENABLED === "1" && !!process.env.CMC_API_KEY;
}

function mcpHeaders() {
  return {
    "X-CMC-MCP-API-KEY": process.env.CMC_API_KEY || "",
    Accept: "application/json, text/event-stream",
  };
}

async function getClient() {
  if (client) return client;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
      requestInit: { headers: mcpHeaders() },
    });
    const c = new Client({ name: "cmc-strategy-forge", version: "1.0.0" });
    await c.connect(transport);
    client = c;
    return c;
  })();

  try {
    return await connectPromise;
  } catch (err) {
    connectPromise = null;
    client = null;
    throw err;
  }
}

/** @param {import("@modelcontextprotocol/sdk/types.js").CallToolResult} result */
export function extractMcpText(result) {
  const parts = result?.content || [];
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

/**
 * Parse CMC MCP technical analysis text into structured indicators.
 * @param {string} text
 */
export function parseTechnicalsFromMcp(text) {
  if (!text) return null;
  try {
    const json = JSON.parse(text);
    if (json.rsi != null || json.RSI != null) {
      return normalizeTechnicals(json);
    }
  } catch {
    /* markdown/text response */
  }

  const pick = (patterns) => {
    for (const re of patterns) {
      const m = text.match(re);
      if (m) return Number(m[1]);
    }
    return null;
  };

  const parsed = {
    rsi: pick([/RSI[^0-9]*(\d+\.?\d*)/i, /"rsi"\s*:\s*(\d+\.?\d*)/i]),
    macd: pick([/MACD[^0-9-]*(-?\d+\.?\d*)/i, /"macd"\s*:\s*(-?\d+\.?\d*)/i]),
    macd_signal: pick([/MACD signal[^0-9-]*(-?\d+\.?\d*)/i, /"macd_signal"\s*:\s*(-?\d+\.?\d*)/i]),
    macd_histogram: pick([/histogram[^0-9-]*(-?\d+\.?\d*)/i, /"macd_histogram"\s*:\s*(-?\d+\.?\d*)/i]),
    ema_12: pick([/EMA\s*12[^0-9]*(\d+\.?\d*)/i]),
    ema_26: pick([/EMA\s*26[^0-9]*(\d+\.?\d*)/i]),
    support: pick([/support[^0-9]*(\d+\.?\d*)/i]),
    resistance: pick([/resistance[^0-9]*(\d+\.?\d*)/i]),
    raw: text.slice(0, 2000),
  };

  if (Object.values(parsed).every((v) => v == null || typeof v === "string")) return null;
  return parsed;
}

function normalizeTechnicals(obj) {
  return {
    rsi: num(obj.rsi ?? obj.RSI),
    macd: num(obj.macd ?? obj.MACD),
    macd_signal: num(obj.macd_signal ?? obj.signal),
    macd_histogram: num(obj.macd_histogram ?? obj.histogram),
    ema_12: num(obj.ema_12 ?? obj.ema12),
    ema_26: num(obj.ema_26 ?? obj.ema26),
    support: num(obj.support),
    resistance: num(obj.resistance),
  };
}

function num(v) {
  return v == null || Number.isNaN(Number(v)) ? null : Number(v);
}

export async function listMcpTools() {
  if (!mcpEnabled()) return [];
  const c = await getClient();
  const { tools } = await c.listTools();
  return tools || [];
}

/**
 * @param {string} name MCP tool name
 * @param {Record<string, unknown>} args
 */
export async function callMcpTool(name, args = {}) {
  if (!mcpEnabled()) {
    throw new Error("MCP_ENABLED=1 and CMC_API_KEY required for MCP calls");
  }
  const c = await getClient();
  const result = await c.callTool({ name, arguments: args });
  return {
    text: extractMcpText(result),
    raw: result,
  };
}

export async function fetchCryptoTechnicals(symbol) {
  const { text } = await callMcpTool("get_crypto_technical_analysis", { symbol });
  return {
    source: "cmc-mcp",
    symbol,
    ...parseTechnicalsFromMcp(text),
    raw: text,
  };
}

export async function fetchQuotesLatestMcp(symbol) {
  const { text } = await callMcpTool("get_crypto_quotes_latest", { symbol });
  return { source: "cmc-mcp", symbol, text, parsed: tryParseJson(text) };
}

export async function fetchGlobalMetricsMcp() {
  const { text } = await callMcpTool("get_global_metrics_latest", {});
  return { source: "cmc-mcp", text, parsed: tryParseJson(text) };
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function disconnectMcp() {
  if (client) {
    await client.close().catch(() => {});
    client = null;
    connectPromise = null;
  }
}

export { MCP_URL };
