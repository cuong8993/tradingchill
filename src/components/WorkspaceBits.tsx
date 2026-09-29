import { Maximize2, Minimize2, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { money, pct } from '../config';
import MarketChart from './MarketChart';
import type { Candle, CandleSource, ChartSettings, IndicatorSettings, PriceAlert, Quote, VolumeMASettings } from '../types';

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
  loading,error,candles,source,note,quote,candleSeconds,chartSettings,indicators,alerts,volumeMA,fitSignal,logScale,onAutoFit,onToggleLog,onVolumeSettings,onChartSettings,retry
}:{
  loading:boolean;
  error:string;
  candles:Candle[];
  source:CandleSource;
  note:string;
  quote?:Quote;
  candleSeconds:number;
  chartSettings:ChartSettings;
  indicators:IndicatorSettings;
  alerts:PriceAlert[];
  volumeMA:VolumeMASettings;
  fitSignal:number;
  logScale:boolean;
  onAutoFit:()=>void;
  onToggleLog:()=>void;
  onVolumeSettings:()=>void;
  onChartSettings:()=>void;
  retry:()=>void;
}){
  const sourceLabel=source==='twelvedata'?'TWELVE DATA + FINNHUB':'YAHOO + FINNHUB';
  const cardRef=useRef<HTMLElement>(null);
  const [nativeFullscreen,setNativeFullscreen]=useState(false);
  const [fallbackFullscreen,setFallbackFullscreen]=useState(false);

  useEffect(()=>{
    const sync=()=>setNativeFullscreen(document.fullscreenElement===cardRef.current);
    document.addEventListener('fullscreenchange',sync);
    return()=>document.removeEventListener('fullscreenchange',sync);
  },[]);

  useEffect(()=>{
    if(!fallbackFullscreen)return;
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape')setFallbackFullscreen(false);
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[fallbackFullscreen]);

  const toggleFullscreen=useCallback(async()=>{
    const target=cardRef.current;
    if(!target)return;

    if(document.fullscreenElement===target){
      await document.exitFullscreen().catch(()=>{});
      return;
    }

    if(fallbackFullscreen){
      setFallbackFullscreen(false);
      return;
    }

    try{
      if(target.requestFullscreen){
        await target.requestFullscreen();
        return;
      }
    }catch{}

    setFallbackFullscreen(true);
  },[fallbackFullscreen]);

  const fullscreen=nativeFullscreen||fallbackFullscreen;

  return <section
    ref={cardRef}
    className={`chart-card ${fallbackFullscreen?'chart-card-pseudo-fullscreen':''}`}
    style={{background:chartSettings.backgroundColor}}
  >
    {loading?<div className="chart-state"><LoaderCircle className="spin"/>Loading real market data...</div>:error?<div className="chart-state"><strong>Chart unavailable</strong><span>{error}</span><button onClick={retry}>Try again</button></div>:<>
      <MarketChart
        candles={candles}
        quote={quote}
        candleSeconds={candleSeconds}
        chartSettings={chartSettings}
        indicators={indicators}
        alerts={alerts}
        volumeMA={volumeMA}
        fitSignal={fitSignal}
        logScale={logScale}
        onVolumeSettings={onVolumeSettings}
        onChartSettings={onChartSettings}
        onFullscreen={toggleFullscreen}
      />
      <span className="chart-source real" title={note||sourceLabel}>{sourceLabel}</span>
      <div className="scale-corner-controls" aria-label="Chart scale controls">
        <button title="Auto fit chart data" onClick={onAutoFit}>A</button>
        <button className={logScale?'active':''} title="Toggle logarithmic price scale" onClick={onToggleLog}>L</button>
        <button className="fullscreen-control" title={fullscreen?'Exit fullscreen':'Fullscreen chart'} onClick={toggleFullscreen}>
          {fullscreen?<Minimize2 size={13}/>:<Maximize2 size={13}/>}
        </button>
      </div>
    </>}
    <span className="notice">
      <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts™</a>
      {' · '}
      <a href="/NOTICE">NOTICE</a>
    </span>
  </section>;
}
