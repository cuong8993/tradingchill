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
import type { Candle, ChartSettings, IndicatorSettings, PriceAlert, Quote, VolumeMASettings } from '../types';
import { atr, bollinger, ema, macd, rsi, sma, stochastic, vwap } from '../lib/indicators';

type Props = {
  candles: Candle[];
  quote?: Quote;
  candleSeconds: number;
  chartSettings: ChartSettings;
  indicators: IndicatorSettings;
  alerts: PriceAlert[];
  volumeMA: VolumeMASettings;
  fitSignal: number;
  logScale: boolean;
  onVolumeSettings: () => void;
  onChartSettings: () => void;
  onFullscreen: () => void;
};

type Point={time:number;value:number};

const asTime = (n: number) => n as UTCTimestamp;
const safeWidth = (el: HTMLElement) => {
  const measured=Math.floor(el.clientWidth || el.getBoundingClientRect().width || 0);
  return measured>0?Math.max(280,measured):320;
};
const safeHeight = (el: HTMLElement) => {
  const measured=Math.floor(el.clientHeight || el.getBoundingClientRect().height || 0);
  return measured>0?Math.max(120,measured):260;
};
const withAlpha=(color:string,alpha:string)=>{
  const hex=color.trim();
  return /^#[0-9a-f]{6}$/i.test(hex)?`${hex}${alpha}`:hex;
};

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

function addQuoteLines(price:any,quote?:Quote){
  const lines:any[]=[];
  if(!quote)return lines;

  const state=(quote.marketState||'').toUpperCase();
  const add=(value:number|undefined|null,title:string,color:string,width:1|2=1)=>{
    if(!Number.isFinite(value))return;
    lines.push(price.createPriceLine({
      price:value as number,
      color,
      lineWidth:width,
      lineStyle:LineStyle.Dashed,
      axisLabelVisible:true,
      title,
    }));
  };

  if(state==='REGULAR'){
    return lines;
  }else if(state==='PRE'||state.includes('POST')||state==='CLOSED'){
    add(quote.regularClose??quote.price,'CLOSE','#aeb9ca');
    if(quote.extendedSession==='pre')add(quote.extendedPrice,'PRE','#5ec8e5',2);
    if(quote.extendedSession==='post')add(quote.extendedPrice,'POST','#b98cff',2);
  }else{
    add(quote.price,'LAST','#aeb9ca');
    if(quote.extendedSession==='pre')add(quote.extendedPrice,'PRE','#5ec8e5',2);
    if(quote.extendedSession==='post')add(quote.extendedPrice,'POST','#b98cff',2);
  }

  return lines;
}

export default function MarketChart({ candles, quote, candleSeconds, chartSettings, indicators, alerts, volumeMA, fitSignal, logScale, onVolumeSettings, onChartSettings, onFullscreen }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const chartRef=useRef<ReturnType<typeof createChart>|null>(null);
  const priceRef=useRef<any>(null);
  const quoteLinesRef=useRef<any[]>([]);
  const quoteRef=useRef<Quote|undefined>(quote);
  quoteRef.current=quote;

  useEffect(() => {
    if (!host.current || !candles.length) return;
    const el = host.current;

    const chart = createChart(el, {
      width: safeWidth(el),
      height: safeHeight(el),
      layout: {
        background: { type: ColorType.Solid, color: chartSettings.backgroundColor },
        textColor: '#8f9bad',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        attributionLogo: false,
        panes: {
          separatorColor: '#1b2331',
          separatorHoverColor: '#2a3548',
          enableResize: true,
        },
      },
      grid: {
        vertLines: { color: chartSettings.gridColor, visible: chartSettings.gridVisible },
        horzLines: { color: chartSettings.gridColor, visible: chartSettings.gridVisible },
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
      upColor: chartSettings.upColor,
      downColor: chartSettings.downColor,
      borderUpColor: chartSettings.upColor,
      borderDownColor: chartSettings.downColor,
      wickUpColor: chartSettings.upColor,
      wickDownColor: chartSettings.downColor,
      priceLineVisible: true,
      lastValueVisible: true,
    });

    chartRef.current=chart;
    priceRef.current=price;

    price.setData(candles.map(c => ({
      time: asTime(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })));

    quoteLinesRef.current=addQuoteLines(price,quoteRef.current);

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
        color: c.close >= c.open ? withAlpha(chartSettings.upColor,'80') : withAlpha(chartSettings.downColor,'80'),
      })));

      const volumeMAData=volumeMovingAverage(candles,volumeMA);
      if(volumeMA.enabled&&volumeMAData.length){
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

    const isCandleHit=(param:any)=>{
      if(!param?.point)return false;
      const data=param?.seriesData?.get?.(price);
      if(!data||data.open==null||data.high==null||data.low==null||data.close==null)return false;

      const candleX=chart.timeScale().timeToCoordinate(data.time);
      const highY=price.priceToCoordinate(data.high);
      const lowY=price.priceToCoordinate(data.low);
      if(candleX==null||highY==null||lowY==null)return false;

      const spacing=Number((chart.timeScale().options() as any).barSpacing)||6;
      const halfWidth=Math.max(5,Math.min(12,spacing*.6));
      const top=Math.min(highY,lowY)-5;
      const bottom=Math.max(highY,lowY)+5;

      return Math.abs(param.point.x-candleX)<=halfWidth&&param.point.y>=top&&param.point.y<=bottom;
    };

    const handleDoubleClick=(param:any)=>{
      if(!param?.point)return;

      if(volumePaneIndex!=null){
        if(typeof param?.paneIndex==='number'&&param.paneIndex===volumePaneIndex){
          onVolumeSettings();
          return;
        }

        if(typeof param?.paneIndex!=='number'){
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
        }
      }

      if(isCandleHit(param)){
        onChartSettings();
        return;
      }

      onFullscreen();
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
      chartRef.current=null;
      priceRef.current=null;
      quoteLinesRef.current=[];
      chart.remove();
    };
  }, [candles, chartSettings, indicators, alerts, volumeMA, logScale, onVolumeSettings, onChartSettings, onFullscreen]);

  useEffect(()=>{
    const price=priceRef.current;
    if(!price)return;

    for(const line of quoteLinesRef.current){
      try{price.removePriceLine(line);}catch{}
    }
    quoteLinesRef.current=addQuoteLines(price,quote);
  },[quote?.price,quote?.regularClose,quote?.extendedPrice,quote?.extendedSession,quote?.marketState]);

  useEffect(()=>{
    const price=priceRef.current;
    if(!price||!quote||!candles.length||!Number.isFinite(quote.price))return;
    if((quote.marketState||'').toUpperCase()!=='REGULAR')return;

    const last=candles[candles.length-1];
    const timestamp=quote.timestamp||Math.floor(Date.now()/1000);
    if(timestamp<last.time||timestamp>=last.time+Math.max(1,candleSeconds))return;

    price.update({
      time:asTime(last.time),
      open:last.open,
      high:Math.max(last.high,quote.price),
      low:Math.min(last.low,quote.price),
      close:quote.price,
    });
  },[quote?.price,quote?.timestamp,quote?.marketState,candles,candleSeconds]);

  useEffect(()=>{
    const chart=chartRef.current;
    if(!chart)return;
    chart.timeScale().fitContent();
    chart.priceScale('right').setAutoScale(true);
  },[fitSignal]);

  return <div ref={host} className="chart-host" onContextMenu={e=>{e.preventDefault();onChartSettings()}} />;
}
