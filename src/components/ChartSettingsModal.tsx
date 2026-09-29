import { useEffect, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import StandardColorPicker from './StandardColorPicker';
import { DEFAULT_CHART_SETTINGS } from '../config';
import type { ChartSettings } from '../types';

type Props={
  value:ChartSettings;
  onClose:()=>void;
  onApply:(value:ChartSettings)=>void;
};

export default function ChartSettingsModal({value,onClose,onApply}:Props){
  const [draft,setDraft]=useState<ChartSettings>(value);

  useEffect(()=>setDraft(value),[value]);

  const set=<K extends keyof ChartSettings,>(key:K,value:ChartSettings[K])=>{
    setDraft(current=>({...current,[key]:value}));
  };

  return <div className="modal-bg" onMouseDown={onClose}>
    <div className="modal chart-settings-modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>Chart settings</h2>
          <p>Double-click a candle or right-click the chart to reopen these settings.</p>
        </div>
        <button onClick={onClose}><X size={17}/></button>
      </div>

      <div className="chart-settings-grid">
        <section>
          <label>Bullish candle color</label>
          <StandardColorPicker value={draft.upColor} onChange={color=>set('upColor',color)}/>
        </section>
        <section>
          <label>Bearish candle color</label>
          <StandardColorPicker value={draft.downColor} onChange={color=>set('downColor',color)}/>
        </section>
      </div>

      <label>Chart background</label>
      <StandardColorPicker value={draft.backgroundColor} onChange={color=>set('backgroundColor',color)}/>

      <button type="button" className={`chart-grid-toggle ${draft.gridVisible?'on':''}`} onClick={()=>set('gridVisible',!draft.gridVisible)}>
        <span className="chart-grid-check">{draft.gridVisible&&<Check size={13}/>}</span>
        <span><strong>Show chart grid</strong><small>Toggle horizontal and vertical grid lines</small></span>
      </button>

      {draft.gridVisible&&<>
        <label>Grid color</label>
        <StandardColorPicker value={draft.gridColor} onChange={color=>set('gridColor',color)}/>
      </>}

      <div className="modal-actions chart-settings-actions">
        <button onClick={()=>setDraft(DEFAULT_CHART_SETTINGS)}><RotateCcw size={14}/> Reset</button>
        <button onClick={onClose}>Cancel</button>
        <button className="primary" onClick={()=>{onApply(draft);onClose()}}>Apply</button>
      </div>
    </div>
  </div>;
}
