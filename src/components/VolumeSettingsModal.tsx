import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import StandardColorPicker from './StandardColorPicker';
import type { VolumeMASettings } from '../types';

type Props={
  value:VolumeMASettings;
  onClose:()=>void;
  onApply:(value:VolumeMASettings)=>void;
};

export default function VolumeSettingsModal({value,onClose,onApply}:Props){
  const [enabled,setEnabled]=useState(value.enabled);
  const [type,setType]=useState<VolumeMASettings['type']>(value.type);
  const [length,setLength]=useState(String(value.length));
  const [color,setColor]=useState(value.color);

  useEffect(()=>{
    setEnabled(value.enabled);
    setType(value.type);
    setLength(String(value.length));
    setColor(value.color);
  },[value]);

  const apply=()=>{
    const parsed=Math.max(1,Math.min(500,Math.round(Number(length)||20)));
    onApply({enabled,type,length:parsed,color});
    onClose();
  };

  const toggleEnabled=()=>setEnabled(v=>!v);

  return <div className="modal-bg" onMouseDown={onClose}>
    <div className="modal volume-settings-modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>Volume MA settings</h2>
          <p>Double-click the Volume pane anytime to reopen these settings.</p>
        </div>
        <button onClick={onClose}><X size={17}/></button>
      </div>

      <button type="button" className={`ma-enable-row ${enabled?'on':''}`} onClick={toggleEnabled}>
        <span className="ma-enable-check">{enabled&&<Check size={13}/>}</span>
        <span><strong>Show Volume MA</strong><small>Turn the MA line on or off with one click</small></span>
      </button>

      <label>MA type</label>
      <select disabled={!enabled} value={type} onChange={e=>setType(e.target.value as VolumeMASettings['type'])}>
        <option value="SMA">SMA</option>
        <option value="EMA">EMA</option>
      </select>

      <label>MA length</label>
      <input disabled={!enabled} type="number" min="1" max="500" step="1" value={length} onChange={e=>setLength(e.target.value)}/>

      <label>MA line color</label>
      <StandardColorPicker value={color} onChange={setColor}/>

      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="primary" onClick={apply}>Apply</button>
      </div>
    </div>
  </div>;
}
