import { Bell, Check, LineChart, X } from 'lucide-react';
import { INDICATOR_OPTIONS, TIMEFRAMES } from '../config';
import type { IndicatorSettings, Timeframe } from '../types';

type Props={
  timeframe:Timeframe;
  indicators:IndicatorSettings;
  open:boolean;
  logScale:boolean;
  onTimeframe:(v:Timeframe)=>void;
  onOpen:()=>void;
  onClose:()=>void;
  onToggle:(k:keyof IndicatorSettings)=>void;
  onAlert:()=>void;
  onAutoFit:()=>void;
  onToggleLog:()=>void;
};

export default function ChartToolbar(p:Props){
  const count=Object.values(p.indicators).filter(Boolean).length;
  return <section className="toolbar">
    <div className="timeframes">{TIMEFRAMES.map(tf=><button key={tf.label} className={p.timeframe.label===tf.label?'active':''} onClick={()=>p.onTimeframe(tf)}>{tf.label}</button>)}</div>
    <div className="divider"/>
    <button className="tool chart-key" title="Auto fit all visible chart data" onClick={p.onAutoFit}><b>A</b><span>Fit</span></button>
    <button className={`tool chart-key ${p.logScale?'active':''}`} title="Toggle logarithmic price scale" onClick={p.onToggleLog}><b>L</b><span>Log</span></button>
    <div className="divider"/>
    <button className={`tool ${p.open?'active':''}`} onClick={p.onOpen}><LineChart size={15}/> Indicators <b>{count}</b></button>
    <button className="tool" onClick={p.onAlert}><Bell size={15}/> Alert</button>
    {p.open&&<div className="float indicator-panel">
      <div className="float-title"><strong>Indicators</strong><button onClick={p.onClose}><X size={16}/></button></div>
      <div className="indicator-list">{INDICATOR_OPTIONS.map(([key,title,desc])=><button key={key} onClick={()=>p.onToggle(key)}><span className={p.indicators[key]?'check on':'check'}>{p.indicators[key]&&<Check size={12}/>}</span><span><strong>{title}</strong><small>{desc}</small></span></button>)}</div>
    </div>}
  </section>;
}
