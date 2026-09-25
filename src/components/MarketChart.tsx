import { useEffect, useRef } from 'react';
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  LineStyle,
  PriceScaleMode,
  createChart,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Candle, IndicatorSettings, PriceAlert, Quote, VolumeMASettings } from '../types';
import { atr, bollinger, ema, macd, rsi, sma, stochastic, vwap } from '../lib/indicators';

type Props = {
  candles: Candle[];
  quote?: Quote;
  indicators: IndicatorSettings;
  alerts: PriceAlert[];
  volumeMA: VolumeMASettings;
  fitSignal: number;
  logScale: boolean;
  onVolumeSettings: () => void;
};

type Point={time:number;value:number};

const asTime = (n: number) => n as UTCTimestamp;
const safeWidth = (el: HTMLElement) => Math.max(320, Math.floor(el.clientWidth || el.getBoundingClientRect().width || 320));
const safeHeight = (el: HTMLElement) => Math.max(260, Math.floor(el.clientHeight || el.getBoundingClientRect().height || 260));

function volumeMovingAverage(candles:Candle[],settings:VolumeMASettings):Point[]{
  const period=Math.max(1,Math.round(settings.length));
  if(candles.length<period)return [];

  if(settings.type==='EMA'){
    const out:Point[]=[];
    const k=2/(period+1);
    let previous=candles.slice(0,period).reduce((sum,c)=>sum+c.volume,0)/period;
    out.push({time:candles[period-1].time,value:previous});
    for(let i=period;i<candles.length;i++){
      previous=candles[i].volume*k+previous*(1-k);
      out.push({time:candles[i].time,value:previous});
    }
    return out;
  }

  const out:Point[]=[];
  let sum=0;
  for(let i=0;i<candles.length;i++){
    sum+=candles[i].volume;
    if(i>=period)sum-=candles[i-period].volume;
    if(i>=period-1)out.push({time:candles[i].time,value:sum/period});
  }
  return out;
}

export default function MarketChart({ candles, quote, indicators, alerts, volumeMA, fitSignal, logScale, onVolumeSettings }: Props) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current || !candles.length) return;
    const el = host.current;

    const chart = createChart(el, {
      width: safeWidth(el),
      height: safeHeight(el),
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
      rightPriceScale: {
        borderColor: '#202938',
        mode: logScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
        autoScale: true,
      },
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
      time: asTime(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })));

    const state=(quote?.marketState||'').toUpperCase();
    const regularSession=state==='REGULAR'||!state;

    if(regularSession&&Number.isFinite(quote?.price)){
      price.createPriceLine({
        price: quote?.price as number,
        color: '#22c58b',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'LIVE',
      });
    }else{
      const closePrice=quote?.regularClose??quote?.price;
      if(Number.isFinite(closePrice)){
        price.createPriceLine({
          price: closePrice as number,
          color: '#aeb9ca',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'CLOSE',
        });
      }

      if(Number.isFinite(quote?.extendedPrice)){
        const session=quote?.extendedSession==='pre'?'PRE':quote?.extendedSession==='post'?'POST':'EXT';
        price.createPriceLine({
          price: quote?.extendedPrice as number,
          color: quote?.extendedSession==='pre'?'#5ec8e5':'#b98cff',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: session,
        });
      }
    }

    let nextPane = 1;
    let volumePaneIndex:number|null=null;

    if (indicators.volume) {
      volumePaneIndex=nextPane++;
      const volume = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      }, volumePaneIndex);

      volume.setData(candles.map(c => ({
        time: asTime(c.time),
        value: c.volume,
        color: c.close >= c.open ? 'rgba(34,197,139,.5)' : 'rgba(244,91,105,.5)',
      })));

      const volumeMAData=volumeMovingAverage(candles,volumeMA);
      if(volumeMAData.length){
        const volumeLine=chart.addSeries(LineSeries,{
          color:volumeMA.color,
          lineWidth:2,
          priceScaleId:'',
          priceLineVisible:false,
          lastValueVisible:false,
        },volumePaneIndex);
        volumeLine.setData(volumeMAData.map(p=>({time:asTime(p.time),value:p.value})));
      }
    }

    const addLine = (data: Point[], color: string, width = 1, pane = 0, style = LineStyle.Solid) => {
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

    const fitAll=()=>{
      chart.timeScale().fitContent();
      chart.priceScale('right').setAutoScale(true);
    };

    fitAll();

    const handleDoubleClick=(param:any)=>{
      if(volumePaneIndex==null||!param?.point)return;
      const panes=chart.panes();
      let top=0;
      for(const pane of panes){
        const height=pane.getHeight();
        if(pane.paneIndex()===volumePaneIndex&&param.point.y>=top&&param.point.y<=top+height){
          onVolumeSettings();
          return;
        }
        top+=height;
      }
    };

    chart.subscribeDblClick(handleDoubleClick);

    const resizeChart = () => {
      chart.applyOptions({ width: safeWidth(el), height: safeHeight(el) });
    };

    const observer = new ResizeObserver(resizeChart);
    observer.observe(el);
    window.addEventListener('orientationchange', resizeChart);
    window.visualViewport?.addEventListener('resize', resizeChart);

    requestAnimationFrame(() => {
      resizeChart();
      fitAll();
    });

    return () => {
      chart.unsubscribeDblClick(handleDoubleClick);
      observer.disconnect();
      window.removeEventListener('orientationchange', resizeChart);
      window.visualViewport?.removeEventListener('resize', resizeChart);
      chart.remove();
    };
  }, [candles, quote, indicators, alerts, volumeMA, fitSignal, logScale, onVolumeSettings]);

  return <div ref={host} className="chart-host" />;
}
