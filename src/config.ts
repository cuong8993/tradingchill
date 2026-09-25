import type { IndicatorSettings, Timeframe, VolumeMASettings } from './types';

export const QUOTE_BATCH_SIZE = 25;
export const DEFAULT_WATCHLIST = ['AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','AMD','SPY','QQQ'];

export const TIMEFRAMES: Timeframe[] = [
  { label:'1m', resolution:'1', seconds:60 },
  { label:'5m', resolution:'5', seconds:300 },
  { label:'15m', resolution:'15', seconds:900 },
  { label:'1H', resolution:'60', seconds:3600 },
  { label:'1D', resolution:'D', seconds:86400 },
  { label:'1W', resolution:'W', seconds:604800 },
];

export const DEFAULT_INDICATORS: IndicatorSettings = {
  sma10:false,
  sma20:false,
  sma50:false,
  sma200:false,
  ema9:false,
  ema20:true,
  ema50:false,
  bollinger20:false,
  vwap:false,
  rsi14:false,
  macd:false,
  stochastic14:false,
  atr14:false,
  volume:true,
};

export const DEFAULT_VOLUME_MA: VolumeMASettings = {
  type:'SMA',
  length:20,
  color:'#f6c85f',
};

export const INDICATOR_OPTIONS: Array<[keyof IndicatorSettings,string,string]> = [
  ['ema9','EMA 9','Fast exponential moving average'],
  ['ema20','EMA 20','Short-term exponential trend'],
  ['ema50','EMA 50','Medium-term exponential trend'],
  ['sma10','SMA 10','Fast simple moving average'],
  ['sma20','SMA 20','Short-term simple trend'],
  ['sma50','SMA 50','Medium-term trend'],
  ['sma200','SMA 200','Long-term trend'],
  ['bollinger20','Bollinger Bands','20 period / 2 sigma'],
  ['vwap','VWAP','Volume-weighted average price'],
  ['rsi14','RSI 14','Momentum oscillator'],
  ['macd','MACD','12 / 26 / 9'],
  ['stochastic14','Stochastic','14 period / %K / %D'],
  ['atr14','ATR 14','Average true range'],
  ['volume','Volume','Trading volume pane'],
];

export const stored = <T,>(key:string,fallback:T):T => {
  try {
    const v=localStorage.getItem(key);
    return v ? JSON.parse(v) as T : fallback;
  } catch {
    return fallback;
  }
};

export const money=(n?:number|null)=>n==null||Number.isNaN(n)?'-':new Intl.NumberFormat('en-US',{maximumFractionDigits:n>=100?2:4}).format(n);
export const pct=(n?:number|null)=>n==null||Number.isNaN(n)?'-':`${n>=0?'+':''}${n.toFixed(2)}%`;
