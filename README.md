# TradingChill

TradingChill is a modern market dashboard built with React, Cloudflare Workers, and TradingView Lightweight Charts(TM).

## Market data policy

TradingChill uses **real market data only**. There is no demo quote generator and no synthetic/demo candle fallback.

- **Finnhub** provides live quotes and symbol search.
- **Yahoo Finance chart data** provides real OHLCV candles without requiring a second API key.
- If `TWELVEDATA_API_KEY` is configured, Twelve Data is preferred for chart candles.
- The live Finnhub quote is drawn on the chart as a separate `LIVE` price line.

If a real data provider is unavailable, TradingChill shows an error instead of inventing market data.

## Features

- Responsive desktop/mobile trading workspace
- Watchlist with no artificial client-side symbol cap
- Quote requests batched for large watchlists
- Watchlist ticker dropdown and symbol search
- Real candlestick charts
- Timeframes: 1m, 5m, 15m, 1H, 1D, 1W
- Multiple indicators enabled simultaneously
- EMA 9 / 20 / 50
- SMA 10 / 20 / 50 / 200
- Bollinger Bands 20 / 2 sigma
- VWAP
- RSI 14
- MACD 12 / 26 / 9
- Stochastic 14
- ATR 14
- Volume
- Resizable indicator panes
- Price alerts
- D1-backed cloud alert storage and scheduled checks

## Required live quote secret

Add a Finnhub API key to Cloudflare:

```bash
npx wrangler secret put FINNHUB_API_KEY
```

In the Cloudflare dashboard this is:

`Workers & Pages -> tradingchill -> Settings -> Variables and Secrets`

Create a **Secret** named exactly:

```text
FINNHUB_API_KEY
```

## Optional chart provider

No second key is required for real candle charts because TradingChill can use Yahoo Finance chart data.

If you want Twelve Data instead, add:

```text
TWELVEDATA_API_KEY
```

When that secret exists, Twelve Data is preferred automatically.

## Deploy

```bash
npm install
npm run build
npm run deploy
```

Git-connected Cloudflare deployments will rebuild automatically after commits to `main`.

## Cloud alerts

The Worker has a D1 binding named `DB` and initializes its alert tables automatically.

## Notes

TradingChill is an independent project. TradingView Lightweight Charts attribution remains visible in the application as required by the library notice.
