export type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type SearchResult = {
  symbol: string;
  description: string;
  type?: string;
  displaySymbol?: string;
};

export type IndicatorSettings = {
  sma10: boolean;
  sma20: boolean;
  sma50: boolean;
  sma200: boolean;
  ema9: boolean;
  ema20: boolean;
  ema50: boolean;
  bollinger20: boolean;
  vwap: boolean;
  rsi14: boolean;
  macd: boolean;
  stochastic14: boolean;
  atr14: boolean;
  volume: boolean;
};

export type AlertDirection = 'above' | 'below';

export type PriceAlert = {
  id: number;
  symbol: string;
  direction: AlertDirection;
  target: number;
  active: number;
  triggered_at: string | null;
  last_price: number | null;
  created_at: string;
  note?: string | null;
};

export type Timeframe = {
  label: string;
  resolution: string;
  seconds: number;
};
