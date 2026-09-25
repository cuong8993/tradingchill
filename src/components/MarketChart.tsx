import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle, IndicatorSettings, PriceAlert } from '../types';
import { atr, bollinger, ema, macd, rsi, sma, stochastic, vwap } from '../lib/indicators';

type Props = {
  candles: Candle[];
  indicators: IndicatorSettings;
  alerts: PriceAlert[];
};

const asTime = (n: number) => n as UTCTimestamp;

export default function MarketChart({ candles, indicators, alerts }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current || !candles.length) return;
    const el = host.current;
    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0c111b' },
        textColor: '#8f9bad',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        attributionLogo: true,
        panes: {
          separatorColor: '#1b2331',
          separatorHoverColor: '#2a3548',
          enableResize: true,
        },
      },
      grid: {
        vertLines: { color: '#151c28' },
        horzLines: { color: '#151c28' },
      },
      crosshair: {
        vertLine: { color: '#5d6b82', labelBackgroundColor: '#273247' },
        horzLine: { color: '#5d6b82', labelBackgroundColor: '#273247' },
      },
      rightPriceScale: { borderColor: '#202938' },
      timeScale: { borderColor: '#202938', timeVisible: true, secondsVisible: false },
    });

    const price = chart.addSeries(CandlestickSeries, {
      upColor: '#22c58b',
      downColor: '#f45b69',
      borderUpColor: '#22c58b',
      borderDownColor: '#f45b69',
      wickUpColor: '#22c58b',
      wickDownColor: '#f45b69',
      priceLineVisible: true,
      lastValueVisible: true,
    });
    price.setData(candles.map(c => ({
      time: asTime(c.time), open: c.open, high: c.high, low: c.low, close: c.close,
    })));

    let nextPane = 1;

    if (indicators.volume) {
      const volume = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      }, nextPane++);
      volume.setData(candles.map(c => ({
        time: asTime(c.time),
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34,197,139,.5)' : 'rgba(244,91,105,.5)',
      })));
    }

    const addLine = (data: { time: number; value: number }[], color: string, width = 1, pane = 0, style = LineStyle.Solid) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: width as 1 | 2 | 3 | 4,
        lineStyle: style,
        priceLineVisible: false,
        lastValueVisible: false,
      }, pane);
      series.setData(data.map(p => ({ time: asTime(p.time), value: p.value })));
      return series;
    };

    if (indicators.sma10) addLine(sma(candles, 10), '#ff9f43', 2);
    if (indicators.sma20) addLine(sma(candles, 20), '#f6c85f', 2);
    if (indicators.sma50) addLine(sma(candles, 50), '#7a8cff', 2);
    if (indicators.sma200) addLine(sma(candles, 200), '#e76f51', 2);
    if (indicators.ema9) addLine(ema(candles, 9), '#55d6be', 2);
    if (indicators.ema20) addLine(ema(candles, 20), '#b46cff', 2);
    if (indicators.ema50) addLine(ema(candles, 50), '#5ec8e5', 2);
    if (indicators.vwap) addLine(vwap(candles), '#f78c6c', 2);

    if (indicators.bollinger20) {
      const b = bollinger(candles, 20, 2);
      addLine(b.middle, '#7a8cff', 1, 0, LineStyle.Dashed);
      addLine(b.upper, '#5ec8e5', 1);
      addLine(b.lower, '#5ec8e5', 1);
    }

    if (indicators.rsi14) {
      const r = addLine(rsi(candles, 14), '#d896ff', 2, nextPane++);
      r.createPriceLine({ price: 70, color: '#6b7280', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '70' });
      r.createPriceLine({ price: 30, color: '#6b7280', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '30' });
    }

    if (indicators.macd) {
      const pane = nextPane++;
      const m = macd(candles);
      addLine(m.line, '#5ec8e5', 2, pane);
      addLine(m.signal, '#f6c85f', 2, pane);
      const hist = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane);
      hist.setData(m.histogram.map(p => ({
        time: asTime(p.time),
        value: p.value,
        color: p.value >= 0 ? 'rgba(34,197,139,.65)' : 'rgba(244,91,105,.65)',
      })));
    }

    if (indicators.stochastic14) {
      const pane = nextPane++;
      const s = stochastic(candles, 14, 3);
      const k = addLine(s.k, '#55d6be', 2, pane);
      addLine(s.d, '#f6c85f', 2, pane);
      k.createPriceLine({ price: 80, color: '#6b7280', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '80' });
      k.createPriceLine({ price: 20, color: '#6b7280', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '20' });
    }

    if (indicators.atr14) {
      addLine(atr(candles, 14), '#ff9f43', 2, nextPane++);
    }

    alerts.filter(a => a.active).forEach(a => {
      price.createPriceLine({
        price: a.target,
        color: a.direction === 'above' ? '#f6c85f' : '#d896ff',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${a.direction === 'above' ? '↑' : '↓'} Alert`,
      });
    });

    chart.timeScale().fitContent();
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) chart.applyOptions({ width: rect.width, height: rect.height });
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [candles, indicators, alerts]);

  return <div ref={host} className="chart-host" />;
}
