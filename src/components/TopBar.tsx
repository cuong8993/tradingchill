import { Bell, BellRing, Check, ChevronDown, LoaderCircle, Menu, Plus, Search } from 'lucide-react';
import type { SearchResult } from '../types';

type Props={
  selected:string;
  watchlist:string[];
  mode:'live'|'offline';
  hasAlerts:boolean;
  searchOpen:boolean;
  searchText:string;
  results:SearchResult[];
  loading:boolean;
  onMenu:()=>void;
  onSearchOpen:()=>void;
  onSearchText:(v:string)=>void;
  onSelect:(s:string)=>void;
  onAdd:(s:string)=>void;
  onAlerts:()=>void;
};

export default function TopBar(p:Props){
  const query=p.searchText.trim();
  return <header className="topbar">
    <button className="mobile-menu" onClick={p.onMenu}><Menu size={19}/></button>
    <div className="brand"><span className="brand-mark"><img src="/logo.png" alt="TradingChill logo"/></span><strong>TradingChill</strong><i>BETA</i></div>

    <div className="search-wrap">
      <button className="search-trigger" onClick={p.onSearchOpen} aria-expanded={p.searchOpen}>
        <Search size={16}/><strong>{p.selected}</strong><span>Choose ticker or search markets</span><ChevronDown size={14}/>
      </button>

      {p.searchOpen&&<div className="float search-panel">
        <div className="search-input">
          <Search size={16}/>
          <input autoFocus value={p.searchText} onChange={e=>p.onSearchText(e.target.value)} placeholder="Search AAPL, TSLA, BTC..."/>
          {p.loading&&<LoaderCircle className="spin" size={15}/>}
        </div>

        {!query&&<>
          <div className="dropdown-label">WATCHLIST</div>
          <div className="ticker-dropdown">
            {p.watchlist.map(symbol=><button key={symbol} className={symbol===p.selected?'selected':''} onClick={()=>p.onSelect(symbol)}>
              <span className="ticker-dropdown-symbol"><b>{symbol.slice(0,1)}</b><strong>{symbol}</strong></span>
              {symbol===p.selected&&<Check size={14}/>}
            </button>)}
          </div>
          <div className="dropdown-hint">Type above to search and add another market.</div>
        </>}

        {query&&<div className="search-results">
          {p.results.slice(0,15).map(r=><button key={`${r.symbol}-${r.description}`} onClick={()=>p.onAdd(r.symbol)}>
            <span><strong>{r.displaySymbol||r.symbol}</strong><small>{r.description}</small></span><Plus size={15}/>
          </button>)}
          {!p.loading&&p.results.length===0&&<div className="empty-search">No matching markets.</div>}
        </div>}
      </div>}
    </div>

    <div className="top-actions"><span className={`data-badge ${p.mode}`}>{p.mode==='live'?'LIVE':'OFFLINE'}</span><button className="icon" onClick={p.onAlerts}>{p.hasAlerts?<BellRing size={17}/>:<Bell size={17}/>}</button></div>
  </header>;
}
