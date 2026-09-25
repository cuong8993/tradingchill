const STANDARD_COLORS=[
  '#ffffff',
  '#f45b69',
  '#22c58b',
  '#5ec8e5',
  '#f6c85f',
  '#ff9f43',
  '#b98cff',
  '#55d6be',
  '#000000',
];

type Props={
  value:string;
  onChange:(color:string)=>void;
};

export default function StandardColorPicker({value,onChange}:Props){
  return <div className="standard-color-picker">
    <div className="color-swatches">
      {STANDARD_COLORS.map(color=><button
        key={color}
        type="button"
        className={value.toLowerCase()===color?'selected':''}
        style={{backgroundColor:color}}
        title={color}
        aria-label={`Choose ${color}`}
        onClick={()=>onChange(color)}
      />)}
    </div>
    <div className="custom-color-row">
      <input type="color" value={value} onChange={e=>onChange(e.target.value)}/>
      <input value={value} onChange={e=>onChange(e.target.value)} maxLength={7}/>
    </div>
  </div>;
}
