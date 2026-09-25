export interface Env { FINNHUB_API_KEY?:string; TWELVEDATA_API_KEY?:string; DB?:D1Database }

export type Quote={
  symbol:string;
  price:number;
  change:number;
  changePercent:number;
  high:number;
  low:number;
  open:number;
  previousClose:number;
  timestamp:number;
  marketState?:string|null;
  regularClose?:number|null;
  extendedPrice?:number|null;
  extendedSession?:'pre'|'post'|null;
  preMarketPrice?:number|null;
  postMarketPrice?:number|null;
};

export type Candle={time:number;open:number;high:number;low:number;close:number;volume:number};

export const json=(data:unknown,init:ResponseInit={})=>new Response(JSON.stringify(data),{...init,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...(init.headers||{})}});
export const error=(message:string,status=400)=>json({error:message},{status});

export function symbolOf(v:string|null){
  const s=(v||'').trim().toUpperCase();
  if(!/^[A-Z0-9.:-]{1,24}$/.test(s))throw new Error('Invalid market symbol.');
  return s;
}
