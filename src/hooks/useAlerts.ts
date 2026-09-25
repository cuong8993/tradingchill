import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { stored } from '../config';
import type { AlertDirection, PriceAlert, Quote } from '../types';

export function useAlerts(database:boolean, selected:string, quote:Quote|undefined, quotes:Record<string,Quote>, toast:(s:string)=>void){
  const [alerts,setAlerts]=useState<PriceAlert[]>([]);
  const load=useCallback(async()=>{ if(!database){setAlerts(stored('mv.localAlerts',[]));return;} try{setAlerts(await api.alerts());}catch{} },[database]);
  useEffect(()=>{void load();const id=setInterval(()=>void load(),15000);return()=>clearInterval(id);},[load]);
  useEffect(()=>{ if(database)return; const local=stored<PriceAlert[]>('mv.localAlerts',[]); let changed=false;
    const next=local.map(a=>{if(!a.active)return a;const q=quotes[a.symbol];if(!q)return a;const hit=a.direction==='above'?q.price>=a.target:q.price<=a.target;if(!hit)return {...a,last_price:q.price};changed=true;toast(`${a.symbol} alert triggered`);return {...a,active:0,triggered_at:new Date().toISOString(),last_price:q.price};});
    if(changed){localStorage.setItem('mv.localAlerts',JSON.stringify(next));setAlerts(next);} },[quotes,database,toast]);
  const create=async(direction:AlertDirection,target:number,note:string)=>{ if(database){const a=await api.createAlert({symbol:selected,direction,target,note});setAlerts(p=>[a,...p]);}else{const local=stored<PriceAlert[]>('mv.localAlerts',[]),a:PriceAlert={id:-Date.now(),symbol:selected,direction,target,note,active:1,triggered_at:null,last_price:quote?.price??null,created_at:new Date().toISOString()},next=[a,...local];localStorage.setItem('mv.localAlerts',JSON.stringify(next));setAlerts(next);} };
  const remove=async(a:PriceAlert)=>{if(database&&a.id>0)await api.deleteAlert(a.id);else{const next=alerts.filter(x=>x.id!==a.id);localStorage.setItem('mv.localAlerts',JSON.stringify(next));setAlerts(next);}void load();};
  return {alerts,create,remove};
}
