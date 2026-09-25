import type { Candle, Env, Quote } from './types';

const FINNHUB='https://finnhub.io/api/v1';
const TWELVE_DATA='https://api.twelvedata.com';
const YAHOO_CHART_HOSTS=[
  'https://query1.finance.yahoo.com/v8/finance/chart',
  'https://query2.finance.yahoo.com/v8/finance/chart',
];
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

type YahooQuote={
  symbol?:string;
  marketState?:string;
  regularMarketPrice?:number;
  regularMarketPreviousClose?:number;
  preMarketPrice?:number;
  postMarketPrice?:number;
};

type TradingPeriod={start?:number;end?:number};

function lastCloseInPeriod(
  timestamps:number[],
  closes:Array<number|null|undefined>,
  period:TradingPeriod|undefined,
  now:number,
){
  if(!period?.start||!period?.end)return null;
  let value:number|null=null;
  for(let i=0;i<timestamps.length;i++){
    const time=timestamps[i];
    const close=closes[i];
    if(time>=period.start&&time<=period.end&&time<=now&&close!=null&&Number.isFinite(close)){
      value=close;
    }
  }
  return value;
}

async function yahooExtendedForSymbol(symbol:string):Promise<YahooQuote>{
  let lastError:unknown;

  for(const host of YAHOO_CHART_HOSTS){
    try{
      const url=new URL(`${host}/${encodeURIComponent(symbol)}`);
      url.searchParams.set('range','1d');
      url.searchParams.set('interval','1m');
      url.searchParams.set('includePrePost','true');
      url.searchParams.set('events','div,splits');

      const response=await fetch(url,{
        headers:{
          'accept':'application/json,text/plain,*/*',
          'user-agent':'Mozilla/5.0 TradingChill/1.0',
        },
      });
      if(response.status===429)throw new Error('Yahoo Finance extended-hours rate limit reached.');
      if(!response.ok)throw new Error(`Yahoo Finance chart service returned ${response.status}.`);

      const data=await response.json() as {
        chart?:{
          error?:{description?:string}|null;
          result?:Array<{
            meta?:{
              symbol?:string;
              regularMarketPrice?:number;
              previousClose?:number;
              chartPreviousClose?:number;
              currentTradingPeriod?:{
                pre?:TradingPeriod;
                regular?:TradingPeriod;
                post?:TradingPeriod;
              };
            };
            timestamp?:number[];
            indicators?:{quote?:Array<{close?:Array<number|null>}>};
          }>;
        };
      };

      if(data.chart?.error)throw new Error(data.chart.error.description||'Yahoo Finance extended-hours data unavailable.');
      const result=data.chart?.result?.[0];
      const meta=result?.meta;
      if(!meta)throw new Error('Yahoo Finance extended-hours metadata unavailable.');

      const now=Math.floor(Date.now()/1000);
      const periods=meta.currentTradingPeriod||{};
      const timestamps=result?.timestamp||[];
      const closes=result?.indicators?.quote?.[0]?.close||[];

      const inPeriod=(period?:TradingPeriod)=>Boolean(period?.start&&period?.end&&now>=period.start&&now<=period.end);
      const state=inPeriod(periods.pre)?'PRE':inPeriod(periods.regular)?'REGULAR':inPeriod(periods.post)?'POST':'CLOSED';

      return{
        symbol:(meta.symbol||symbol).toUpperCase(),
        marketState:state,
        regularMarketPrice:Number.isFinite(meta.regularMarketPrice)?meta.regularMarketPrice:undefined,
        regularMarketPreviousClose:Number.isFinite(meta.previousClose)?meta.previousClose:meta.chartPreviousClose,
        preMarketPrice:lastCloseInPeriod(timestamps,closes,periods.pre,now)??undefined,
        postMarketPrice:lastCloseInPeriod(timestamps,closes,periods.post,now)??undefined,
      };
    }catch(error){
      lastError=error;
    }
  }

  throw lastError instanceof Error?lastError:new Error('Yahoo Finance extended-hours data unavailable.');
}

async function yahooExtendedQuotes(symbols:string[]):Promise<Map<string,YahooQuote>>{
  const results=await Promise.allSettled(symbols.map(yahooExtendedForSymbol));
  const map=new Map<string,YahooQuote>();

  for(const result of results){
    if(result.status==='fulfilled'&&result.value.symbol){
      map.set(result.value.symbol.toUpperCase(),result.value);
    }
  }
  return map;
}

