import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  QUOTE_BATCH_SIZE,
  SELECTED_ENRICHED_REFRESH_MS,
  SELECTED_QUOTE_REFRESH_MS,
  WATCHLIST_REFRESH_MS,
} from '../config';
import type { Candle, CandleSource, Quote, SearchResult, Timeframe } from '../types';

function mergeFastQuote(previous:Quote|undefined,next:Quote):Quote{
  if(!previous)return next;
  return {
    ...next,
    marketState:previous.marketState??next.marketState,
    regularClose:previous.regularClose??next.regularClose,
    extendedPrice:previous.extendedPrice??next.extendedPrice,
    extendedSession:previous.extendedSession??next.extendedSession,
    preMarketPrice:previous.preMarketPrice??next.preMarketPrice,
    postMarketPrice:previous.postMarketPrice??next.postMarketPrice,
  };
}

export function useMarket(watchlist:string[], selected:string, timeframe:Timeframe){
  const [quotes,setQuotes]=useState<Record<string,Quote>>({});
  const [candles,setCandles]=useState<Candle[]>([]);
  const [chartSource,setChartSource]=useState<CandleSource>('yahoo');
  const [chartNote,setChartNote]=useState('');
  const [chartLoading,setChartLoading]=useState(true);
  const [chartError,setChartError]=useState('');
  const [config,setConfig]=useState<{mode:'live'|'offline';chartProvider:'twelvedata'|'yahoo';database:boolean}>({mode:'offline',chartProvider:'yahoo',database:false});
  const [searchResults,setSearchResults]=useState<SearchResult[]>([]);
  const [searchLoading,setSearchLoading]=useState(false);

  useEffect(()=>{ api.config().then(setConfig).catch(()=>{}); },[]);

  const loadQuotes=useCallback(async()=>{
    if(!watchlist.length)return;
    const batches:string[][]=[];
    for(let i=0;i<watchlist.length;i+=QUOTE_BATCH_SIZE)batches.push(watchlist.slice(i,i+QUOTE_BATCH_SIZE));
    const result=(await Promise.allSettled(batches.map(api.quotes))).flatMap(r=>r.status==='fulfilled'?r.value:[]);
    setQuotes(p=>({...p,...Object.fromEntries(result.map(q=>[q.symbol,q]))}));
  },[watchlist]);

  useEffect(()=>{
    void loadQuotes();
    const id=setInterval(()=>void loadQuotes(),WATCHLIST_REFRESH_MS);
    return()=>clearInterval(id);
  },[loadQuotes]);

  const loadSelectedQuote=useCallback(async()=>{
    try{
      const q=await api.quote(selected);
      setQuotes(p=>({...p,[q.symbol]:q}));
    }catch{}
  },[selected]);

  useEffect(()=>{
    void loadSelectedQuote();
    const id=setInterval(()=>void loadSelectedQuote(),SELECTED_ENRICHED_REFRESH_MS);
    return()=>clearInterval(id);
  },[loadSelectedQuote]);

  const loadFastSelectedQuote=useCallback(async()=>{
    if(document.visibilityState==='hidden')return;
    try{
      const q=await api.fastQuote(selected);
      setQuotes(p=>({...p,[q.symbol]:mergeFastQuote(p[q.symbol],q)}));
    }catch{}
  },[selected]);

  useEffect(()=>{
    void loadFastSelectedQuote();
    const id=setInterval(()=>void loadFastSelectedQuote(),SELECTED_QUOTE_REFRESH_MS);
    return()=>clearInterval(id);
  },[loadFastSelectedQuote]);

  const loadCandles=useCallback(async()=>{
    if(!timeframe.available){
      setCandles([]);
      setChartError(timeframe.note||'This timeframe is not available from the current real-data providers.');
      setChartLoading(false);
      return;
    }

    setChartLoading(true);
    setChartError('');
    const to=Math.floor(Date.now()/1000);
    const from=to-timeframe.seconds*timeframe.bars;

    try {
      const result=await api.candles(selected,timeframe.resolution,from,to);
      setCandles(result.candles);
      setChartSource(result.source);
      setChartNote(result.note||'');
    } catch(e){
      setCandles([]);
      setChartError(e instanceof Error?e.message:'Could not load real market chart data.');
    } finally {
      setChartLoading(false);
    }
  },[selected,timeframe]);

  useEffect(()=>{ void loadCandles(); },[loadCandles]);

  const search=useCallback(async(q:string)=>{
    if(!q.trim()){setSearchResults([]);return;}
    setSearchLoading(true);
    try{setSearchResults(await api.search(q.trim()));}
    finally{setSearchLoading(false);}
  },[]);

  return {quotes,candles,chartSource,chartNote,chartLoading,chartError,config,searchResults,searchLoading,search,loadCandles};
}
