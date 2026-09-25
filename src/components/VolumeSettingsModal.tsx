import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { VolumeMASettings } from '../types';

type Props={
  value:VolumeMASettings;
  onClose:()=>void;
  onApply:(value:VolumeMASettings)=>void;
};

export default function VolumeSettingsModal({value,onClose,onApply}:Props){
  const [type,setType]=useState<VolumeMASettings['type']>(value.type);
  const [length,setLength]=useState(String(value.length));
  const [color,setColor]=useState(value.color);

  useEffect(()=>{
    setType(value.type);
    setLength(String(value.length));
    setColor(value.color);
  },[value]);

  const apply=()=>{
    const parsed=Math.max(1,Math.min(500,Math.round(Number(length)||20)));
    onApply({type,length:parsed,color});
    onClose();
  };

  return <div className="modal-bg" onMouseDown={onClose}>
    <div className="modal volume-settings-modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>Volume MA settings</h2>
          <p>Double-click the Volume pane anytime to reopen these settings.</p>
        </div>
        <button onClick={onClose}><X size={17}/></button>
      </div>

      <label>MA type</label>
      <select value={type} onChange={e=>setType(e.target.value as VolumeMASettings['type'])}>
        <option value="SMA">SMA</option>
        <option value="EMA">EMA</option>
      </select>

      <label>MA length</label>
      <input type="number" min="1" max="500" step="1" value={length} onChange={e=>setLength(e.target.value)}/>

      <label>MA line color</label>
      <div className="color-field">
        <input type="color" value={color} onChange={e=>setColor(e.target.value)}/>
        <input value={color} onChange={e=>setColor(e.target.value)} maxLength={7}/>
      </div>

      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="primary" onClick={apply}>Apply</button>
      </div>
    </div>
  </div>;
}
