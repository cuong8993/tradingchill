import type { Candle, Env } from './types';

const FINNHUB='https://finnhub.io/api/v1';
const TWELVE_DATA='https://api.twelvedata.com';
const YAHOO_CHART='https://query1.finance.yahoo.com/v8/finance/chart';

async function finnhub<T>(env:Env,path:string,params:Record<string,string|number>):Promise<T>{
  if(!env.FINNHUB_API_KEY)throw new Error('FINNHUB_API_KEY is not configured.');
  const url=new URL(FINNHUB+path);
  Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,String(v)));
  url.searchParams.set('token',env.FINNHUB_API_KEY);
  const r=await fetch(url);
  if(r.status===429)throw new Error('Finnhub rate limit reached.');
  if(!r.ok)throw new Error(`Finnhub returned ${r.status}.`);
  return r.json() as Promise<T>;
}

export async function getQuote(env:Env,symbol:string){
  const r=await finnhub<{c:number;d:number;dp:number;h:number;l:number;o:number;pc:number;t:number}>(env,'/quote',{symbol});
  if(!r.c)throw new Error(`No live quote for ${symbol}.`);
  return{symbol,price:r.c,change:r.d,changePercent:r.dp,high:r.h,low:r.l,open:r.o,previousClose:r.pc,timestamp:r.t};
}

const twelveInterval:Record<string,string>={
  '1':'1min','5':'5min','15':'15min','30':'30min','60':'1h','D':'1day','W':'1week','M':'1month'
};

const yahooInterval:Record<string,string>={
  '1':'1m','5':'5m','15':'15m','30':'30m','60':'60m','D':'1d','W':'1wk','M':'1mo'
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
  const interval=twelveInterval[resolution];
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
  })).filter(c=>Number.isFinite(c.time)&&Number.isFinite(c.open)&&Number.isFinite(c.high)&&Number.isFinite(c.low)&&Number.isFinite(c.close));
}

async function yahooCandles(symbol:string,resolution:string,from:number,to:number):Promise<Candle[]>{
  const interval=yahooInterval[resolution];
  if(!interval)throw new Error('Unsupported chart interval.');

  const url=new URL(`${YAHOO_CHART}/${encodeURIComponent(symbol)}`);
  url.searchParams.set('period1',String(from));
  url.searchParams.set('period2',String(to));
  url.searchParams.set('interval',interval);
  url.searchParams.set('includePrePost','true');
  url.searchParams.set('events','div,splits');

  const response=await fetch(url,{
    headers:{
      'accept':'application/json,text/plain,*/*',
      'user-agent':'Mozilla/5.0 TradingChill/1.0',
    },
  });
  if(response.status===429)throw new Error('Yahoo Finance chart rate limit reached.');
  if(!response.ok)throw new Error(`Yahoo Finance chart service returned ${response.status}.`);

  const data=await response.json() as {
    chart?:{
      error?:{description?:string}|null;
      result?:Array<{
        timestamp?:number[];
        indicators?:{quote?:Array<{
          open?:Array<number|null>;
          high?:Array<number|null>;
          low?:Array<number|null>;
          close?:Array<number|null>;
          volume?:Array<number|null>;
        }>};
      }>;
    };
  };

  if(data.chart?.error)throw new Error(data.chart.error.description||'Yahoo Finance could not load chart data.');
  const result=data.chart?.result?.[0];
  const timestamps=result?.timestamp||[];
  const quote=result?.indicators?.quote?.[0];
  if(!timestamps.length||!quote)throw new Error(`No real candle data for ${symbol}.`);

  const candles=timestamps.map((time,i)=>({
    time,
    open:Number(quote.open?.[i]),
    high:Number(quote.high?.[i]),
    low:Number(quote.low?.[i]),
    close:Number(quote.close?.[i]),
    volume:Number(quote.volume?.[i]||0),
  })).filter(c=>Number.isFinite(c.time)&&Number.isFinite(c.open)&&Number.isFinite(c.high)&&Number.isFinite(c.low)&&Number.isFinite(c.close));

  if(!candles.length)throw new Error(`No real candle data for ${symbol}.`);
  return candles;
}

export async function getCandles(env:Env,symbol:string,resolution:string,from:number,to:number){
  if(env.TWELVEDATA_API_KEY){
    try{
      const candles=await twelveDataCandles(env,symbol,resolution,from,to);
      return {candles,source:'twelvedata' as const};
    }catch{}
  }

  const candles=await yahooCandles(symbol,resolution,from,to);
  return {
    candles,
    source:'yahoo' as const,
    note:'Real market candles from Yahoo Finance; current quote from Finnhub.',
  };
}

export async function searchLive(env:Env,q:string){
  return finnhub<{result?:Array<{symbol:string;displaySymbol?:string;description?:string;type?:string}>}>(env,'/search',{q});
}
