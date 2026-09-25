import { Bell, BellRing, ChevronDown, LoaderCircle, Menu, Plus, Search, Sparkles } from 'lucide-react';
import type { SearchResult } from '../types';

type Props={selected:string;mode:'live'|'demo';hasAlerts:boolean;searchOpen:boolean;searchText:string;results:SearchResult[];loading:boolean;onMenu:()=>void;onSearchOpen:()=>void;onSearchText:(v:string)=>void;onAdd:(s:string)=>void;onAlerts:()=>void};
export default function TopBar(p:Props){return <header className="topbar">
  <button className="mobile-menu" onClick={p.onMenu}><Menu size={19}/></button>
  <div className="brand"><span className="brand-mark"><Sparkles size={17}/></span><strong>TradingChill</strong><i>BETA</i></div>
  <div className="search-wrap"><button className="search-trigger" onClick={p.onSearchOpen}><Search size={16}/><strong>{p.selected}</strong><span>Search markets</span><ChevronDown size={14}/></button>
    {p.searchOpen&&<div className="float search-panel"><div className="search-input"><Search size={16}/><input autoFocus value={p.searchText} onChange={e=>p.onSearchText(e.target.value)} placeholder="AAPL, TSLA, BTC..."/>{p.loading&&<LoaderCircle className="spin" size={15}/>}</div><div className="search-results">{p.results.slice(0,15).map(r=><button key={`${r.symbol}-${r.description}`} onClick={()=>p.onAdd(r.symbol)}><span><strong>{r.displaySymbol||r.symbol}</strong><small>{r.description}</small></span><Plus size={15}/></button>)}</div></div>}
  </div>
  <div className="top-actions"><span className={`data-badge ${p.mode}`}>{p.mode==='live'?'LIVE':'DEMO'}</span><button className="icon" onClick={p.onAlerts}>{p.hasAlerts?<BellRing size={17}/>:<Bell size={17}/>}</button></div>
</header>}
