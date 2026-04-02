import { useState, useEffect, useCallback } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleQuantile } from "d3-scale";

const DATA = "/pulse-data";
const INDIA_GEO = "/india-states.json";

// pulse-master state slug map (for district API path)
const STATE_SLUG = {
  "andaman & nicobar islands": "andaman-&-nicobar-islands",
  "andhra pradesh": "andhra-pradesh",
  "arunachal pradesh": "arunachal-pradesh",
  "assam": "assam", "bihar": "bihar", "chandigarh": "chandigarh",
  "chhattisgarh": "chhattisgarh",
  "dadra & nagar haveli & daman & diu": "dadra-&-nagar-haveli-&-daman-&-diu",
  "delhi": "delhi", "goa": "goa", "gujarat": "gujarat", "haryana": "haryana",
  "himachal pradesh": "himachal-pradesh", "jammu & kashmir": "jammu-&-kashmir",
  "jharkhand": "jharkhand", "karnataka": "karnataka", "kerala": "kerala",
  "ladakh": "ladakh", "lakshadweep": "lakshadweep", "madhya pradesh": "madhya-pradesh",
  "maharashtra": "maharashtra", "manipur": "manipur", "meghalaya": "meghalaya",
  "mizoram": "mizoram", "nagaland": "nagaland", "odisha": "odisha",
  "puducherry": "puducherry", "punjab": "punjab", "rajasthan": "rajasthan",
  "sikkim": "sikkim", "tamil nadu": "tamil-nadu", "telangana": "telangana",
  "tripura": "tripura", "uttar pradesh": "uttar-pradesh",
  "uttarakhand": "uttarakhand", "west bengal": "west-bengal",
};

const YEARS = ["2018","2019","2020","2021","2022","2023","2024"];
const QUARTERS = [
  { v:"1", l:"Q1 · Jan–Mar" }, { v:"2", l:"Q2 · Apr–Jun" },
  { v:"3", l:"Q3 · Jul–Sep" }, { v:"4", l:"Q4 · Oct–Dec" },
];
const COLOR_RAMP = ["#1e3a5f","#1e4d8c","#1a65b5","#1976d2","#ff9800","#f57c00","#e65100","#bf360c"];

function fmtCr(n) {
  if (!n) return "—";
  if (n >= 1e12) return "₹"+(n/1e12).toFixed(2)+"T";
  if (n >= 1e9)  return "₹"+(n/1e9).toFixed(2)+"B";
  if (n >= 1e7)  return "₹"+(n/1e7).toFixed(2)+"Cr";
  if (n >= 1e5)  return "₹"+(n/1e5).toFixed(1)+"L";
  return "₹"+Math.round(n).toLocaleString("en-IN");
}
function fmtN(n) {
  if (!n) return "—";
  if (n >= 1e9) return (n/1e9).toFixed(2)+"B";
  if (n >= 1e7) return (n/1e7).toFixed(2)+"Cr";
  if (n >= 1e5) return (n/1e5).toFixed(1)+"L";
  if (n >= 1e3) return (n/1e3).toFixed(1)+"K";
  return Math.round(n).toLocaleString("en-IN");
}

