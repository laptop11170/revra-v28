// Analytics page
function AnalyticsPage() {
  const linePts = [12,18,16,28,24,36,32,46,42,58,52,68,64,80];
  const w = 720, h = 240, pad = 30;
  const max = 100;
  const pts = linePts.map((y,i)=>[pad + (i*(w-pad*2)/(linePts.length-1)), h-pad - (y/max)*(h-pad*2)]);
  const dPath = pts.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ');
  const aPath = dPath + ` L ${pts[pts.length-1][0]} ${h-pad} L ${pts[0][0]} ${h-pad} Z`;

  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <h1 className="page-title">Analytics</h1>
          <div className="page-sub">How your AI agent is performing across the funnel.</div>
        </div>
        <div className="row" style={{gap:8}}>
          <button className="filter">Last 30 days <Ico.ChevronDown size={12}/></button>
          <button className="btn">Export</button>
        </div>
      </div>

      <div className="kpis">
        {[
          {l:'Conversations',v:'3,824',d:'+24%'},
          {l:'Replies Sent',v:'2,961',d:'+31%'},
          {l:'Meetings Booked',v:'342',d:'+50%'},
          {l:'Opportunities',v:'128',d:'+14%'},
          {l:'Revenue Influenced',v:'$1.24M',d:'+22%'},
        ].map((k,i)=>(
          <div className="kpi" key={i}>
            <div className="label">{k.l}</div>
            <div className="value">{k.v}</div>
            <div className="delta">↑ {k.d}</div>
            <svg className="spark" viewBox="0 0 80 30">
              <path d={i%2?'M0 22 Q15 8 30 14 T60 8 T80 4':'M0 18 Q15 24 30 12 T60 14 T80 6'} stroke="#7c6cff" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        ))}
      </div>

      <div className="analytics-grid">
        <div className="card a-chart">
          <h3 className="chart-title">Pipeline Generated</h3>
          <div className="chart-sub">Daily inbound pipeline value sourced or accelerated by Emma</div>
          <svg viewBox={`0 0 ${w} ${h}`} width="100%">
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c6cff" stopOpacity=".4"/>
                <stop offset="100%" stopColor="#7c6cff" stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[0,25,50,75,100].map(g=>(
              <line key={g} x1={pad} x2={w-pad} y1={h-pad-(g/max)*(h-pad*2)} y2={h-pad-(g/max)*(h-pad*2)} stroke="#1a1e30" strokeWidth="1"/>
            ))}
            <path d={aPath} fill="url(#ag)" />
            <path d={dPath} stroke="#7c6cff" strokeWidth="2" fill="none"/>
            {pts.map((p,i)=>i%2===0 && <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#0c0e18" stroke="#7c6cff" strokeWidth="1.5" />)}
          </svg>
        </div>

        <div className="card a-side">
          <h3 className="chart-title">Conversation Outcomes</h3>
          <div className="chart-sub">Last 30 days</div>
          <div className="donut">
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="70" fill="none" stroke="#161929" strokeWidth="20"/>
              {[
                {p:48,c:'#7c6cff'},
                {p:23,c:'#5eb3ff'},
                {p:16,c:'#3ddc97'},
                {p:13,c:'#ffb547'},
              ].reduce((acc,seg,i)=>{
                const len = (seg.p/100)*440;
                acc.elems.push(<circle key={i} cx="90" cy="90" r="70" fill="none" stroke={seg.c} strokeWidth="20"
                  strokeDasharray={`${len} 440`} strokeDashoffset={-acc.off} strokeLinecap="butt" />);
                acc.off += len;
                return acc;
              }, {elems:[],off:0}).elems}
            </svg>
            <div className="center"><div className="v">3.8K</div><div className="l">Total</div></div>
          </div>
          <div className="legend">
            {[
              ['Booked','48%','#7c6cff'],
              ['Qualified','23%','#5eb3ff'],
              ['Nurturing','16%','#3ddc97'],
              ['Disqualified','13%','#ffb547'],
            ].map(r=>(
              <div className="row" key={r[0]}>
                <div className="l"><span className="sw" style={{background:r[2]}}></span>{r[0]}</div>
                <span style={{color:'#fff',fontWeight:500}}>{r[1]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card a-half">
          <h3 className="chart-title">Top Performing Sequences</h3>
          <div className="chart-sub">By reply rate, last 30 days</div>
          {[
            ['Q4 Lead Nurture','42%',420],
            ['Demo Follow-up','38%',380],
            ['Cold Outbound — Ent.','29%',290],
            ['Re-engagement','24%',240],
            ['Pricing Objection','19%',190],
          ].map((r,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'9px 0',borderBottom:'1px solid var(--line)'}}>
              <div style={{width:160,fontSize:13,color:'#fff'}}>{r[0]}</div>
              <div style={{flex:1,height:6,borderRadius:3,background:'#161929',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${r[2]/4.2}%`,background:'linear-gradient(90deg,#7c6cff,#5eb3ff)',borderRadius:3}}></div>
              </div>
              <div style={{width:50,textAlign:'right',fontFamily:'Geist Mono, monospace',fontSize:12.5,color:'#fff'}}>{r[1]}</div>
            </div>
          ))}
        </div>

        <div className="card a-half">
          <h3 className="chart-title">Channel Mix</h3>
          <div className="chart-sub">Where Emma is meeting your leads</div>
          <svg viewBox="0 0 600 180" width="100%">
            {[
              {l:'Email',v:62,c:'#7c6cff',x:30},
              {l:'SMS',v:18,c:'#5eb3ff',x:160},
              {l:'Voice',v:11,c:'#3ddc97',x:290},
              {l:'LinkedIn',v:6,c:'#ffb547',x:420},
            ].map((b,i)=>(
              <g key={i}>
                <rect x={b.x} y={150-b.v*1.8} width="80" height={b.v*1.8} rx="4" fill={b.c} opacity=".85"/>
                <text x={b.x+40} y={166} textAnchor="middle" fill="#9aa0b8" fontSize="11">{b.l}</text>
                <text x={b.x+40} y={142-b.v*1.8} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">{b.v}%</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

window.AnalyticsPage = AnalyticsPage;
