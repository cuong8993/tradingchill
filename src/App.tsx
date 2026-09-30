import { Check, PanelLeftOpen } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AlertDrawer, AlertModal } from './components/AlertUI';
import AccountModal from './components/AccountModal';
import ChartSettingsModal from './components/ChartSettingsModal';
import ChartToolbar from './components/ChartToolbar';
import TopBar from './components/TopBar';
import VolumeSettingsModal from './components/VolumeSettingsModal';
import Watchlist from './components/Watchlist';
import {
  DEFAULT_CHART_SETTINGS,
  DEFAULT_INDICATORS,
  DEFAULT_TIMEFRAME,
  DEFAULT_TIMEFRAME_FAVORITES,
  DEFAULT_VOLUME_MA,
  DEFAULT_WATCHLIST,
  TIMEFRAMES,
  stored,
} from './config';
import { useAlerts } from './hooks/useAlerts';
import { api } from './lib/api';
import { useMarket } from './hooks/useMarket';
import type { AccountUser, ChartSettings, IndicatorSettings, Timeframe, UserPreferences, VolumeMASettings } from './types';
import { ChartCard, MarketHeader } from './components/WorkspaceBits';

export default function App(){
  const [watchlist,setWatchlist]=useState<string[]>(()=>stored('mv.watchlist',DEFAULT_WATCHLIST));
  const [selected,setSelected]=useState(()=>stored('mv.selected',DEFAULT_WATCHLIST[0]));
  const [timeframe,setTimeframe]=useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [timeframeFavorites,setTimeframeFavorites]=useState<string[]>(()=>stored('tc.timeframeFavorites',DEFAULT_TIMEFRAME_FAVORITES));
  const [indicators,setIndicators]=useState<IndicatorSettings>(()=>({...DEFAULT_INDICATORS,...stored('mv.indicators',DEFAULT_INDICATORS)}));
  const [volumeMA,setVolumeMA]=useState<VolumeMASettings>(()=>({...DEFAULT_VOLUME_MA,...stored('tc.volumeMA',DEFAULT_VOLUME_MA)}));
  const [logScale,setLogScale]=useState(()=>stored('tc.logScale',false));
  const [chartSettings,setChartSettings]=useState<ChartSettings>(()=>({...DEFAULT_CHART_SETTINGS,...stored('tc.chartSettings',DEFAULT_CHART_SETTINGS)}));
  const [watchlistWidth,setWatchlistWidth]=useState<number|null>(()=>stored<number|null>('tc.watchlistWidth.v2',null));
  const [watchlistHidden,setWatchlistHidden]=useState(false);
  const [fitSignal,setFitSignal]=useState(0);
  const [volumeSettingsOpen,setVolumeSettingsOpen]=useState(false);
  const [chartSettingsOpen,setChartSettingsOpen]=useState(false);
  const [chartFullscreen,setChartFullscreen]=useState(false);
  const [accountUser,setAccountUser]=useState<AccountUser|null>(null);
  const [accountOpen,setAccountOpen]=useState(false);
  const [accountReady,setAccountReady]=useState(false);
  const [syncStatus,setSyncStatus]=useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [searchOpen,setSearchOpen]=useState(false),[searchText,setSearchText]=useState(''),[indicatorOpen,setIndicatorOpen]=useState(false);
  const [mobileWatch,setMobileWatch]=useState(false),[alertsOpen,setAlertsOpen]=useState(false),[alertModal,setAlertModal]=useState(false),[toast,setToast]=useState('');

  const market=useMarket(watchlist,selected,timeframe), quote=market.quotes[selected];
  const toastFn=useCallback((s:string)=>setToast(s),[]);
  const openVolumeSettings=useCallback(()=>setVolumeSettingsOpen(true),[]);
  const openChartSettings=useCallback(()=>setChartSettingsOpen(true),[]);
  const toggleChartFullscreen=useCallback(()=>setChartFullscreen(v=>!v),[]);
  const alertState=useAlerts(market.config.database,selected,quote,market.quotes,toastFn);
  const selectedAlerts=useMemo(()=>alertState.alerts.filter(a=>a.symbol===selected&&a.active),[alertState.alerts,selected]);

  const cloudPreferences=useMemo<UserPreferences>(()=>({
    watchlist,
    selected,
    timeframe:timeframe.label,
    timeframeFavorites,
    indicators,
    volumeMA,
    logScale,
    chartSettings,
    watchlistWidth,
  }),[watchlist,selected,timeframe.label,timeframeFavorites,indicators,volumeMA,logScale,chartSettings,watchlistWidth]);

  const applyPreferences=useCallback((preferences:UserPreferences|null)=>{
    if(!preferences)return;

    let nextWatchlist:string[]|null=null;
    if(Array.isArray(preferences.watchlist)){
      nextWatchlist=preferences.watchlist
        .map(symbol=>String(symbol).trim().toUpperCase())
        .filter(symbol=>/^[A-Z0-9.:-]{1,24}$/.test(symbol))
        .slice(0,200);
      if(nextWatchlist.length)setWatchlist(nextWatchlist);
    }

    if(typeof preferences.selected==='string'){
      const nextSelected=preferences.selected.trim().toUpperCase();
      if(/^[A-Z0-9.:-]{1,24}$/.test(nextSelected))setSelected(nextSelected);
    }else if(nextWatchlist?.[0]){
      setSelected(nextWatchlist[0]);
    }

    if(typeof preferences.timeframe==='string'){
      const savedTimeframe=TIMEFRAMES.find(item=>item.label===preferences.timeframe);
      if(savedTimeframe)setTimeframe(savedTimeframe);
    }

    if(Array.isArray(preferences.timeframeFavorites)){
      const allowed=new Set(TIMEFRAMES.map(item=>item.label));
      setTimeframeFavorites(preferences.timeframeFavorites.filter(label=>allowed.has(label)).slice(0,12));
    }

    if(preferences.indicators)setIndicators({...DEFAULT_INDICATORS,...preferences.indicators});
    if(preferences.volumeMA)setVolumeMA({...DEFAULT_VOLUME_MA,...preferences.volumeMA});
    if(typeof preferences.logScale==='boolean')setLogScale(preferences.logScale);
    if(preferences.chartSettings)setChartSettings({...DEFAULT_CHART_SETTINGS,...preferences.chartSettings});

    if(preferences.watchlistWidth==null)setWatchlistWidth(null);
    else if(Number.isFinite(preferences.watchlistWidth))setWatchlistWidth(Math.max(250,Math.min(560,Number(preferences.watchlistWidth))));
  },[]);

  const signIn=useCallback(async(email:string,password:string)=>{
    const result=await api.login(email,password);
    setAccountUser(result.user);
    if(result.preferences)applyPreferences(result.preferences);
    else if(result.user)await api.savePreferences(cloudPreferences);
    setSyncStatus('saved');
    setAccountReady(true);
  },[applyPreferences,cloudPreferences]);

  const register=useCallback(async(email:string,password:string)=>{
    const result=await api.register(email,password);
    setAccountUser(result.user);
    if(result.user)await api.savePreferences(cloudPreferences);
    setSyncStatus('saved');
    setAccountReady(true);
  },[cloudPreferences]);

  const signOut=useCallback(async()=>{
    await api.logout();
    setAccountUser(null);
    setSyncStatus('idle');
  },[]);

  useEffect(()=>{
    let active=true;
    void api.me()
      .then(result=>{
        if(!active)return;
        setAccountUser(result.user);
        if(result.user&&result.preferences)applyPreferences(result.preferences);
      })
      .catch(()=>{})
      .finally(()=>{if(active)setAccountReady(true)});
    return()=>{active=false};
  },[applyPreferences]);

  useEffect(()=>{
    if(!accountReady||!accountUser)return;
    setSyncStatus('saving');
    let active=true;
    const id=window.setTimeout(()=>{
      void api.savePreferences(cloudPreferences)
        .then(()=>{if(active)setSyncStatus('saved')})
        .catch(()=>{if(active)setSyncStatus('error')});
    },900);
    return()=>{
      active=false;
      window.clearTimeout(id);
    };
  },[accountReady,accountUser,cloudPreferences]);

  useEffect(()=>localStorage.setItem('mv.watchlist',JSON.stringify(watchlist)),[watchlist]);
  useEffect(()=>localStorage.setItem('mv.selected',JSON.stringify(selected)),[selected]);
  useEffect(()=>localStorage.setItem('mv.indicators',JSON.stringify(indicators)),[indicators]);
  useEffect(()=>localStorage.setItem('tc.volumeMA',JSON.stringify(volumeMA)),[volumeMA]);
  useEffect(()=>localStorage.setItem('tc.logScale',JSON.stringify(logScale)),[logScale]);
  useEffect(()=>localStorage.setItem('tc.chartSettings',JSON.stringify(chartSettings)),[chartSettings]);
  useEffect(()=>localStorage.setItem('tc.timeframeFavorites',JSON.stringify(timeframeFavorites)),[timeframeFavorites]);
  useEffect(()=>{
    if(watchlistWidth==null)localStorage.removeItem('tc.watchlistWidth.v2');
    else localStorage.setItem('tc.watchlistWidth.v2',JSON.stringify(Math.round(watchlistWidth)));
  },[watchlistWidth]);
  useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),3200);return()=>clearTimeout(id)},[toast]);
  useEffect(()=>{const id=setTimeout(()=>void market.search(searchText),220);return()=>clearTimeout(id)},[searchText,market.search]);
  useEffect(()=>{
    if(!chartFullscreen)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setChartFullscreen(false)};
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[chartFullscreen]);

  const add=(s:string)=>{const clean=s.toUpperCase();setWatchlist(p=>p.includes(clean)?p:[...p,clean]);setSelected(clean);setSearchOpen(false);setSearchText('')};
  const remove=(s:string)=>setWatchlist(p=>{const n=p.filter(x=>x!==s);if(selected===s&&n[0])setSelected(n[0]);return n});
  const select=(s:string)=>{setSelected(s);setMobileWatch(false)};
  const selectFromDropdown=(s:string)=>{setSelected(s);setSearchOpen(false);setSearchText('')};
  const toggleTimeframeFavorite=(label:string)=>setTimeframeFavorites(current=>current.includes(label)?current.filter(x=>x!==label):[...current,label]);
  const shellStyle={
    '--watchlist-width':watchlistHidden?'0px':watchlistWidth==null?'clamp(280px,20vw,360px)':`${Math.round(watchlistWidth)}px`,
    '--green':chartSettings.upColor,
    '--red':chartSettings.downColor,
  } as CSSProperties;

  return <div className={`app-shell ${watchlistHidden?'watchlist-hidden':''}`} style={shellStyle}>
    <TopBar
      selected={selected}
      watchlist={watchlist}
      mode={market.config.mode}
      hasAlerts={alertState.alerts.some(a=>a.active)}
      user={accountUser}
      searchOpen={searchOpen}
      searchText={searchText}
      results={market.searchResults}
      loading={market.searchLoading}
      onMenu={()=>{setWatchlistHidden(false);setMobileWatch(v=>!v)}}
      onSearchOpen={()=>setSearchOpen(v=>!v)}
      onSearchText={setSearchText}
      onSelect={selectFromDropdown}
      onAdd={add}
      onAlerts={()=>setAlertsOpen(v=>!v)}
      onAccount={()=>setAccountOpen(true)}
    />

    <Watchlist
      symbols={watchlist}
      selected={selected}
      quotes={market.quotes}
      mobileOpen={mobileWatch}
      onSelect={select}
      onRemove={remove}
      onAdd={()=>setSearchOpen(true)}
      onHide={()=>setWatchlistHidden(true)}
      onPanelWidth={setWatchlistWidth}
      onAutoFit={()=>setWatchlistWidth(null)}
    />

    <main className="workspace">
      {watchlistHidden&&<button className="restore-watchlist" title="Show watchlist" onClick={()=>setWatchlistHidden(false)}><PanelLeftOpen size={15}/></button>}
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
        candleSeconds={timeframe.seconds}
        chartSettings={chartSettings}
        indicators={indicators}
        alerts={selectedAlerts}
        volumeMA={volumeMA}
        fitSignal={fitSignal}
        logScale={logScale}
        onAutoFit={()=>setFitSignal(v=>v+1)}
        onToggleLog={()=>setLogScale(v=>!v)}
        onVolumeSettings={openVolumeSettings}
        onChartSettings={openChartSettings}
        fullscreen={chartFullscreen}
        onToggleFullscreen={toggleChartFullscreen}
        retry={()=>void market.loadCandles()}
      />
      <footer><span>{market.config.mode==='live'?'Live Finnhub quotes':'Live quote feed offline'}</span><span>{market.config.chartProvider==='twelvedata'?'Twelve Data charts':'Yahoo real-market charts'} · {watchlist.length} symbols</span></footer>
    </main>

    {accountOpen&&<AccountModal
      user={accountUser}
      accountsAvailable={market.config.accounts}
      syncStatus={syncStatus}
      onClose={()=>setAccountOpen(false)}
      onLogin={signIn}
      onRegister={register}
      onLogout={signOut}
    />}
    {alertsOpen&&<AlertDrawer alerts={alertState.alerts} onClose={()=>setAlertsOpen(false)} onNew={()=>setAlertModal(true)} onDelete={a=>void alertState.remove(a)}/>}
    {alertModal&&<AlertModal symbol={selected} price={quote?.price??0} onClose={()=>setAlertModal(false)} onCreate={async(d,t,n)=>{await alertState.create(d,t,n);toastFn(`Alert created for ${selected}`)}}/>}
    {volumeSettingsOpen&&<VolumeSettingsModal value={volumeMA} onClose={()=>setVolumeSettingsOpen(false)} onApply={setVolumeMA}/>}
    {chartSettingsOpen&&<ChartSettingsModal value={chartSettings} onClose={()=>setChartSettingsOpen(false)} onApply={setChartSettings}/>}
    {toast&&<div className="toast"><Check size={14}/>{toast}</div>}
  </div>;
}
