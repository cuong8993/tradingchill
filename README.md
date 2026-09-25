# TradingChill

A modern TradingView-style personal market dashboard built for **Cloudflare Workers + GitHub**.

## Included in v0.1

- Modern responsive dark trading workspace
- Watchlist with **no artificial symbol cap**
- Quote refreshes split into safe batches of 25 symbols
- Symbol search
- Live quotes and candles, or built-in demo data with no API key
- Interactive candlestick charts using TradingView Lightweight Charts(TM)
- Timeframes: 1m, 5m, 15m, 1H, 1D, 1W
- **No active-indicator cap**: enable any combination simultaneously
- EMA 9 / 20 / 50
- SMA 10 / 20 / 50 / 200
- Bollinger Bands 20 / 2 sigma
- VWAP
- RSI 14
- MACD 12 / 26 / 9
- Stochastic 14
- ATR 14
- Volume
- Multiple resizable indicator panes
- Price alerts: crosses above / crosses below
- Local alerts before D1 is configured
- Cloud alerts stored in D1 and checked every minute by a Worker Cron Trigger
- Responsive phone/tablet layout
- Finnhub provider adapter behind the Worker, so the API key is not shipped to the browser

> TradingChill is an independent project inspired by professional charting workflows. It does not copy TradingView branding or proprietary code. Lightweight Charts attribution remains in the UI.

## Install

```bash
npm install
npm run dev
```

Without a market-data secret, the app runs in **Demo Data** mode.

## Live market data

Add a Finnhub API key:

```bash
npx wrangler secret put FINNHUB_API_KEY
```

## Cloud alerts with D1

```bash
npx wrangler d1 create tradingchill
```

Add the returned D1 database ID to `wrangler.jsonc`, then run:

```bash
npx wrangler d1 migrations apply tradingchill --remote
```

## Deploy

```bash
npm run deploy
```

## Watchlist scaling

There is no artificial client-side watchlist maximum. The browser divides the watchlist into 25-symbol batches and the Worker accepts up to 50 quote symbols per request. Practical refresh capacity still depends on the limits of the connected market-data provider.

## Indicators

Indicators are independent toggles. You can display several price overlays and several lower panes at the same time. There is no two-indicator restriction.
