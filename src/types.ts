export type ExtendedSession = 'pre' | 'post' | null;

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
  marketState?: string | null;
  regularClose?: number | null;
  extendedPrice?: number | null;
  extendedSession?: ExtendedSession;
  preMarketPrice?: number | null;
  postMarketPrice?: number | null;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type CandleSource = 'twelvedata' | 'yahoo';

export type CandleResponse = {
  candles: Candle[];
  source: CandleSource;
  note?: string;
};

export type InstrumentMeta = {
  symbol: string;
  displaySymbol: string;
  name: string;
  logo: string | null;
  mark: string | null;
  type: string;
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

export type VolumeMASettings = {
  enabled: boolean;
  type: 'SMA' | 'EMA';
  length: number;
  color: string;
};

export type ChartSettings = {
  upColor: string;
  downColor: string;
  backgroundColor: string;
  gridVisible: boolean;
  gridColor: string;
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
  bars: number;
  group: 'Seconds' | 'Minutes' | 'Hours' | 'Days' | 'Weeks & Months';
  available: boolean;
  note?: string;
};


export type AccountUser = {
  id: number;
  email: string;
};

export type UserPreferences = {
  watchlist?: string[];
  selected?: string;
  timeframe?: string;
  timeframeFavorites?: string[];
  indicators?: IndicatorSettings;
  volumeMA?: VolumeMASettings;
  logScale?: boolean;
  chartSettings?: ChartSettings;
  watchlistWidth?: number | null;
};

export type AuthResponse = {
  user: AccountUser | null;
  preferences: UserPreferences | null;
};
