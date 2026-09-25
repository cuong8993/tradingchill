import { LoaderCircle } from 'lucide-react';
import { money, pct } from '../config';
import MarketChart from './MarketChart';
import type { Candle, CandleSource, IndicatorSettings, PriceAlert, Quote } from '../types';

export function MarketHeader({symbol,quote}:{symbol:string;quote?:Quote}){return <section className="market-head"><div><span className="instrument-avatar">{symbol.slice(0,1)}</span><div><h1>{symbol}</h1><p>Real-time workspace</p></div></div><div className="quote"><strong>{money(quote?.price)}</strong><span className={(quote?.change??0)>=0?'up':'down'}>{quote?`${quote.change>=0?'+':''}${quote.change.toFixed(2)} (${pct(quote.changePercent)})`:'-'}</span></div><div className="ohlc"><span>O <b>{money(quote?.open)}</b></span><span>H <b>{money(quote?.high)}</b></span><span>L <b>{money(quote?.low)}</b></span><span>Prev <b>{money(quote?.previousClose)}</b></span></div></section>}

export function ChartCard({loading,error,candles,source,note,indicators,alerts,retry}:{loading:boolean;error:string;candles:Candle[];source:CandleSource;note:string;indicators:IndicatorSettings;alerts:PriceAlert[];retry:()=>void}){
  const sourceLabel=source==='twelvedata'?'TWELVE DATA':source==='finnhub'?'FINNHUB':'DEMO CHART';
  return <section className="chart-card">
    {loading?<div className="chart-state"><LoaderCircle className="spin"/>Loading market data...</div>:error?<div className="chart-state"><strong>Chart unavailable</strong><span>{error}</span><button onClick={retry}>Try again</button></div>:<>
      <MarketChart candles={candles} indicators={indicators} alerts={alerts}/>
      <span className={`chart-source ${source==='demo'?'demo':'real'}`} title={note||sourceLabel}>{sourceLabel}</span>
    </>}
    <span className="notice">TradingView Lightweight Charts(TM) · <a href="/NOTICE">notice</a></span>
  </section>;
}
