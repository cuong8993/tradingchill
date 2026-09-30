import type { Env } from './types';

const PBKDF2_ITERATIONS=100000;
const SESSION_DAYS=30;
const encoder=new TextEncoder();

function bytesToBase64Url(bytes:Uint8Array){
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function base64UrlToBytes(value:string){
  const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((value.length+3)%4);
  const binary=atob(padded);
  return Uint8Array.from(binary,char=>char.charCodeAt(0));
}

async function sha256Base64Url(value:string){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function derivePassword(password:string,salt:string,iterations=PBKDF2_ITERATIONS){
  const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({
    name:'PBKDF2',
    salt:base64UrlToBytes(salt),
    iterations,
    hash:'SHA-256',
  },key,256);
  return bytesToBase64Url(new Uint8Array(bits));
}

function secureEqual(a:string,b:string){
  if(a.length!==b.length)return false;
  const aa=encoder.encode(a),bb=encoder.encode(b);
  if('timingSafeEqual' in crypto.subtle){
    try{return (crypto.subtle as SubtleCrypto&{timingSafeEqual:(a:BufferSource,b:BufferSource)=>boolean}).timingSafeEqual(aa,bb);}
    catch{}
  }
  let result=0;
  for(let i=0;i<aa.length;i++)result|=aa[i]^bb[i];
  return result===0;
}

function cookieValue(request:Request,name:string){
  const cookie=request.headers.get('cookie')||'';
  for(const part of cookie.split(';')){
    const [key,...rest]=part.trim().split('=');
    if(key===name)return decodeURIComponent(rest.join('='));
  }
  return null;
}

function sessionCookie(request:Request,token:string,maxAge:number){
  const secure=new URL(request.url).protocol==='https:'?'; Secure':'';
  return `tc_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export function normalizeEmail(value:string){
  const email=value.trim().toLowerCase();
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');
  return email;
}

export function validatePassword(value:string){
  if(value.length<10)throw new Error('Password must contain at least 10 characters.');
  if(value.length>128)throw new Error('Password must contain at most 128 characters.');
  return value;
}

export async function hashNewPassword(password:string){
  const saltBytes=crypto.getRandomValues(new Uint8Array(16));
  const salt=bytesToBase64Url(saltBytes);
  const hash=await derivePassword(password,salt);
  return {salt,hash,iterations:PBKDF2_ITERATIONS};
}

export async function verifyPassword(password:string,salt:string,expected:string,iterations:number){
  const actual=await derivePassword(password,salt,iterations);
  return secureEqual(actual,expected);
}

export async function createSession(request:Request,env:Env,userId:number){
  if(!env.DB)throw new Error('D1 not connected.');
  const token=bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash=await sha256Base64Url(token);
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,datetime('now',?))"
  ).bind(tokenHash,userId,`+${SESSION_DAYS} days`).run();
  return sessionCookie(request,token,SESSION_DAYS*24*60*60);
}

export async function deleteSession(request:Request,env:Env){
  const token=cookieValue(request,'tc_session');
  if(env.DB&&token){
    const tokenHash=await sha256Base64Url(token);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(tokenHash).run();
  }
  return sessionCookie(request,'',0);
}

export async function currentUser(request:Request,env:Env){
  if(!env.DB)return null;
  const token=cookieValue(request,'tc_session');
  if(!token)return null;
  const tokenHash=await sha256Base64Url(token);
  const row=await env.DB.prepare(`
    SELECT users.id AS id, users.email AS email
    FROM sessions
    JOIN users ON users.id=sessions.user_id
    WHERE sessions.token_hash=? AND sessions.expires_at>datetime('now')
    LIMIT 1
  `).bind(tokenHash).first<{id:number;email:string}>();
  return row||null;
}

export async function requireUser(request:Request,env:Env){
  const user=await currentUser(request,env);
  if(!user)throw new Response(JSON.stringify({error:'Sign in required.'}),{
    status:401,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
  });
  return user;
}
