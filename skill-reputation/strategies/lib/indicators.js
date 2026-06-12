export function sma(values, period) {
  const out = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += values[j];
    out[i] = s / period;
  }
  return out;
}

export function ema(values, period) {
  const out = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      out[i] = values[i];
      continue;
    }
    out[i] = values[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

export function rsi(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  for (let i = period; i < closes.length; i++) {
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    const rs = losses === 0 ? 100 : gains / losses;
    out[i] = 100 - 100 / (1 + rs);
  }
  return out;
}

export function macd(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const line = closes.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null
  );
  const validLine = line.map((v) => v ?? 0);
  const signalLine = ema(validLine, signal);
  return { line, signal: signalLine };
}

/** @param {Array<{ high: number, low: number, close: number }>} bars */
export function atr(bars, period = 14) {
  const out = new Array(bars.length).fill(null);
  const trs = [];
  for (let i = 0; i < bars.length; i++) {
    if (i === 0) {
      trs.push(bars[i].high - bars[i].low);
    } else {
      const hl = bars[i].high - bars[i].low;
      const hc = Math.abs(bars[i].high - bars[i - 1].close);
      const lc = Math.abs(bars[i].low - bars[i - 1].close);
      trs.push(Math.max(hl, hc, lc));
    }
  }
  for (let i = period - 1; i < trs.length; i++) {
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += trs[j];
    out[i] = s / period;
  }
  return out;
}

/** Rolling percent return over N bars. */
export function rollingReturn(closes, lookback) {
  const out = new Array(closes.length).fill(null);
  for (let i = lookback; i < closes.length; i++) {
    const prev = closes[i - lookback];
    out[i] = prev > 0 ? ((closes[i] - prev) / prev) * 100 : 0;
  }
  return out;
}
