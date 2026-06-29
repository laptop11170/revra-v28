// Pipeline (Kanban) page
function PipelinePage({ setPage }) {
  const cols = DATA.pipeline.columns;

  const renderDeal = (d) => {
    if (d.won) return (
      <div key={d.id} className="deal-card won">
        <div className="top">
          <div className="ic" style={{background:'#3ddc9722',color:'var(--green)'}}><Ico.Building size={13} /></div>
          <div style={{flex:1}}>
            <div className="name">{d.name}</div>
            <div className="price">{d.price}</div>
          </div>
        </div>
        <span className="badge-won">Won</span>
      </div>
    );
    return (
      <div key={d.id} className={'deal-card '+(d.live?'live':'')}>
        <div className="top">
          <div className="ic"><Ico.Building size={13} /></div>
          <div style={{flex:1,minWidth:0}}>
            <div className="name">{d.name}</div>
            <div className="role">{d.role}</div>
          </div>
          {d.live && <Ico.Sparkle size={13} style={{color:'var(--violet-glow)'}} />}
        </div>
        {d.source && <div className="source">{d.source} · {d.time}</div>}
        {d.score!=null && <div className="source">Score: {d.score} · {d.time}</div>}
        {d.date && <div className="source"><Ico.Calendar size={11} /> {d.date}</div>}
        {d.stage && <>
          <div className={'status '+(d.stage==='Negotiation'?'amber':d.stage==='Technical Validation'?'violet':'')}>{d.stage}</div>
          <div className="progress"><span style={{width:`${d.progress}%`}}></span></div>
        </>}
      </div>
    );
  };

  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <div className="page-sub">Live opportunities across stages.</div>
        </div>
        <div className="row" style={{gap:8}}>
          <button className="filter active"><Ico.Filter size={12}/> Filters</button>
          <button className="filter">Stage <Ico.ChevronDown size={12}/></button>
          <button className="btn primary"><Ico.Plus size={13}/> Add Opportunity</button>
        </div>
      </div>

      <div className="kpis">
        {[
          {l:'Total Pipeline',v:'$2.48M'},
          {l:'Opportunities',v:'128'},
          {l:'Booked Meetings',v:'24',d:'+33%'},
          {l:'Win Rate',v:'37%'},
          {l:'Avg. Deal Size',v:'$18.4K'},
        ].map((k,i)=>(
          <div className="kpi" key={i}>
            <div className="label">{k.l}</div>
            <div className="value">{k.v}</div>
            {k.d && <div className="delta">↑ {k.d}</div>}
            <svg className="spark" viewBox="0 0 80 30">
              <path d={i%2?'M0 22 Q15 6 30 14 T60 10 T80 4':'M0 18 Q15 22 30 12 T60 14 T80 8'}
                stroke="#7c6cff" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        ))}
      </div>

      <div className="kanban">
        {cols.map(col => (
          <div className="col" key={col.id}>
            <div className="col-head">
              <div className="row1">
                <h4>{col.title}</h4>
                <span style={{fontSize:11.5,color:'var(--ink-mute)'}}>{col.count}</span>
              </div>
              <div className="meta">{col.value}</div>
            </div>
            {col.deals.map(renderDeal)}
            <div className="add-deal">+ Add Opportunity</div>
          </div>
        ))}
      </div>

      <div className="pipeline-toast">
        <div className="l">
          <div className="star"><Ico.Sparkle size={16} /></div>
          <div className="text">
            <strong>Emma is finding and qualifying the right opportunities for you.</strong>
            <span>24 new opportunities added to your pipeline this week.</span>
          </div>
        </div>
        <button className="btn primary" onClick={()=>setPage('leads')}>View Opportunities <Ico.ChevronRight size={13} /></button>
      </div>
    </div>
  );
}

window.PipelinePage = PipelinePage;
