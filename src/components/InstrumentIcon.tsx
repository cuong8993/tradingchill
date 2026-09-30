import { useEffect, useState } from 'react';
import type { InstrumentMeta } from '../types';

export default function InstrumentIcon({
  symbol,
  instrument,
  className='instrument-icon',
}:{
  symbol:string;
  instrument?:InstrumentMeta;
  className?:string;
}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[instrument?.logo]);

  const fallback=instrument?.mark||instrument?.displaySymbol?.slice(0,1)||symbol.slice(0,1);
  return <span className={className} aria-hidden="true">
    {instrument?.logo&&!failed
      ?<img src={instrument.logo} alt="" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>
      :<b>{fallback}</b>}
  </span>;
}
