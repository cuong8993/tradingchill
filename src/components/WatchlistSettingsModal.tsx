import { RotateCcw, X } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { DEFAULT_WATCHLIST_SETTINGS } from '../config';
import type { WatchlistSettings } from '../types';

type Props={
  value:WatchlistSettings;
  onClose:()=>void;
  onApply:(value:WatchlistSettings)=>void;
};

function clamp(value:number,min:number,max:number){
  return Math.max(min,Math.min(max,value));
}

function validHex(value:string,fallback:string){
  const normalized=value.trim();
  return /^#[0-9a-f]{6}$/i.test(normalized)?normalized.toLowerCase():fallback;
}

export default function WatchlistSettingsModal({value,onClose,onApply}:Props){
  const [draft,setDraft]=useState<WatchlistSettings>(value);

  useEffect(()=>setDraft(value),[value]);

  const setNumber=(key:'rowHeight'|'logoSize'|'fontSize',value:number,min:number,max:number)=>{
    setDraft(current=>({...current,[key]:clamp(value,min,max)}));
  };

  const setColor=(key:'upColor'|'downColor',value:string)=>{
    setDraft(current=>({...current,[key]:value}));
  };

  const apply=()=>{
    onApply({
      ...draft,
      upColor:validHex(draft.upColor,DEFAULT_WATCHLIST_SETTINGS.upColor),
      downColor:validHex(draft.downColor,DEFAULT_WATCHLIST_SETTINGS.downColor),
      rowHeight:clamp(Number(draft.rowHeight)||DEFAULT_WATCHLIST_SETTINGS.rowHeight,30,52),
      logoSize:clamp(Number(draft.logoSize)||DEFAULT_WATCHLIST_SETTINGS.logoSize,16,32),
      fontSize:clamp(Number(draft.fontSize)||DEFAULT_WATCHLIST_SETTINGS.fontSize,10,16),
    });
    onClose();
  };

  return <div className="modal-bg" onMouseDown={onClose}>
    <div className="modal watchlist-settings-modal" onMouseDown={event=>event.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>Watchlist settings</h2>
          <p>Customize colors, density, logos and text independently from the chart.</p>
        </div>
        <button onClick={onClose}><X size={17}/></button>
      </div>

      <div className="watch-setting-colors">
        <label>
          <span>Positive color</span>
          <div className="watch-color-row">
            <input type="color" value={validHex(draft.upColor,DEFAULT_WATCHLIST_SETTINGS.upColor)} onChange={e=>setColor('upColor',e.target.value)}/>
            <input value={draft.upColor} onChange={e=>setColor('upColor',e.target.value)} spellCheck={false}/>
          </div>
        </label>
        <label>
          <span>Negative color</span>
          <div className="watch-color-row">
            <input type="color" value={validHex(draft.downColor,DEFAULT_WATCHLIST_SETTINGS.downColor)} onChange={e=>setColor('downColor',e.target.value)}/>
            <input value={draft.downColor} onChange={e=>setColor('downColor',e.target.value)} spellCheck={false}/>
          </div>
        </label>
      </div>

      <label className="watch-setting-range">
        <span><b>Row height</b><strong>{draft.rowHeight}px</strong></span>
        <input type="range" min="30" max="52" step="1" value={draft.rowHeight} onChange={e=>setNumber('rowHeight',Number(e.target.value),30,52)}/>
      </label>

      <label className="watch-setting-range">
        <span><b>Logo size</b><strong>{draft.logoSize}px</strong></span>
        <input type="range" min="16" max="32" step="1" value={draft.logoSize} onChange={e=>setNumber('logoSize',Number(e.target.value),16,32)}/>
      </label>

      <label className="watch-setting-range">
        <span><b>Text size</b><strong>{draft.fontSize}px</strong></span>
        <input type="range" min="10" max="16" step=".5" value={draft.fontSize} onChange={e=>setNumber('fontSize',Number(e.target.value),10,16)}/>
      </label>

      <div className="watch-settings-preview" style={{
        '--preview-up':validHex(draft.upColor,DEFAULT_WATCHLIST_SETTINGS.upColor),
        '--preview-down':validHex(draft.downColor,DEFAULT_WATCHLIST_SETTINGS.downColor),
        '--preview-height':`${draft.rowHeight}px`,
        '--preview-logo':`${draft.logoSize}px`,
        '--preview-font':`${draft.fontSize}px`,
      } as CSSProperties}>
        <span className="preview-logo">A</span>
        <b>AAPL</b>
        <span>329.40</span>
        <span className="preview-down">-0.82%</span>
        <span className="preview-up">1.24%</span>
      </div>

      <div className="modal-actions watch-settings-actions">
        <button onClick={()=>setDraft(DEFAULT_WATCHLIST_SETTINGS)}><RotateCcw size={14}/> Reset</button>
        <button onClick={onClose}>Cancel</button>
        <button className="primary" onClick={apply}>Apply</button>
      </div>
    </div>
  </div>;
}
