import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { QUOTE_BATCH_SIZE } from '../config';
import type { Candle, Quote, SearchResult, Timeframe } from '../types';

export function useMarket(watchlist:string[], selected:string, timeframe:Timeframe){
  const [quotes,setQuotes]=useState<Record<string,Quote>>({});
  const [candles,setCandles]=useState<Candle[]>([]);
  const [chartLoading,setChartLoading]=useState(true);
  const [chartError,setChartError]=useState('');
  const [config,setConfig]=useState<{mode:'live'|'demo';database:boolean}>({mode:'demo',database:false});
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
  useEffect(()=>{ void loadQuotes(); const id=setInterval(()=>void loadQuotes(),60000); return()=>clearInterval(id); },[loadQuotes]);

  const loadCandles=useCallback(async()=>{
    setChartLoading(true); setChartError('');
    const to=Math.floor(Date.now()/1000), bars=timeframe.resolution==='D'?260:timeframe.resolution==='W'?156:600, from=to-timeframe.seconds*bars;
    try { setCandles(await api.candles(selected,timeframe.resolution,from,to)); }
    catch(e){ setChartError(e instanceof Error?e.message:'Could not load chart data.'); }
    finally{ setChartLoading(false); }
  },[selected,timeframe]);
  useEffect(()=>{ void loadCandles(); },[loadCandles]);

  const search=useCallback(async(q:string)=>{ if(!q.trim()){setSearchResults([]);return;} setSearchLoading(true); try{setSearchResults(await api.search(q.trim()));}finally{setSearchLoading(false);} },[]);
  return {quotes,candles,chartLoading,chartError,config,searchResults,searchLoading,search,loadCandles};
}
