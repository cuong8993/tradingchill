import { ensureSchema } from './db';
import { getQuotes } from './provider';
import type { Env } from './types';

export async function checkAlerts(env:Env){
  if(!env.DB)return;
  await ensureSchema(env);

  const r=await env.DB.prepare('SELECT * FROM alerts WHERE active=1 ORDER BY id ASC LIMIT 500')
    .all<{id:number;symbol:string;direction:'above'|'below';target:number}>();

  const symbols=[...new Set(r.results.map(a=>a.symbol))];
  const quotes=await getQuotes(env,symbols);
  const map=new Map(quotes.map(q=>[q.symbol,q]));

  for(const a of r.results){
    const q=map.get(a.symbol);
    if(!q)continue;

    const hit=a.direction==='above'?q.price>=a.target:q.price<=a.target;
    if(hit){
      await env.DB.prepare("UPDATE alerts SET active=0, triggered_at=datetime('now'), last_price=? WHERE id=?")
        .bind(q.price,a.id).run();
      await env.DB.prepare('INSERT INTO alert_events (alert_id,symbol,price,direction,target) VALUES (?,?,?,?,?)')
        .bind(a.id,a.symbol,q.price,a.direction,a.target).run();
    }else{
      await env.DB.prepare('UPDATE alerts SET last_price=? WHERE id=?').bind(q.price,a.id).run();
    }
  }
}
