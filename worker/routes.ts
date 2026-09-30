import { createSession, currentUser, deleteSession, hashNewPassword, normalizeEmail, validatePassword, verifyPassword } from './auth';
import { ensureSchema } from './db';
import { getCandles, getFastQuote, getInstrumentMetas, getQuote, getQuotes, getQuotesFast, searchLive } from './provider';
import { error, json, symbolOf, type Env } from './types';
const MAX_QUOTES_PER_REQUEST=50;

export async function handleApi(request:Request,env:Env){
  const u=new URL(request.url),p=u.pathname;

  if(request.method==='GET'&&p==='/api/config'){
    return json({
      mode:env.FINNHUB_API_KEY?'live':'offline',
      chartProvider:env.TWELVEDATA_API_KEY?'twelvedata':'yahoo',
      database:Boolean(env.DB),
      accounts:Boolean(env.DB),
    });
  }

  if(p==='/api/auth/register'&&request.method==='POST'){
    if(!env.DB)return error('Accounts require D1.',503);
    await ensureSchema(env);
    const body=await request.json().catch(()=>null) as {email?:string;password?:string}|null;
    if(!body)return error('Invalid request.');
    let email:string,password:string;
    try{
      email=normalizeEmail(body.email||'');
      password=validatePassword(body.password||'');
    }catch(e){
      return error(e instanceof Error?e.message:'Invalid account details.');
    }

    const existing=await env.DB.prepare('SELECT id FROM users WHERE email=? LIMIT 1').bind(email).first();
    if(existing)return error('An account with this email already exists.',409);

    const passwordRecord=await hashNewPassword(password);
    try{
      await env.DB.prepare(
        'INSERT INTO users (email,password_hash,password_salt,password_iterations) VALUES (?,?,?,?)'
      ).bind(email,passwordRecord.hash,passwordRecord.salt,passwordRecord.iterations).run();
    }catch{
      return error('An account with this email already exists.',409);
    }

    const user=await env.DB.prepare('SELECT id,email FROM users WHERE email=? LIMIT 1').bind(email).first<{id:number;email:string}>();
    if(!user)return error('Could not create account.',500);
    const cookie=await createSession(request,env,user.id);
    return json({user,preferences:null},{status:201,headers:{'set-cookie':cookie}});
  }

  if(p==='/api/auth/login'&&request.method==='POST'){
    if(!env.DB)return error('Accounts require D1.',503);
    await ensureSchema(env);
    const body=await request.json().catch(()=>null) as {email?:string;password?:string}|null;
    if(!body)return error('Invalid request.');

    let email:string;
    try{email=normalizeEmail(body.email||'');}
    catch{return error('Invalid email or password.',401);}

    const user=await env.DB.prepare(
      'SELECT id,email,password_hash,password_salt,password_iterations FROM users WHERE email=? LIMIT 1'
    ).bind(email).first<{id:number;email:string;password_hash:string;password_salt:string;password_iterations:number}>();
    if(!user)return error('Invalid email or password.',401);

    const valid=await verifyPassword(body.password||'',user.password_salt,user.password_hash,user.password_iterations);
    if(!valid)return error('Invalid email or password.',401);

    await env.DB.prepare("DELETE FROM sessions WHERE expires_at<=datetime('now')").run();
    const cookie=await createSession(request,env,user.id);
    const preferencesRow=await env.DB.prepare('SELECT data FROM user_preferences WHERE user_id=?').bind(user.id).first<{data:string}>();
    let preferences:unknown=null;
    if(preferencesRow?.data){
      try{preferences=JSON.parse(preferencesRow.data);}catch{}
    }
    return json({user:{id:user.id,email:user.email},preferences},{headers:{'set-cookie':cookie}});
  }

  if(p==='/api/auth/logout'&&request.method==='POST'){
    if(!env.DB)return json({ok:true});
    await ensureSchema(env);
    const cookie=await deleteSession(request,env);
    return json({ok:true},{headers:{'set-cookie':cookie}});
  }

  if(p==='/api/auth/me'&&request.method==='GET'){
    if(!env.DB)return json({user:null,preferences:null});
    await ensureSchema(env);
    const user=await currentUser(request,env);
    if(!user)return json({user:null,preferences:null});
    const row=await env.DB.prepare('SELECT data FROM user_preferences WHERE user_id=?').bind(user.id).first<{data:string}>();
    let preferences:unknown=null;
    if(row?.data){
      try{preferences=JSON.parse(row.data);}catch{}
    }
    return json({user,preferences});
  }

  if(p==='/api/account/preferences'&&request.method==='GET'){
    if(!env.DB)return error('Accounts require D1.',503);
    await ensureSchema(env);
    const user=await currentUser(request,env);
    if(!user)return error('Sign in required.',401);
    const row=await env.DB.prepare('SELECT data,updated_at FROM user_preferences WHERE user_id=?').bind(user.id).first<{data:string;updated_at:string}>();
    let preferences:unknown={};
    if(row?.data){
      try{preferences=JSON.parse(row.data);}catch{}
    }
    return json({preferences,updatedAt:row?.updated_at??null});
  }

  if(p==='/api/account/preferences'&&request.method==='PUT'){
    if(!env.DB)return error('Accounts require D1.',503);
    await ensureSchema(env);
    const user=await currentUser(request,env);
    if(!user)return error('Sign in required.',401);
    const body=await request.json().catch(()=>null) as {preferences?:unknown}|null;
    if(!body||typeof body.preferences!=='object'||body.preferences===null||Array.isArray(body.preferences))return error('Invalid preferences.');
    const data=JSON.stringify(body.preferences);
    if(data.length>50000)return error('Preferences are too large.',413);
    await env.DB.prepare(`
      INSERT INTO user_preferences (user_id,data,updated_at)
      VALUES (?,?,datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET data=excluded.data, updated_at=datetime('now')
    `).bind(user.id,data).run();
    return json({ok:true});
  }

  if(request.method==='GET'&&p==='/api/search'){
    const q=(u.searchParams.get('q')||'').trim();
    if(!q)return json([]);
    if(!env.FINNHUB_API_KEY)return error('FINNHUB_API_KEY is not configured.',503);
    const r=await searchLive(env,q);
    return json((r.result||[]).slice(0,30));
  }

  if(request.method==='GET'&&p==='/api/quote-fast'){
    if(!env.FINNHUB_API_KEY)return error('FINNHUB_API_KEY is not configured.',503);
    return json(await getFastQuote(env,symbolOf(u.searchParams.get('symbol'))));
  }

  if(request.method==='GET'&&p==='/api/quote'){
    if(!env.FINNHUB_API_KEY)return error('FINNHUB_API_KEY is not configured.',503);
    return json(await getQuote(env,symbolOf(u.searchParams.get('symbol'))));
  }

  if(request.method==='GET'&&p==='/api/quotes-fast'){
    if(!env.FINNHUB_API_KEY)return error('FINNHUB_API_KEY is not configured.',503);
    const symbols=(u.searchParams.get('symbols')||'').split(',').filter(Boolean).slice(0,MAX_QUOTES_PER_REQUEST).map(symbolOf);
    return json(await getQuotesFast(env,symbols));
  }

  if(request.method==='GET'&&p==='/api/quotes'){
    if(!env.FINNHUB_API_KEY)return error('FINNHUB_API_KEY is not configured.',503);
    const symbols=(u.searchParams.get('symbols')||'').split(',').filter(Boolean).slice(0,MAX_QUOTES_PER_REQUEST).map(symbolOf);
    return json(await getQuotes(env,symbols));
  }

  if(request.method==='GET'&&p==='/api/instruments'){
    const symbols=(u.searchParams.get('symbols')||'').split(',').filter(Boolean).slice(0,MAX_QUOTES_PER_REQUEST).map(symbolOf);
    if(!symbols.length)return json([]);
    return json(await getInstrumentMetas(env,symbols));
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
