import { Bell, Check, ChevronDown, LineChart, Star, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { INDICATOR_OPTIONS, TIMEFRAMES } from '../config';
import type { IndicatorSettings, Timeframe } from '../types';

type Props={
  timeframe:Timeframe;
  favorites:string[];
  indicators:IndicatorSettings;
  open:boolean;
  onTimeframe:(v:Timeframe)=>void;
  onToggleFavorite:(label:string)=>void;
  onOpen:()=>void;
  onClose:()=>void;
  onToggle:(k:keyof IndicatorSettings)=>void;
  onAlert:()=>void;
};

export default function ChartToolbar(p:Props){
  const [timeOpen,setTimeOpen]=useState(false);
  const count=Object.values(p.indicators).filter(Boolean).length;

  const favorites=useMemo(
    ()=>TIMEFRAMES.filter(tf=>tf.available&&p.favorites.includes(tf.label)),
    [p.favorites],
  );

  const groups=useMemo(
    ()=>['Seconds','Minutes','Hours','Days','Weeks & Months'].map(group=>({
      group,
      items:TIMEFRAMES.filter(tf=>tf.group===group),
    })),
    [],
  );

  const choose=(tf:Timeframe)=>{
    if(!tf.available)return;
    p.onTimeframe(tf);
    setTimeOpen(false);
  };

  return <section className="toolbar">
    <div className="timeframe-picker">
      <button className="timeframe-trigger" onClick={()=>setTimeOpen(v=>!v)}>
        <span>{p.timeframe.label}</span><ChevronDown size={13}/>
      </button>

      {timeOpen&&<div className="float timeframe-menu">
        <div className="timeframe-menu-head">
          <strong>Time interval</strong>
          <button onClick={()=>setTimeOpen(false)}><X size={15}/></button>
        </div>

        <div className="timeframe-menu-scroll">
          {groups.map(({group,items})=><div className="timeframe-group" key={group}>
            <span className="timeframe-group-title">{group}</span>
            {items.map(tf=>{
              const favorite=p.favorites.includes(tf.label);
              return <div className={`timeframe-option ${!tf.available?'disabled':''}`} key={tf.label} title={tf.note}>
                <button className="timeframe-select" disabled={!tf.available} onClick={()=>choose(tf)}>
                  <strong>{tf.label}</strong>
                  <small>{tf.available?'Real market candles':tf.note}</small>
                </button>
                <button className={`timeframe-star ${favorite?'favorite':''}`} disabled={!tf.available} aria-label={favorite?'Remove favorite':'Add favorite'} onClick={()=>p.onToggleFavorite(tf.label)}>
                  <Star size={14} fill={favorite?'currentColor':'none'}/>
                </button>
              </div>;
            })}
          </div>)}
        </div>
      </div>}
    </div>

    <div className="toolbar-scroll">
      <div className="favorite-timeframes">
        {favorites.map(tf=><button key={tf.label} className={p.timeframe.label===tf.label?'active':''} onClick={()=>p.onTimeframe(tf)}>{tf.label}</button>)}
      </div>

      <div className="divider"/>
      <button className={`tool ${p.open?'active':''}`} onClick={p.onOpen}><LineChart size={15}/> Indicators <b>{count}</b></button>
      <button className="tool" onClick={p.onAlert}><Bell size={15}/> Alert</button>
    </div>

    {p.open&&<div className="float indicator-panel">
      <div className="float-title"><strong>Indicators</strong><button onClick={p.onClose}><X size={16}/></button></div>
      <div className="indicator-list">{INDICATOR_OPTIONS.map(([key,title,desc])=><button key={key} onClick={()=>p.onToggle(key)}><span className={p.indicators[key]?'check on':'check'}>{p.indicators[key]&&<Check size={12}/>}</span><span><strong>{title}</strong><small>{desc}</small></span></button>)}</div>
    </div>}
  </section>;
}
