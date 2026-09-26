import { ensureSchema } from './db';
import { getCandles, getQuote, getQuotes, searchLive } from './provider';
import { error, json, symbolOf, type Env } from './types';
const MAX_QUOTES_PER_REQUEST=50;

export async function handleApi(request:Request,env:Env){
  const u=new URL(request.url),p=u.pathname;

  if(request.method==='GET'&&p==='/api/config'){
    return json({
      mode:env.FINNHUB_API_KEY?'live':'offline',
      chartProvider:env.TWELVEDATA_API_KEY?'twelvedata':'yahoo',
      database:Boolean(env.DB),
    });
  }

  if(request.method==='GET'&&p==='/api/search'){
    const q=(u.searchParams.get('q')||'').trim();
    if(!q)return json([]);
    if(!env.FINNHUB_API_KEY)return error('FINNHUB_API_KEY is not configured.',503);
    const r=await searchLive(env,q);
    return json((r.result||[]).slice(0,30));
  }

  if(request.method==='GET'&&p==='/api/quote'){
    if(!env.FINNHUB_API_KEY)return error('FINNHUB_API_KEY is not configured.',503);
    return json(await getQuote(env,symbolOf(u.searchParams.get('symbol'))));
  }

  if(request.method==='GET'&&p==='/api/quotes'){
    if(!env.FINNHUB_API_KEY)return error('FINNHUB_API_KEY is not configured.',503);
    const symbols=(u.searchParams.get('symbols')||'').split(',').filter(Boolean).slice(0,MAX_QUOTES_PER_REQUEST).map(symbolOf);
    return json(await getQuotes(env,symbols));
  }

  if(request.method==='GET'&&p==='/api/candles'){
    const symbol=symbolOf(u.searchParams.get('symbol'));
    const resolution=(u.searchParams.get('resolution')||'5').toUpperCase();
    if(!/^(1|2|3|5|10|15|30|45|60|90|120|240|480|D|5D|W|M|3M)$/.test(resolution))return error('Unsupported resolution.');
    const to=Number(u.searchParams.get('to'))||Math.floor(Date.now()/1000);
    const from=Number(u.searchParams.get('from'))||to-2592000;
    return json(await getCandles(env,symbol,resolution,from,to));
  }

  if(p==='/api/alerts'&&request.method==='GET'){
    if(!env.DB)return error('D1 not connected.',503);
    await ensureSchema(env);
    const r=await env.DB.prepare('SELECT * FROM alerts ORDER BY active DESC, created_at DESC LIMIT 500').all();
    return json(r.results);
  }

  if(p==='/api/alerts'&&request.method==='POST'){
    if(!env.DB)return error('D1 not connected.',503);
    if(!env.FINNHUB_API_KEY)return error('FINNHUB_API_KEY is not configured.',503);
    await ensureSchema(env);
    const b=await request.json() as {symbol?:string;direction?:string;target?:number;note?:string};
    const symbol=symbolOf(b.symbol||'');
    const direction=b.direction==='below'?'below':b.direction==='above'?'above':'';
    const target=Number(b.target);
    if(!direction||!Number.isFinite(target)||target<=0)return error('Invalid alert.');
    const q=await getQuote(env,symbol).catch(()=>null);
    await env.DB.prepare('INSERT INTO alerts (symbol,direction,target,active,triggered_at,last_price,note) VALUES (?,?,?,1,NULL,?,?)').bind(symbol,direction,target,q?.price??null,(b.note||'').slice(0,180)).run();
    return json(await env.DB.prepare('SELECT * FROM alerts ORDER BY id DESC LIMIT 1').first(),{status:201});
  }

  const m=p.match(/^\/api\/alerts\/(\d+)$/);
  if(m&&request.method==='DELETE'){
    if(!env.DB)return error('D1 not connected.',503);
    await ensureSchema(env);
    await env.DB.prepare('DELETE FROM alerts WHERE id=?').bind(Number(m[1])).run();
    return json({ok:true});
  }

  return error('Not found.',404);
}
