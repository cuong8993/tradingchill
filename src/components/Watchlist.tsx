import { Activity, Columns3, PanelLeftClose, Plus, Settings2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { money, QUOTE_BATCH_SIZE, stored } from '../config';
import InstrumentIcon from './InstrumentIcon';
import type { InstrumentMeta, Quote, WatchlistSettings } from '../types';

type SortKey='symbol'|'price'|'changePercent'|'extendedPercent';
type SortDirection='asc'|'desc';

type Props={
  symbols:string[];
  selected:string;
  quotes:Record<string,Quote>;
  instruments:Record<string,InstrumentMeta>;
  settings:WatchlistSettings;
  mobileOpen:boolean;
  onSelect:(s:string)=>void;
  onRemove:(s:string)=>void;
  onAdd:()=>void;
  onHide:()=>void;
  onPanelWidth:(width:number)=>void;
  onAutoFit:()=>void;
  onSettings:()=>void;
};

const AUTO_COLUMNS=[42,19,19,20];
const MIN_COLUMNS=[24,14,14,14];

function extendedPercent(q?:Quote){
  if(!q||q.extendedPrice==null)return null;
  const reference=q.regularClose??q.price;
  if(!Number.isFinite(reference)||reference===0)return null;
  return ((q.extendedPrice-reference)/reference)*100;
}

function watchPct(value:number|null|undefined){
  if(value==null||!Number.isFinite(value))return '-';
  return `${value.toFixed(2)}%`;
}

function validColumns(value:unknown):number[]{
  if(!Array.isArray(value)||value.length!==4||value.some(v=>!Number.isFinite(Number(v))))return AUTO_COLUMNS;
  const numbers=value.map(Number);
  return numbers.every((v,i)=>v>=MIN_COLUMNS[i])?numbers:AUTO_COLUMNS;
}

export default function Watchlist(p:Props){
  const asideRef=useRef<HTMLElement>(null);
  const headerRef=useRef<HTMLDivElement>(null);
  const [sort,setSort]=useState<{key:SortKey;direction:SortDirection}>({key:'symbol',direction:'asc'});
  const [columns,setColumns]=useState<number[]>(()=>validColumns(stored<unknown>('tc.watchColumns.v2',AUTO_COLUMNS)));

  useEffect(()=>localStorage.setItem('tc.watchColumns.v2',JSON.stringify(columns)),[columns]);

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
      const av=sort.key==='extendedPercent'?extendedPercent(qa):qa?.[sort.key];
      const bv=sort.key==='extendedPercent'?extendedPercent(qb):qb?.[sort.key];

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

  const gridTemplate=columns.map(v=>`${v}fr`).join(' ');

  const startColumnResize=(index:number,event:ReactPointerEvent<HTMLSpanElement>)=>{
    event.preventDefault();
    event.stopPropagation();
    const width=headerRef.current?.getBoundingClientRect().width??0;
    if(!width)return;

    const startX=event.clientX;
    const start=[...columns];
    const total=start.reduce((sum,v)=>sum+v,0);
    const onMove=(move:PointerEvent)=>{
      const delta=((move.clientX-startX)/width)*total;
      const left=Math.max(MIN_COLUMNS[index],start[index]+delta);
      const applied=left-start[index];
      const right=Math.max(MIN_COLUMNS[index+1],start[index+1]-applied);
      const corrected=right-start[index+1];
      setColumns(start.map((v,i)=>i===index?start[index]-corrected:i===index+1?right:v));
    };
    const onUp=()=>{
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',onUp);
      document.body.classList.remove('resizing-columns');
    };
    document.body.classList.add('resizing-columns');
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onUp,{once:true});
  };

  const startPanelResize=(event:ReactPointerEvent<HTMLDivElement>)=>{
    if(window.matchMedia('(max-width:850px)').matches)return;
    event.preventDefault();
    const startX=event.clientX;
    const startWidth=asideRef.current?.getBoundingClientRect().width??320;
    const onMove=(move:PointerEvent)=>{
      const max=Math.min(560,Math.max(320,window.innerWidth*.55));
      p.onPanelWidth(Math.max(250,Math.min(max,startWidth+move.clientX-startX)));
    };
    const onUp=()=>{
      window.removeEventListener('pointermove',onMove);
      window.removeEventListener('pointerup',onUp);
      document.body.classList.remove('resizing-panel');
    };
    document.body.classList.add('resizing-panel');
    window.addEventListener('pointermove',onMove);
    window.addEventListener('pointerup',onUp,{once:true});
  };

  const autoFit=()=>{
    setColumns(AUTO_COLUMNS);
    localStorage.removeItem('tc.watchColumns.v2');
    p.onAutoFit();
  };

  const header=(key:SortKey,label:string,index:number)=><button className={sort.key===key?'sorted':''} onClick={()=>changeSort(key)}>
    <span>{label}</span>{sort.key===key&&<span className="sort-arrow">{sort.direction==='asc'?'↑':'↓'}</span>}
    {index<3&&<span className="column-resizer" role="separator" aria-label={`Resize ${label} column`} onPointerDown={e=>startColumnResize(index,e)}/>}
  </button>;

  const appearanceStyle={
    '--watch-up':p.settings.upColor,
    '--watch-down':p.settings.downColor,
    '--watch-row-height':`${p.settings.rowHeight}px`,
    '--watch-logo-size':`${p.settings.logoSize}px`,
    '--watch-font-size':`${p.settings.fontSize}px`,
  } as CSSProperties;

  return <aside ref={asideRef} className={`watchlist ${p.mobileOpen?'open':''}`} style={appearanceStyle}>
    <div className="watch-head">
      <span>WATCHLIST</span><strong>{p.symbols.length} symbols</strong>
      <div className="watch-actions">
        <button title="Watchlist appearance settings" onClick={p.onSettings}><Settings2 size={14}/></button>
        <button title="Auto fit watchlist and columns" onClick={autoFit}><Columns3 size={14}/></button>
        <button className="desktop-watch-action" title="Hide watchlist for full-width chart" onClick={p.onHide}><PanelLeftClose size={14}/></button>
        <button title="Add symbol" onClick={p.onAdd}><Plus size={15}/></button>
      </div>
    </div>

    <div ref={headerRef} className="watch-columns" style={{gridTemplateColumns:gridTemplate}}>
      {header('symbol','Symbol',0)}
      {header('price','Last',1)}
      {header('changePercent','Chg%',2)}
      {header('extendedPercent','Ext%',3)}
    </div>

    <div className="watch-items">
      {sortedSymbols.map(s=>{
        const q=p.quotes[s];
        const instrument=p.instruments[s];
        const ext=extendedPercent(q);
        const extTitle=q?.extendedSession?`${q.extendedSession.toUpperCase()} market: ${money(q.extendedPrice)}`:undefined;
        const extClass=ext==null?'':ext>=0?'up':'down';
        const changeClass=(q?.changePercent??0)>=0?'up':'down';

        return <button className={`watch-row ${p.selected===s?'active':''}`} style={{gridTemplateColumns:gridTemplate}} key={s} onClick={()=>p.onSelect(s)}>
          <span className="ticker">
            <InstrumentIcon symbol={s} instrument={instrument} className="watch-symbol-logo"/>
            <strong title={instrument?.name||s}>{instrument?.displaySymbol||s}</strong>
          </span>
          <span className="numeric last-price">{money(q?.price)}</span>
          <span className={`numeric ${changeClass}`}>{watchPct(q?.changePercent)}</span>
          <span className={`numeric ext-price ${extClass}`} title={extTitle}>{watchPct(ext)}</span>
          <i className="remove-symbol" onClick={e=>{e.stopPropagation();p.onRemove(s)}}><Trash2 size={13}/></i>
        </button>;
      })}
    </div>

    <button className="add-symbol" onClick={p.onAdd}><Plus size={14}/> Add symbol</button>
    <div className="watch-foot"><Activity size={13}/> Auto refresh · batches of {QUOTE_BATCH_SIZE}</div>
    <div className="watchlist-resizer" role="separator" aria-label="Resize watchlist panel" onPointerDown={startPanelResize}/>
  </aside>;
}