export default function App() {
  const [year, setYear]               = useState("2024");
  const [quarter, setQuarter]         = useState("1");
  const [metric, setMetric]           = useState("count");
  const [stateData, setStateData]     = useState({});
  const [districtData, setDistData]   = useState(null);
  const [selectedState, setSelected]  = useState(null);
  const [loading, setLoading]         = useState(false);
  const [distLoading, setDistLoading] = useState(false);
  const [error, setError]             = useState(null);
  const [hovered, setHovered]         = useState(null);
  const [tipPos, setTipPos]           = useState({ x:0, y:0 });
  const [totals, setTotals]           = useState({ count:0, amount:0 });
  const [topStates, setTopStates]     = useState([]);
  const [zoom, setZoom]               = useState(1);
  const [center, setCenter]           = useState([82, 23]);

  const fetchState = useCallback(async (y, q) => {
    setLoading(true); setError(null); setSelected(null); setDistData(null);
    try {
      const res  = await fetch(`${DATA}/map/transaction/hover/country/india/${y}/${q}.json`);
      if (!res.ok) throw new Error(`Not found: ${y}/Q${q}`);
      const json = await res.json();
      const map  = {};
      (json?.data?.hoverDataList || []).forEach(item => {
        const key = item.name?.toLowerCase().trim();
        const m   = item.metric?.[0] || {};
        map[key]  = { name:key, count:m.count||0, amount:m.amount||0,
                      avg: m.count ? (m.amount||0)/m.count : 0 };
      });
      setStateData(map);
      const arr   = Object.values(map);
      const totC  = arr.reduce((s,v)=>s+v.count,0);
      const totA  = arr.reduce((s,v)=>s+v.amount,0);
      setTotals({ count:totC, amount:totA });
      setTopStates([...arr].sort((a,b)=>b.count-a.count).slice(0,7));
    } catch(e) { setError(e.message); }
    finally    { setLoading(false); }
  }, []);

  const fetchDistrict = useCallback(async (pulse, y, q) => {
    const slug = STATE_SLUG[pulse]; if (!slug) return;
    setDistLoading(true);
    try {
      const res  = await fetch(`${DATA}/map/transaction/hover/country/india/state/${slug}/${y}/${q}.json`);
      if (!res.ok) { setDistData(null); return; }
      const json = await res.json();
      const arr  = (json?.data?.hoverDataList || []).map(item => ({
        name:   item.name,
        count:  item.metric?.[0]?.count  || 0,
        amount: item.metric?.[0]?.amount || 0,
        avg:    item.metric?.[0]?.count ? (item.metric[0].amount||0)/item.metric[0].count : 0,
      })).sort((a,b)=>b.count-a.count);
      setDistData(arr);
    } catch { setDistData(null); }
    finally  { setDistLoading(false); }
  }, []);

  useEffect(() => { fetchState(year, quarter); }, [year, quarter]);

  const values     = Object.values(stateData).map(d=>d[metric]);
  const colorScale = scaleQuantile().domain(values).range(COLOR_RAMP);

  const getColor = (stNm) => {
    const pulse = stNm?.toLowerCase().trim();
    const d     = pulse && stateData[pulse];
    if (!d || d[metric]===0) return "#1a2744";
    return colorScale(d[metric]);
  };

  const handleClick = (stNm) => {
    const pulse = stNm?.toLowerCase().trim();
    if (!pulse || !stateData[pulse]) return;
    if (selectedState===pulse) { setSelected(null); setDistData(null); }
    else { setSelected(pulse); fetchDistrict(pulse, year, quarter); }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh",
                  background:"#0a0f1e", color:"#e2e8f0",
                  fontFamily:"'DM Sans',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ background:"#0f172a", borderBottom:"1px solid #1e293b",
                    padding:"10px 20px", display:"flex", alignItems:"center",
                    justifyContent:"space-between", flexWrap:"wrap", gap:10, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:8,
                        background:"linear-gradient(135deg,#5b21b6,#2563eb)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontWeight:800, fontSize:15 }}>Pe</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>PhonePe Pulse</div>
            <div style={{ fontSize:11, color:"#64748b" }}>
              Local data · {year} Q{quarter} · {Object.keys(stateData).length} states
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <Sel value={year}    onChange={setYear}    opts={YEARS.map(y=>({v:y,l:y}))} />
          <Sel value={quarter} onChange={setQuarter} opts={QUARTERS} />
          <Sel value={metric}  onChange={setMetric}
            opts={[{v:"count",l:"Transaction count"},{v:"amount",l:"Total amount"},{v:"avg",l:"Avg ticket"}]} />
          {selectedState && (
            <button onClick={()=>{setSelected(null);setDistData(null);}}
              style={{ ...selSt, color:"#f59e0b", borderColor:"#92400e", cursor:"pointer" }}>
              ← All India
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* Map */}
        <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
          {(loading||distLoading) && (
            <div style={{ position:"absolute", inset:0, display:"flex",
                          alignItems:"center", justifyContent:"center",
                          background:"rgba(10,15,30,0.8)", zIndex:20 }}>
              <div style={{ textAlign:"center" }}>
                <div style={spinCss}/>
                <div style={{ fontSize:12, color:"#94a3b8", marginTop:10 }}>
                  {loading?"Reading local data…":`Loading districts…`}
                </div>
              </div>
            </div>
          )}
          {error && (
            <div style={{ position:"absolute", top:14, left:"50%",
                          transform:"translateX(-50%)", background:"#7f1d1d",
                          border:"1px solid #991b1b", borderRadius:8,
                          padding:"8px 16px", fontSize:12, zIndex:20 }}>
              {error}
            </div>
          )}

          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale:1000, center:[82,22] }}
            width={800} height={600}
            style={{ width:"100%", height:"100%", background:"#0a0f1e" }}>
            <ZoomableGroup zoom={zoom} center={center}
              onMoveEnd={({zoom:z,coordinates:c})=>{setZoom(z);setCenter(c);}}>
              <Geographies geography={INDIA_GEO}>
                {({ geographies }) => geographies.map(geo => {
                  const stNm  = geo.properties.st_nm || geo.properties.ST_NM || "";
                  const pulse = stNm.toLowerCase().trim();
                  const isSelected = selectedState===pulse;
                  const isHov      = hovered===pulse;
                  return (
                    <Geography key={geo.rsmKey} geography={geo}
                      fill={isSelected?"#f59e0b":isHov?"#60a5fa":getColor(stNm)}
                      stroke="#0a0f1e" strokeWidth={0.3}
                      style={{default:{outline:"none"},hover:{outline:"none"},pressed:{outline:"none"}}}
                      onClick={()=>handleClick(stNm)}
                      onMouseEnter={e=>{setHovered(pulse);setTipPos({x:e.clientX,y:e.clientY});}}
                      onMouseMove={e=>setTipPos({x:e.clientX,y:e.clientY})}
                      onMouseLeave={()=>setHovered(null)}
                    />
                  );
                })}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {/* Zoom */}
          <div style={{ position:"absolute", bottom:60, left:16,
                        display:"flex", flexDirection:"column", gap:4 }}>
            {[["＋",1.5],["－",1/1.5],["⊙","reset"]].map(([lbl,f])=>(
              <button key={lbl} onClick={()=>{
                if(f==="reset"){setZoom(1);setCenter([82,23]);}
                else setZoom(z=>Math.min(Math.max(z*f,1),16));
              }} style={{ width:30,height:30,background:"#1e293b",border:"1px solid #334155",
                          color:"#e2e8f0",borderRadius:6,cursor:"pointer",fontSize:16,
                          display:"flex",alignItems:"center",justifyContent:"center" }}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div style={{ position:"absolute", bottom:16, left:16,
                        background:"rgba(15,23,42,0.92)", border:"1px solid #1e293b",
                        borderRadius:8, padding:"8px 12px" }}>
            <div style={{ fontSize:10, color:"#64748b", marginBottom:4 }}>
              {metric==="count"?"Txn count":metric==="amount"?"Txn value":"Avg ticket"} · click state for districts
            </div>
            <div style={{ display:"flex", gap:2 }}>
              {COLOR_RAMP.map(c=>(
                <div key={c} style={{ width:16,height:8,background:c,borderRadius:2 }}/>
              ))}
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",
                          fontSize:10,color:"#475569",marginTop:2 }}>
              <span>Low</span><span>High</span>
            </div>
          </div>

          {/* Tooltip */}
          {hovered && (() => {
            const d = stateData[hovered];
            return (
              <div style={{ position:"fixed", left:tipPos.x+14, top:tipPos.y-10,
                            background:"#1e293b", border:"1px solid #334155",
                            borderRadius:10, padding:"10px 14px", zIndex:100,
                            minWidth:210, pointerEvents:"none",
                            boxShadow:"0 4px 24px rgba(0,0,0,0.6)" }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:6,
                              color:"#f1f5f9", textTransform:"capitalize" }}>
                  {hovered}
                </div>
                {d ? <>
                  <TR label="Transactions" val={fmtN(d.count)}/>
                  <TR label="Total amount"  val={fmtCr(d.amount)}/>
                  <TR label="Avg ticket"    val={fmtCr(d.avg)}/>
                  {totals.count>0 && (
                    <div style={{ marginTop:6,paddingTop:6,borderTop:"1px solid #334155",
                                  fontSize:10,color:"#94a3b8" }}>
                      {((d.count/totals.count)*100).toFixed(1)}% of India · click to drill down
                    </div>
                  )}
                </> : <div style={{ fontSize:11,color:"#64748b" }}>No data</div>}
              </div>
            );
          })()}
        </div>

        {/* Sidebar */}
        <div style={{ width:280, background:"#0f172a", borderLeft:"1px solid #1e293b",
                      display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>
          <div style={{ padding:"12px 14px", borderBottom:"1px solid #1e293b" }}>
            <KPI label="Total transactions" val={fmtN(totals.count)}/>
            <KPI label="Total value"        val={fmtCr(totals.amount)} mt/>
            <KPI label="National avg ticket"
              val={totals.count?fmtCr(totals.amount/totals.count):"—"} mt/>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
            {selectedState ? (<>
              <div style={{ fontSize:11,fontWeight:700,color:"#94a3b8",
                            textTransform:"uppercase",letterSpacing:"0.06em",
                            marginBottom:10,textTransform:"capitalize" }}>
                Districts · {selectedState}
              </div>
              {distLoading && <div style={{ fontSize:12,color:"#64748b" }}>Loading…</div>}
              {!distLoading && !districtData && (
                <div style={{ fontSize:12,color:"#64748b" }}>District data not available.</div>
              )}
              {districtData && districtData.map((d,i)=>(
                <BarRow key={d.name} rank={i+1} name={d.name}
                  val={metric==="count"?fmtN(d.count):metric==="amount"?fmtCr(d.amount):fmtCr(d.avg)}
                  sub={`${fmtN(d.count)} txns`}
                  pct={districtData[0]?.[metric]?(d[metric]/districtData[0][metric])*100:0}
                  color="#6366f1"/>
              ))}
            </>) : (<>
              <div style={{ fontSize:11,fontWeight:700,color:"#94a3b8",
                            textTransform:"uppercase",letterSpacing:"0.06em",
                            marginBottom:10 }}>
                Top states by transactions
              </div>
              {topStates.map((s,i)=>{
                const pct=totals.count?(s.count/totals.count)*100:0;
                return (
                  <BarRow key={s.name} rank={i+1}
                    name={s.name.replace(/\b\w/g,c=>c.toUpperCase())}
                    val={fmtN(s.count)} sub={fmtCr(s.amount)} pct={pct} color="#2563eb"
                    onClick={()=>{setSelected(s.name);fetchDistrict(s.name,year,quarter);}}/>
                );
              })}
            </>)}
          </div>
          <div style={{ padding:"10px 14px",borderTop:"1px solid #1e293b",
                        fontSize:10,color:"#334155" }}>
            Source: ~/Downloads/pulse-master<br/>
            data/map/transaction/hover/…/{year}/{quarter}.json
          </div>
        </div>
      </div>
    </div>
  );
}

const selSt = { background:"#1e293b",color:"#e2e8f0",border:"1px solid #334155",
                borderRadius:7,padding:"5px 10px",fontSize:12 };
function Sel({value,onChange,opts}) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={selSt}>
      {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}
function TR({label,val}) {
  return (
    <div style={{ display:"flex",justifyContent:"space-between",gap:12,marginBottom:3 }}>
      <span style={{ fontSize:11,color:"#94a3b8" }}>{label}</span>
      <span style={{ fontSize:11,fontWeight:600,color:"#f1f5f9" }}>{val}</span>
    </div>
  );
}
function KPI({label,val,mt}) {
  return (
    <div style={{ background:"#0a0f1e",borderRadius:7,padding:"8px 10px",marginTop:mt?6:0 }}>
      <div style={{ fontSize:10,color:"#475569",textTransform:"uppercase",
                    letterSpacing:"0.05em",marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:20,fontWeight:700,color:"#f1f5f9" }}>{val}</div>
    </div>
  );
}
function BarRow({rank,name,val,sub,pct,color,onClick}) {
  return (
    <div onClick={onClick}
      style={{ marginBottom:10,cursor:onClick?"pointer":"default",
               padding:"4px 6px",borderRadius:6 }}
      onMouseEnter={e=>{if(onClick)e.currentTarget.style.background="#1e293b";}}
      onMouseLeave={e=>{if(onClick)e.currentTarget.style.background="transparent";}}>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3 }}>
        <span style={{ color:"#e2e8f0",textTransform:"capitalize" }}>
          <span style={{ color,marginRight:5,fontWeight:700 }}>{rank}</span>{name}
        </span>
        <span style={{ color:"#94a3b8",fontSize:11 }}>{val}</span>
      </div>
      <div style={{ height:3,background:"#1e293b",borderRadius:2 }}>
        <div style={{ height:"100%",width:`${Math.min(pct,100)}%`,
                      background:color,borderRadius:2,transition:"width 0.4s ease" }}/>
      </div>
      <div style={{ fontSize:10,color:"#475569",marginTop:2 }}>{sub}</div>
    </div>
  );
}
const spinCss = { width:28,height:28,border:"3px solid #1e293b",
                  borderTop:"3px solid #6366f1",borderRadius:"50%",
                  animation:"spin 0.7s linear infinite",margin:"0 auto" };
