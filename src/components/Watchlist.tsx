import { Activity, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { money, pct, QUOTE_BATCH_SIZE } from '../config';
import type { Quote } from '../types';

type SortKey='symbol'|'price'|'extendedPrice'|'changePercent';
type SortDirection='asc'|'desc';

type Props={
  symbols:string[];
  selected:string;
  quotes:Record<string,Quote>;
  mobileOpen:boolean;
  onSelect:(s:string)=>void;
  onRemove:(s:string)=>void;
  onAdd:()=>void;
};

function directionClass(value:number|null|undefined,reference:number|null|undefined){
  if(value==null||reference==null||!Number.isFinite(value)||!Number.isFinite(reference))return '';
  return value>=reference?'up':'down';
}

export default function Watchlist(p:Props){
  const [sort,setSort]=useState<{key:SortKey;direction:SortDirection}>({key:'symbol',direction:'asc'});

  const changeSort=(key:SortKey)=>{
    setSort(current=>{
      if(current.key===key)return {...current,direction:current.direction==='asc'?'desc':'asc'};
      return {key,direction:key==='symbol'?'asc':'desc'};
    });
  };

  const sortedSymbols=useMemo(()=>{
    const list=[...p.symbols];
    list.sort((a,b)=>{
      if(sort.key==='symbol'){
        const value=a.localeCompare(b);
        return sort.direction==='asc'?value:-value;
      }

      const qa=p.quotes[a];
      const qb=p.quotes[b];
      const av=sort.key==='extendedPrice'?qa?.extendedPrice:qa?.[sort.key];
      const bv=sort.key==='extendedPrice'?qb?.extendedPrice:qb?.[sort.key];

      const aMissing=av==null||!Number.isFinite(Number(av));
      const bMissing=bv==null||!Number.isFinite(Number(bv));
      if(aMissing&&bMissing)return a.localeCompare(b);
      if(aMissing)return 1;
      if(bMissing)return -1;

      const value=Number(av)-Number(bv);
      return sort.direction==='asc'?value:-value;
    });
    return list;
  },[p.symbols,p.quotes,sort]);

  const header=(key:SortKey,label:string)=><button className={sort.key===key?'sorted':''} onClick={()=>changeSort(key)}>
    <span>{label}</span>{sort.key===key&&<i>{sort.direction==='asc'?'↑':'↓'}</i>}
  </button>;

  return <aside className={`watchlist ${p.mobileOpen?'open':''}`}>
    <div className="watch-head"><span>WATCHLIST</span><strong>{p.symbols.length} symbols</strong><button onClick={p.onAdd}><Plus size={15}/></button></div>

    <div className="watch-columns">
      {header('symbol','Symbol')}
      {header('price','Last')}
      {header('extendedPrice','Ext')}
      {header('changePercent','Chg%')}
    </div>

    <div className="watch-items">
      {sortedSymbols.map(s=>{
        const q=p.quotes[s];
        const extTitle=q?.extendedSession?`${q.extendedSession.toUpperCase()} market`:undefined;
        const lastClass=directionClass(q?.price,q?.previousClose);
        const extReference=q?.regularClose??q?.price;
        const extClass=directionClass(q?.extendedPrice,extReference);
        const changeClass=(q?.changePercent??0)>=0?'up':'down';

        return <button className={`watch-row ${p.selected===s?'active':''}`} key={s} onClick={()=>p.onSelect(s)}>
          <span className="ticker"><b>{s.slice(0,1)}</b><strong>{s}</strong></span>
          <span className={`numeric ${lastClass}`}>{money(q?.price)}</span>
          <span className={`numeric ext-price ${extClass}`} title={extTitle}>{money(q?.extendedPrice)}</span>
          <span className={`numeric ${changeClass}`}>{pct(q?.changePercent)}</span>
          <i className="remove-symbol" onClick={e=>{e.stopPropagation();p.onRemove(s)}}><Trash2 size={13}/></i>
        </button>;
      })}
    </div>

    <button className="add-symbol" onClick={p.onAdd}><Plus size={14}/> Add symbol</button>
    <div className="watch-foot"><Activity size={13}/> Auto refresh · batches of {QUOTE_BATCH_SIZE}</div>
  </aside>;
}
