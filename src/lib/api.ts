import type { AuthResponse, CandleResponse, InstrumentMeta, PriceAlert, Quote, SearchResult, UserPreferences } from '../types';

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let message=body;
    try{message=(JSON.parse(body) as {error?:string}).error||body;}catch{}
    throw new Error(message || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  config: () => json<{ mode: 'live' | 'offline'; chartProvider: 'twelvedata' | 'yahoo'; database: boolean; accounts: boolean }>('/api/config'),
  search: (q: string) => json<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`),
  quote: (symbol: string) => json<Quote>(`/api/quote?symbol=${encodeURIComponent(symbol)}`),
  fastQuote: (symbol: string) => json<Quote>(`/api/quote-fast?symbol=${encodeURIComponent(symbol)}`),
  quotes: (symbols: string[]) => json<Quote[]>(`/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`),
  instruments: (symbols:string[]) => json<InstrumentMeta[]>(`/api/instruments?symbols=${encodeURIComponent(symbols.join(','))}`),
  candles: (symbol: string, resolution: string, from: number, to: number) =>
    json<CandleResponse>(`/api/candles?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(resolution)}&from=${from}&to=${to}`),
  alerts: () => json<PriceAlert[]>('/api/alerts'),
  createAlert: (body: { symbol: string; direction: 'above' | 'below'; target: number; note?: string }) =>
    json<PriceAlert>('/api/alerts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  deleteAlert: (id: number) => json<{ ok: boolean }>(`/api/alerts/${id}`, { method: 'DELETE' }),
  me: () => json<AuthResponse>('/api/auth/me'),
  register: (email:string,password:string) => json<AuthResponse>('/api/auth/register',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({email,password}),
  }),
  login: (email:string,password:string) => json<AuthResponse>('/api/auth/login',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({email,password}),
  }),
  logout: () => json<{ok:boolean}>('/api/auth/logout',{method:'POST'}),
  savePreferences: (preferences:UserPreferences) => json<{ok:boolean}>('/api/account/preferences',{
    method:'PUT',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({preferences}),
  }),
};
