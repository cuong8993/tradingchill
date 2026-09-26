import { LoaderCircle } from 'lucide-react';
import { money, pct } from '../config';
import MarketChart from './MarketChart';
import type { Candle, CandleSource, IndicatorSettings, PriceAlert, Quote, VolumeMASettings } from '../types';

export function MarketHeader({symbol,quote}:{symbol:string;quote?:Quote}){
  const extReference=quote?.regularClose??quote?.price;
  const extPercent=quote?.extendedPrice!=null&&extReference&&Number.isFinite(extReference)
    ?((quote.extendedPrice-extReference)/extReference)*100
    :null;

  return <section className="market-head">
    <div><span className="instrument-avatar">{symbol.slice(0,1)}</span><div><h1>{symbol}</h1><p>Real-time workspace</p></div></div>
    <div className="quote">
      <strong>{money(quote?.price)}</strong>
      <span className={(quote?.change??0)>=0?'up':'down'}>{quote?`${quote.change>=0?'+':''}${quote.change.toFixed(2)} (${pct(quote.changePercent)})`:'-'}</span>
      {quote?.extendedPrice!=null&&<small className={extPercent!=null&&extPercent>=0?'up':'down'}>{quote.extendedSession?.toUpperCase()} {money(quote.extendedPrice)} ({pct(extPercent)})</small>}
    </div>
    <div className="ohlc"><span>O <b>{money(quote?.open)}</b></span><span>H <b>{money(quote?.high)}</b></span><span>L <b>{money(quote?.low)}</b></span><span>Prev <b>{money(quote?.previousClose)}</b></span></div>
  </section>;
}

export function ChartCard({
  loading,error,candles,source,note,quote,indicators,alerts,volumeMA,fitSignal,logScale,onAutoFit,onToggleLog,onVolumeSettings,retry
}:{
  loading:boolean;
  error:string;
  candles:Candle[];
  source:CandleSource;
  note:string;
  quote?:Quote;
  indicators:IndicatorSettings;
  alerts:PriceAlert[];
  volumeMA:VolumeMASettings;
  fitSignal:number;
  logScale:boolean;
  onAutoFit:()=>void;
  onToggleLog:()=>void;
  onVolumeSettings:()=>void;
  retry:()=>void;
}){
  const sourceLabel=source==='twelvedata'?'TWELVE DATA + FINNHUB':'YAHOO + FINNHUB';

  return <section className="chart-card">
    {loading?<div className="chart-state"><LoaderCircle className="spin"/>Loading real market data...</div>:error?<div className="chart-state"><strong>Chart unavailable</strong><span>{error}</span><button onClick={retry}>Try again</button></div>:<>
      <MarketChart
        candles={candles}
        quote={quote}
        indicators={indicators}
        alerts={alerts}
        volumeMA={volumeMA}
        fitSignal={fitSignal}
        logScale={logScale}
        onVolumeSettings={onVolumeSettings}
      />
      <span className="chart-source real" title={note||sourceLabel}>{sourceLabel}</span>
      <div className="scale-corner-controls" aria-label="Chart scale controls">
        <button title="Auto fit chart data" onClick={onAutoFit}>A</button>
        <button className={logScale?'active':''} title="Toggle logarithmic price scale" onClick={onToggleLog}>L</button>
      </div>
    </>}
    <span className="notice">
      <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts™</a>
      {' · '}
      <a href="/NOTICE">NOTICE</a>
    </span>
  </section>;
}
