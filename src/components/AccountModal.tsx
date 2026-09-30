import { useEffect, useState } from 'react';
import { Cloud, LogIn, LogOut, UserPlus, X } from 'lucide-react';
import type { AccountUser } from '../types';

type Props={
  user:AccountUser|null;
  accountsAvailable:boolean;
  syncStatus:'idle'|'saving'|'saved'|'error';
  onClose:()=>void;
  onLogin:(email:string,password:string)=>Promise<void>;
  onRegister:(email:string,password:string)=>Promise<void>;
  onLogout:()=>Promise<void>;
};

export default function AccountModal({user,accountsAvailable,syncStatus,onClose,onLogin,onRegister,onLogout}:Props){
  const [mode,setMode]=useState<'login'|'register'>('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{setError('');setPassword('')},[mode,user]);

  const submit=async()=>{
    if(busy)return;
    setBusy(true);
    setError('');
    try{
      if(mode==='register')await onRegister(email,password);
      else await onLogin(email,password);
    }catch(e){
      setError(e instanceof Error?e.message:'Account request failed.');
    }finally{
      setBusy(false);
    }
  };

  const logout=async()=>{
    setBusy(true);
    setError('');
    try{await onLogout();}
    catch(e){setError(e instanceof Error?e.message:'Could not sign out.');}
    finally{setBusy(false);}
  };

  return <div className="modal-bg" onMouseDown={onClose}>
    <div className="modal account-modal" onMouseDown={e=>e.stopPropagation()}>
      <div className="modal-head">
        <div>
          <h2>{user?'TradingChill account':mode==='register'?'Create account':'Sign in'}</h2>
          <p>{user?'Your watchlist and settings sync to this account.':'Save your TradingChill setup and restore it on another device.'}</p>
        </div>
        <button onClick={onClose}><X size={17}/></button>
      </div>

      {!accountsAvailable&&<div className="account-error">Account storage is not available because D1 is not connected.</div>}

      {user?<>
        <div className="account-card">
          <span className="account-avatar">{user.email.slice(0,1).toUpperCase()}</span>
          <div><strong>{user.email}</strong><small><Cloud size={12}/>{syncStatus==='saving'?'Saving...':syncStatus==='error'?'Sync problem':'Synced to cloud'}</small></div>
        </div>
        {error&&<div className="account-error">{error}</div>}
        <div className="account-actions">
          <button onClick={onClose}>Close</button>
          <button className="danger" disabled={busy} onClick={logout}><LogOut size={14}/> Sign out</button>
        </div>
      </>:<>
        <div className="account-tabs">
          <button className={mode==='login'?'active':''} onClick={()=>setMode('login')}>Sign in</button>
          <button className={mode==='register'?'active':''} onClick={()=>setMode('register')}>Create account</button>
        </div>

        <label>Email</label>
        <input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/>

        <label>Password</label>
        <input
          type="password"
          autoComplete={mode==='register'?'new-password':'current-password'}
          value={password}
          onChange={e=>setPassword(e.target.value)}
          placeholder={mode==='register'?'At least 10 characters':'Your password'}
          onKeyDown={e=>{if(e.key==='Enter')void submit()}}
        />

        {mode==='register'&&<p className="account-hint">Your current watchlist and chart settings will be saved to the new account.</p>}
        {error&&<div className="account-error">{error}</div>}

        <button className="account-primary" disabled={busy||!accountsAvailable} onClick={()=>void submit()}>
          {mode==='register'?<UserPlus size={15}/>:<LogIn size={15}/>}
          {busy?'Please wait...':mode==='register'?'Create account':'Sign in'}
        </button>
      </>}
    </div>
  </div>;
}
