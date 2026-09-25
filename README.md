# MarketView

A modern TradingView-style personal market dashboard built for **Cloudflare Workers + GitHub**.

## Included in v0.1

- Modern responsive dark trading workspace
- Watchlist with **no artificial symbol cap** (quotes refresh in safe batches)
- Symbol search
- Live quote polling (or built-in demo market data with no API key)
- Interactive candlestick charts using TradingView Lightweight Charts™
- Timeframes: 1m, 5m, 15m, 1H, 1D, 1W
- Multiple indicators can be enabled simultaneously with no active-indicator cap
- Indicators: EMA 9/20/50, SMA 10/20/50/200, Bollinger Bands, VWAP, RSI 14, MACD, Stochastic 14, ATR 14, Volume
- Multiple resizable indicator panes
- Price alerts: above / below target
- Local alerts before D1 is configured
- Cloud alerts stored in D1 and evaluated every minute by a Worker Cron Trigger
- Browser notification support while the app/browser can receive notifications
- Responsive phone/tablet layout
- Finnhub provider adapter hidden behind the Worker so the API key never ships to the browser

> This is an independent project inspired by professional charting workflows. It is not a copy of TradingView branding or proprietary code. Lightweight Charts™ attribution remains visible in the UI as required by its license/NOTICE.

## Install

```bash
npm install
npm run dev
```

Without any secret the app runs in **Demo Data** mode.

## Live market data

Add a Finnhub API key to Cloudflare:

```bash
npx wrangler secret put FINNHUB_API_KEY
```

## Cloud alerts with D1

```bash
npx wrangler d1 create marketview
npx wrangler d1 migrations apply marketview --remote
```

Add the returned D1 database id to `wrangler.jsonc`.

## Deploy

```bash
npm run deploy
```

## Watchlist behavior

There is no artificial client-side watchlist limit. Quotes refresh in batches of 25 symbols so larger lists remain practical without creating oversized API requests. Actual refresh capacity still depends on the connected market-data provider and its rate limits.

## Indicators

You can enable any combination of indicators at the same time:

- EMA 9, EMA 20, EMA 50
- SMA 10, SMA 20, SMA 50, SMA 200
- Bollinger Bands 20 / 2σ
- VWAP
- RSI 14
- MACD 12 / 26 / 9
- Stochastic 14
- ATR 14
- Volume