async function finnhubQuote(env:Env,symbol:string):Promise<Quote>{
  const r=await finnhub<{c:number;d:number;dp:number;h:number;l:number;o:number;pc:number;t:number}>(env,'/quote',{symbol});
  if(!r.c)throw new Error(`No live quote for ${symbol}.`);
  return{
    symbol,
    price:r.c,
    change:r.d,
    changePercent:r.dp,
    high:r.h,
    low:r.l,
    open:r.o,
    previousClose:r.pc,
    timestamp:r.t,
    marketState:null,
    regularClose:r.c,
    extendedPrice:null,
    extendedSession:null,
    preMarketPrice:null,
    postMarketPrice:null,
  };
}

function enrichQuote(base:Quote,yahoo?:YahooQuote):Quote{
  if(!yahoo)return base;

  const state=(yahoo.marketState||'').toUpperCase();
  const pre=Number.isFinite(yahoo.preMarketPrice)?yahoo.preMarketPrice as number:null;
  const post=Number.isFinite(yahoo.postMarketPrice)?yahoo.postMarketPrice as number:null;
  const regular=Number.isFinite(yahoo.regularMarketPrice)?yahoo.regularMarketPrice as number:base.price;

  let extendedSession:'pre'|'post'|null=null;
  let extendedPrice:number|null=null;

  if(state.includes('PRE')&&pre!=null){
    extendedSession='pre';
    extendedPrice=pre;
  }else if((state.includes('POST')||state==='CLOSED')&&post!=null){
    extendedSession='post';
    extendedPrice=post;
  }

  return{
    ...base,
    marketState:state||null,
    regularClose:regular,
    extendedPrice,
    extendedSession,
    preMarketPrice:pre,
    postMarketPrice:post,
  };
}

export async function getQuote(env:Env,symbol:string){
  const [base,extended]=await Promise.all([
    finnhubQuote(env,symbol),
    yahooExtendedQuotes([symbol]).catch(()=>new Map<string,YahooQuote>()),
  ]);
  return enrichQuote(base,extended.get(symbol.toUpperCase()));
}

export async function getQuotes(env:Env,symbols:string[]){
  const [baseResults,extended]=await Promise.all([
    Promise.allSettled(symbols.map(symbol=>finnhubQuote(env,symbol))),
    yahooExtendedQuotes(symbols).catch(()=>new Map<string,YahooQuote>()),
  ]);

  return baseResults.flatMap(result=>{
    if(result.status!=='fulfilled')return [];
    const base=result.value;
    return [enrichQuote(base,extended.get(base.symbol.toUpperCase()))];
  });
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

type YahooChartResponse={
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

async function fetchYahooHost(host:string,symbol:string,interval:string,from:number,to:number):Promise<Candle[]>{
  const url=new URL(`${host}/${encodeURIComponent(symbol)}`);
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

  const data=await response.json() as YahooChartResponse;
  if(data.chart?.error)throw new Error(data.chart.error.description||'Yahoo Finance could not load chart data.');

  const result=data.chart?.result?.[0];
  const timestamps=result?.timestamp||[];
  const quote=result?.indicators?.quote?.[0];
  if(!timestamps.length||!quote)throw new Error(`No real candle data for ${symbol}.`);

  const candles:Candle[]=[];
  for(let i=0;i<timestamps.length;i++){
    const open=quote.open?.[i];
    const high=quote.high?.[i];
    const low=quote.low?.[i];
    const close=quote.close?.[i];
    if(open==null||high==null||low==null||close==null)continue;
    if(!Number.isFinite(open)||!Number.isFinite(high)||!Number.isFinite(low)||!Number.isFinite(close))continue;
    candles.push({
      time:timestamps[i],
      open,
      high,
      low,
      close,
      volume:Number(quote.volume?.[i]||0),
    });
  }

  if(!candles.length)throw new Error(`No real candle data for ${symbol}.`);
  return candles;
}

async function yahooCandles(symbol:string,resolution:string,from:number,to:number):Promise<Candle[]>{
  const interval=yahooInterval[resolution];
  if(!interval)throw new Error('Unsupported chart interval.');

  let lastError:unknown;
  for(const host of YAHOO_CHART_HOSTS){
    try{return await fetchYahooHost(host,symbol,interval,from,to);}
    catch(error){lastError=error;}
  }

  throw lastError instanceof Error?lastError:new Error('Real candle provider unavailable.');
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
    note:'Real market candles from Yahoo Finance; regular and extended quotes enriched from live quote feeds.',
  };
}

export async function searchLive(env:Env,q:string){
  return finnhub<{result?:Array<{symbol:string;displaySymbol?:string;description?:string;type?:string}>}>(env,'/search',{q});
}
