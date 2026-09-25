import type { Candle, PriceAlert, Quote, SearchResult } from '../types';

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  config: () => json<{ mode: 'live' | 'demo'; database: boolean }>('/api/config'),
  search: (q: string) => json<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`),
  quote: (symbol: string) => json<Quote>(`/api/quote?symbol=${encodeURIComponent(symbol)}`),
  quotes: (symbols: string[]) => json<Quote[]>(`/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`),
  candles: (symbol: string, resolution: string, from: number, to: number) =>
    json<Candle[]>(`/api/candles?symbol=${encodeURIComponent(symbol)}&resolution=${encodeURIComponent(resolution)}&from=${from}&to=${to}`),
  alerts: () => json<PriceAlert[]>('/api/alerts'),
  createAlert: (body: { symbol: string; direction: 'above' | 'below'; target: number; note?: string }) =>
    json<PriceAlert>('/api/alerts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  deleteAlert: (id: number) => json<{ ok: boolean }>(`/api/alerts/${id}`, { method: 'DELETE' }),
};
