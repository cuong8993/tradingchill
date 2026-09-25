import { demoCandles, demoQuote } from './demo';
import type { Candle, Env } from './types';

const FINNHUB='https://finnhub.io/api/v1';
const TWELVE_DATA='https://api.twelvedata.com';

async function finnhub<T>(env:Env,path:string,params:Record<string,string|number>):Promise<T>{
  if(!env.FINNHUB_API_KEY)throw new Error('DEMO');
  const url=new URL(FINNHUB+path);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v)));
  url.searchParams.set('token',env.FINNHUB_API_KEY);
  const r=await fetch(url);
  if(r.status===429)throw new Error('Finnhub rate limit reached.');
  if(!r.ok)throw new Error(`Finnhub returned ${r.status}.`);
  return r.json() as Promise<T>;
}

export async function getQuote(env:Env,symbol:string){
  if(!env.FINNHUB_API_KEY)return demoQuote(symbol);
  const r=await finnhub<{c:number;d:number;dp:number;h:number;l:number;o:number;pc:number;t:number}>(env,'/quote',{symbol});
  if(!r.c)throw new Error(`No quote for ${symbol}.`);
  return{symbol,price:r.c,change:r.d,changePercent:r.dp,high:r.h,low:r.l,open:r.o,previousClose:r.pc,timestamp:r.t};
}

const intervalMap:Record<string,string>={
  '1':'1min','5':'5min','15':'15min','30':'30min','60':'1h','D':'1day','W':'1week','M':'1month'
};

function requestedBars(resolution:string,from:number,to:number){
  const seconds:Record<string,number>={'1':60,'5':300,'15':900,'30':1800,'60':3600,'D':86400,'W':604800,'M':2592000};
  const step=seconds[resolution]||300;
  return Math.max(30,Math.min(5000,Math.ceil((to-from)/step)+10));
}

function toUnix(datetime:string){
  const normalized=datetime.includes('T')?datetime:datetime.replace(' ','T');
  const ms=Date.parse(normalized.endsWith('Z')?normalized:normalized+'Z');
  return Math.floor(ms/1000);
}

async function twelveDataCandles(env:Env,symbol:string,resolution:string,from:number,to:number):Promise<Candle[]>{
  if(!env.TWELVEDATA_API_KEY)throw new Error('Twelve Data key not configured.');
  const interval=intervalMap[resolution];
  if(!interval)throw new Error('Unsupported chart interval.');

  const url=new URL(TWELVE_DATA+'/time_series');
  url.searchParams.set('symbol',symbol);
  url.searchParams.set('interval',interval);
  url.searchParams.set('outputsize',String(requestedBars(resolution,from,to)));
  url.searchParams.set('order','asc');
  url.searchParams.set('timezone','UTC');
  url.searchParams.set('apikey',env.TWELVEDATA_API_KEY);

  const response=await fetch(url);
  if(response.status===429)throw new Error('Twelve Data rate limit reached.');
  if(!response.ok)throw new Error(`Twelve Data returned ${response.status}.`);

  const data=await response.json() as {
    status?:string;
    message?:string;
    values?:Array<{datetime:string;open:string;high:string;low:string;close:string;volume?:string}>;
  };
  if(data.status==='error')throw new Error(data.message||'Twelve Data could not load chart data.');
  if(!data.values?.length)throw new Error(`No Twelve Data history for ${symbol}.`);

  return data.values.map(v=>({
    time:toUnix(v.datetime),
    open:Number(v.open),
    high:Number(v.high),
    low:Number(v.low),
    close:Number(v.close),
    volume:Number(v.volume||0),
  })).filter(c=>Number.isFinite(c.time)&&Number.isFinite(c.close));
}

async function finnhubCandles(env:Env,symbol:string,resolution:string,from:number,to:number):Promise<Candle[]>{
  if(!env.FINNHUB_API_KEY)throw new Error('Finnhub key not configured.');
  const r=await finnhub<{s:string;t?:number[];o?:number[];h?:number[];l?:number[];c?:number[];v?:number[]}>(env,'/stock/candle',{symbol,resolution,from,to});
  if(r.s!=='ok'||!r.t?.length)throw new Error(`No Finnhub history for ${symbol}.`);
  return r.t.map((time,i)=>({
    time,
    open:r.o?.[i]??0,
    high:r.h?.[i]??0,
    low:r.l?.[i]??0,
    close:r.c?.[i]??0,
    volume:r.v?.[i]??0,
  }));
}

async function demoFallback(env:Env,symbol:string,resolution:string,from:number,to:number){
  const candles=demoCandles(symbol,resolution,from,to);
  if(!candles.length)return candles;
  const quote=await getQuote(env,symbol).catch(()=>null);
  if(!quote?.price)return candles;

  const last=candles[candles.length-1].close;
  if(!last)return candles;
  const scale=quote.price/last;
  return candles.map(c=>({
    ...c,
    open:+(c.open*scale).toFixed(4),
    high:+(c.high*scale).toFixed(4),
    low:+(c.low*scale).toFixed(4),
    close:+(c.close*scale).toFixed(4),
  }));
}

export async function getCandles(env:Env,symbol:string,resolution:string,from:number,to:number){
  if(env.TWELVEDATA_API_KEY){
    try{
      const candles=await twelveDataCandles(env,symbol,resolution,from,to);
      return {candles,source:'twelvedata' as const};
    }catch{}
  }

  if(env.FINNHUB_API_KEY){
    try{
      const candles=await finnhubCandles(env,symbol,resolution,from,to);
      return {candles,source:'finnhub' as const};
    }catch{}
  }

  return {
    candles:await demoFallback(env,symbol,resolution,from,to),
    source:'demo' as const,
    note:'Live quote is real. Historical candles are TradingChill fallback data because the connected providers do not currently allow historical candles.',
  };
}

export async function searchLive(env:Env,q:string){
  return finnhub<{result?:Array<{symbol:string;displaySymbol?:string;description?:string;type?:string}>}>(env,'/search',{q});
}
