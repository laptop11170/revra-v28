// Integrations page + simple stub for unused sidebar items
function IntegrationsPage() {
  const [tab, setTab] = React.useState('all');
  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <h1 className="page-title">Integrations</h1>
          <div className="page-sub">Connect Revra to your existing stack.</div>
        </div>
        <div className="row" style={{gap:8}}>
          <button className="filter">Browse marketplace</button>
          <button className="btn primary"><Ico.Plus size={13}/> Request integration</button>
        </div>
      </div>

      <div className="filters-bar">
        {['All','Connected','CRM','Email','Calendar','Comms','Data'].map(f=>(
          <button key={f} className={'filter '+(tab===f.toLowerCase()?'active':'')} onClick={()=>setTab(f.toLowerCase())}>{f}</button>
        ))}
      </div>

      <div className="integ-grid">
        {DATA.integrations.map(it => (
          <div className="integ-card" key={it.name}>
            <div className="ic" style={{background:it.color}}>{it.initials}</div>
            <h4>{it.name}</h4>
            <p>{it.desc}</p>
            <div className="integ-foot">
              {it.connected
                ? <span className="pill green"><span className="status-dot"></span> Connected</span>
                : <span className="pill" style={{color:'var(--ink-mute)'}}>Not connected</span>}
              <button className="btn" style={{padding:'6px 11px',fontSize:12}}>{it.connected?'Manage':'Connect'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StubPage({ title, sub, icon='Workflow' }) {
  const Icon = window.Ico[icon];
  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <div className="page-sub">{sub}</div>
        </div>
      </div>
      <div className="card" style={{padding:60,textAlign:'center'}}>
        <div style={{width:64,height:64,borderRadius:16,background:'linear-gradient(180deg,#7c6cff,#5b4dff)',margin:'0 auto 18px',display:'grid',placeItems:'center',color:'#fff',boxShadow:'0 8px 24px #5b4dff40'}}>
          <Icon size={28}/>
        </div>
        <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:20,fontWeight:600,color:'#fff',margin:'0 0 8px'}}>{title} workspace</h3>
        <p style={{color:'var(--ink-dim)',fontSize:13.5,maxWidth:420,margin:'0 auto',lineHeight:1.55}}>
          {sub} Emma is configuring this surface for you — pick a section in the sidebar to keep exploring.
        </p>
      </div>
    </div>
  );
}

window.IntegrationsPage = IntegrationsPage;
window.StubPage = StubPage;
