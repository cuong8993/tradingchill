import type { Candle } from '../types';

type Point = { time: number; value: number };

export function sma(candles: Candle[], period: number): Point[] {
  const out: Point[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period });
  }
  return out;
}

export function ema(candles: Candle[], period: number): Point[] {
  if (candles.length < period) return [];
  const out: Point[] = [];
  const k = 2 / (period + 1);
  let prev = candles.slice(0, period).reduce((a, c) => a + c.close, 0) / period;
  out.push({ time: candles[period - 1].time, value: prev });
  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k);
    out.push({ time: candles[i].time, value: prev });
  }
  return out;
}

export function bollinger(candles: Candle[], period = 20, multiplier = 2) {
  const middle = sma(candles, period);
  const upper: Point[] = [];
  const lower: Point[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1).map(c => c.close);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push({ time: candles[i].time, value: mean + multiplier * sd });
    lower.push({ time: candles[i].time, value: mean - multiplier * sd });
  }
  return { middle, upper, lower };
}

export function rsi(candles: Candle[], period = 14): Point[] {
  if (candles.length <= period) return [];
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].close - candles[i - 1].close;
    if (d >= 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  const out: Point[] = [];
  const calc = () => avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  out.push({ time: candles[period].time, value: calc() });
  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].close - candles[i - 1].close;
    const gain = Math.max(d, 0);
    const loss = Math.max(-d, 0);
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out.push({ time: candles[i].time, value: calc() });
  }
  return out;
}

export function macd(candles: Candle[], fast = 12, slow = 26, signal = 9) {
  const fastEma = ema(candles, fast);
  const slowEma = ema(candles, slow);
  const fastMap = new Map(fastEma.map(p => [p.time, p.value]));
  const line: Point[] = slowEma
    .filter(p => fastMap.has(p.time))
    .map(p => ({ time: p.time, value: (fastMap.get(p.time) as number) - p.value }));

  if (line.length < signal) return { line, signal: [], histogram: [] as Point[] };
  const signalOut: Point[] = [];
  let prev = line.slice(0, signal).reduce((a, p) => a + p.value, 0) / signal;
  signalOut.push({ time: line[signal - 1].time, value: prev });
  const k = 2 / (signal + 1);
  for (let i = signal; i < line.length; i++) {
    prev = line[i].value * k + prev * (1 - k);
    signalOut.push({ time: line[i].time, value: prev });
  }
  const signalMap = new Map(signalOut.map(p => [p.time, p.value]));
  const histogram = line.filter(p => signalMap.has(p.time)).map(p => ({
    time: p.time,
    value: p.value - (signalMap.get(p.time) as number),
  }));
  return { line, signal: signalOut, histogram };
}

export function vwap(candles: Candle[]): Point[] {
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;
  return candles.flatMap(c => {
    const volume = Number.isFinite(c.volume) ? c.volume : 0;
    cumulativeTypicalVolume += ((c.high + c.low + c.close) / 3) * volume;
    cumulativeVolume += volume;
    if (cumulativeVolume <= 0) return [];
    return [{ time: c.time, value: cumulativeTypicalVolume / cumulativeVolume }];
  });
}

export function stochastic(candles: Candle[], period = 14, smooth = 3) {
  const k: Point[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const window = candles.slice(i - period + 1, i + 1);
    const highest = Math.max(...window.map(c => c.high));
    const lowest = Math.min(...window.map(c => c.low));
    const range = highest - lowest;
    k.push({ time: candles[i].time, value: range === 0 ? 50 : ((candles[i].close - lowest) / range) * 100 });
  }
  const d: Point[] = [];
  for (let i = smooth - 1; i < k.length; i++) {
    const value = k.slice(i - smooth + 1, i + 1).reduce((sum, p) => sum + p.value, 0) / smooth;
    d.push({ time: k[i].time, value });
  }
  return { k, d };
}

export function atr(candles: Candle[], period = 14): Point[] {
  if (candles.length <= period) return [];
  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previousClose = candles[i - 1].close;
    tr.push(Math.max(
      current.high - current.low,
      Math.abs(current.high - previousClose),
      Math.abs(current.low - previousClose),
    ));
  }
  if (tr.length < period) return [];
  let previous = tr.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  const out: Point[] = [{ time: candles[period].time, value: previous }];
  for (let i = period; i < tr.length; i++) {
    previous = ((previous * (period - 1)) + tr[i]) / period;
    out.push({ time: candles[i + 1].time, value: previous });
  }
  return out;
}
