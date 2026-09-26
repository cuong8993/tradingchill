import type { IndicatorSettings, Timeframe, VolumeMASettings } from './types';

export const QUOTE_BATCH_SIZE = 25;
export const DEFAULT_WATCHLIST = ['AAPL','MSFT','NVDA','AMZN','GOOGL','META','TSLA','AMD','SPY','QQQ'];

export const TIMEFRAMES: Timeframe[] = [
  { label:'1s', resolution:'1S', seconds:1, bars:600, group:'Seconds', available:false, note:'Requires a real tick/seconds data feed' },
  { label:'5s', resolution:'5S', seconds:5, bars:600, group:'Seconds', available:false, note:'Requires a real tick/seconds data feed' },
  { label:'15s', resolution:'15S', seconds:15, bars:600, group:'Seconds', available:false, note:'Requires a real tick/seconds data feed' },
  { label:'30s', resolution:'30S', seconds:30, bars:600, group:'Seconds', available:false, note:'Requires a real tick/seconds data feed' },

  { label:'1m', resolution:'1', seconds:60, bars:600, group:'Minutes', available:true },
  { label:'2m', resolution:'2', seconds:120, bars:600, group:'Minutes', available:true },
  { label:'3m', resolution:'3', seconds:180, bars:600, group:'Minutes', available:true },
  { label:'5m', resolution:'5', seconds:300, bars:600, group:'Minutes', available:true },
  { label:'10m', resolution:'10', seconds:600, bars:600, group:'Minutes', available:true },
  { label:'15m', resolution:'15', seconds:900, bars:600, group:'Minutes', available:true },
  { label:'30m', resolution:'30', seconds:1800, bars:600, group:'Minutes', available:true },
  { label:'45m', resolution:'45', seconds:2700, bars:500, group:'Minutes', available:true },

  { label:'1H', resolution:'60', seconds:3600, bars:600, group:'Hours', available:true },
  { label:'90m', resolution:'90', seconds:5400, bars:500, group:'Hours', available:true },
  { label:'2H', resolution:'120', seconds:7200, bars:500, group:'Hours', available:true },
  { label:'4H', resolution:'240', seconds:14400, bars:500, group:'Hours', available:true },

  { label:'1D', resolution:'D', seconds:86400, bars:400, group:'Days', available:true },
  { label:'5D', resolution:'5D', seconds:432000, bars:220, group:'Days', available:true },

  { label:'1W', resolution:'W', seconds:604800, bars:260, group:'Weeks & Months', available:true },
  { label:'1M', resolution:'M', seconds:2592000, bars:180, group:'Weeks & Months', available:true },
  { label:'3M', resolution:'3M', seconds:7776000, bars:100, group:'Weeks & Months', available:true },
];

export const DEFAULT_TIMEFRAME = TIMEFRAMES.find(tf=>tf.label==='5m') as Timeframe;
export const DEFAULT_TIMEFRAME_FAVORITES = ['1m','5m','15m','1H','1D','1W'];

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
  enabled:true,
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
