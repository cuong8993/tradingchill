import { Check } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertDrawer, AlertModal } from './components/AlertUI';
import ChartToolbar from './components/ChartToolbar';
import TopBar from './components/TopBar';
import VolumeSettingsModal from './components/VolumeSettingsModal';
import Watchlist from './components/Watchlist';
import {
  DEFAULT_INDICATORS,
  DEFAULT_TIMEFRAME,
  DEFAULT_TIMEFRAME_FAVORITES,
  DEFAULT_VOLUME_MA,
  DEFAULT_WATCHLIST,
  stored,
} from './config';
import { useAlerts } from './hooks/useAlerts';
import { useMarket } from './hooks/useMarket';
import type { IndicatorSettings, Timeframe, VolumeMASettings } from './types';
import { ChartCard, MarketHeader } from './components/WorkspaceBits';

export default function App(){
  const [watchlist,setWatchlist]=useState<string[]>(()=>stored('mv.watchlist',DEFAULT_WATCHLIST));
  const [selected,setSelected]=useState(()=>stored('mv.selected',DEFAULT_WATCHLIST[0]));
  const [timeframe,setTimeframe]=useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [timeframeFavorites,setTimeframeFavorites]=useState<string[]>(()=>stored('tc.timeframeFavorites',DEFAULT_TIMEFRAME_FAVORITES));
  const [indicators,setIndicators]=useState<IndicatorSettings>(()=>({...DEFAULT_INDICATORS,...stored('mv.indicators',DEFAULT_INDICATORS)}));
  const [volumeMA,setVolumeMA]=useState<VolumeMASettings>(()=>({...DEFAULT_VOLUME_MA,...stored('tc.volumeMA',DEFAULT_VOLUME_MA)}));
  const [logScale,setLogScale]=useState(()=>stored('tc.logScale',false));
  const [fitSignal,setFitSignal]=useState(0);
  const [volumeSettingsOpen,setVolumeSettingsOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false),[searchText,setSearchText]=useState(''),[indicatorOpen,setIndicatorOpen]=useState(false);
  const [mobileWatch,setMobileWatch]=useState(false),[alertsOpen,setAlertsOpen]=useState(false),[alertModal,setAlertModal]=useState(false),[toast,setToast]=useState('');

  const market=useMarket(watchlist,selected,timeframe), quote=market.quotes[selected];
  const toastFn=useCallback((s:string)=>setToast(s),[]);
  const openVolumeSettings=useCallback(()=>setVolumeSettingsOpen(true),[]);
  const alertState=useAlerts(market.config.database,selected,quote,market.quotes,toastFn);
  const selectedAlerts=useMemo(()=>alertState.alerts.filter(a=>a.symbol===selected&&a.active),[alertState.alerts,selected]);

  useEffect(()=>localStorage.setItem('mv.watchlist',JSON.stringify(watchlist)),[watchlist]);
  useEffect(()=>localStorage.setItem('mv.selected',JSON.stringify(selected)),[selected]);
  useEffect(()=>localStorage.setItem('mv.indicators',JSON.stringify(indicators)),[indicators]);
  useEffect(()=>localStorage.setItem('tc.volumeMA',JSON.stringify(volumeMA)),[volumeMA]);
  useEffect(()=>localStorage.setItem('tc.logScale',JSON.stringify(logScale)),[logScale]);
  useEffect(()=>localStorage.setItem('tc.timeframeFavorites',JSON.stringify(timeframeFavorites)),[timeframeFavorites]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),3200);return()=>clearTimeout(id)},[toast]);
  useEffect(()=>{const id=setTimeout(()=>void market.search(searchText),220);return()=>clearTimeout(id)},[searchText,market.search]);

  const add=(s:string)=>{const clean=s.toUpperCase();setWatchlist(p=>p.includes(clean)?p:[...p,clean]);setSelected(clean);setSearchOpen(false);setSearchText('')};
  const remove=(s:string)=>setWatchlist(p=>{const n=p.filter(x=>x!==s);if(selected===s&&n[0])setSelected(n[0]);return n});
  const select=(s:string)=>{setSelected(s);setMobileWatch(false)};
  const selectFromDropdown=(s:string)=>{setSelected(s);setSearchOpen(false);setSearchText('')};
  const toggleTimeframeFavorite=(label:string)=>setTimeframeFavorites(current=>current.includes(label)?current.filter(x=>x!==label):[...current,label]);

  return <div className="app-shell">
    <TopBar
      selected={selected}
      watchlist={watchlist}
      mode={market.config.mode}
      hasAlerts={alertState.alerts.some(a=>a.active)}
      searchOpen={searchOpen}
      searchText={searchText}
      results={market.searchResults}
      loading={market.searchLoading}
      onMenu={()=>setMobileWatch(v=>!v)}
      onSearchOpen={()=>setSearchOpen(v=>!v)}
      onSearchText={setSearchText}
      onSelect={selectFromDropdown}
      onAdd={add}
      onAlerts={()=>setAlertsOpen(v=>!v)}
    />

    <Watchlist symbols={watchlist} selected={selected} quotes={market.quotes} mobileOpen={mobileWatch} onSelect={select} onRemove={remove} onAdd={()=>setSearchOpen(true)}/>

    <main className="workspace">
      <MarketHeader symbol={selected} quote={quote}/>
      <ChartToolbar
        timeframe={timeframe}
        favorites={timeframeFavorites}
        indicators={indicators}
        open={indicatorOpen}
        onTimeframe={setTimeframe}
        onToggleFavorite={toggleTimeframeFavorite}
        onOpen={()=>setIndicatorOpen(v=>!v)}
        onClose={()=>setIndicatorOpen(false)}
        onToggle={k=>setIndicators(p=>({...p,[k]:!p[k]}))}
        onAlert={()=>setAlertModal(true)}
      />
      <ChartCard
        loading={market.chartLoading}
        error={market.chartError}
        candles={market.candles}
        source={market.chartSource}
        note={market.chartNote}
        quote={quote}
        indicators={indicators}
        alerts={selectedAlerts}
        volumeMA={volumeMA}
        fitSignal={fitSignal}
        logScale={logScale}
        onAutoFit={()=>setFitSignal(v=>v+1)}
        onToggleLog={()=>setLogScale(v=>!v)}
        onVolumeSettings={openVolumeSettings}
        retry={()=>void market.loadCandles()}
      />
      <footer><span>{market.config.mode==='live'?'Live Finnhub quotes':'Live quote feed offline'}</span><span>{market.config.chartProvider==='twelvedata'?'Twelve Data charts':'Yahoo real-market charts'} · {watchlist.length} symbols</span></footer>
    </main>

    {alertsOpen&&<AlertDrawer alerts={alertState.alerts} onClose={()=>setAlertsOpen(false)} onNew={()=>setAlertModal(true)} onDelete={a=>void alertState.remove(a)}/>}
    {alertModal&&<AlertModal symbol={selected} price={quote?.price??0} onClose={()=>setAlertModal(false)} onCreate={async(d,t,n)=>{await alertState.create(d,t,n);toastFn(`Alert created for ${selected}`)}}/>}
    {volumeSettingsOpen&&<VolumeSettingsModal value={volumeMA} onClose={()=>setVolumeSettingsOpen(false)} onApply={setVolumeMA}/>}
    {toast&&<div className="toast"><Check size={14}/>{toast}</div>}
  </div>;
}
