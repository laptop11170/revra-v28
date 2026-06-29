// Leads page — table view
function LeadsPage({ setPage }) {
  const [active, setActive] = React.useState('all');
  const [bulkOpen, setBulkOpen] = React.useState(false);

  return (
    <div className="page active">
      <div className="page-head">
        <div>
          <h1 className="page-title">Leads</h1>
          <div className="page-sub">All inbound and Emma-sourced leads.</div>
        </div>
        <div className="row" style={{gap:8}}>
          <button className="btn" onClick={()=>setBulkOpen(true)}><Ico.MessageSquare size={13}/> Send Bulk SMS</button>
          <button className="btn primary"><Ico.Plus size={13}/> Add Lead</button>
        </div>
      </div>

      <div className="kpis" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {[
          {l:'Total Contacts',v:'125,430',i:'Users'},
          {l:'Active Leads',v:'87,992',i:'User'},
          {l:'Hot Leads',v:'2,348',d:'+12%',i:'Star'},
          {l:'Avg. Lead Score',v:'68',d:'+4',i:'Trend'},
        ].map((k,i)=>{
          const Icon = window.Ico[k.i];
          return (
            <div className="kpi" key={i}>
              <div className="label">{k.l}</div>
              <div className="value">{k.v}</div>
              {k.d && <div className="delta">↑ {k.d}</div>}
              <div style={{position:'absolute',right:14,top:14,width:32,height:32,borderRadius:8,background:'#161929',display:'grid',placeItems:'center',color:'var(--ink-dim)'}}>
                <Icon size={15} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="filters-bar">
        {['All Leads','Hot','Warm','New','Booked','Nurture','Cold'].map(f => (
          <button key={f} className={'filter '+(active===f.toLowerCase()?'active':'')} onClick={()=>setActive(f.toLowerCase())}>
            {f}
          </button>
        ))}
        <span style={{flex:1}}></span>
        <button className="filter"><Ico.Filter size={12}/> More filters</button>
        <button className="filter">Sort: Last activity <Ico.ChevronDown size={12}/></button>
      </div>

      <div className="card table-card">
        <table className="tbl">
          <thead><tr>
            <th style={{width:34,paddingLeft:18}}><span className="check"><span className="box"></span></span></th>
            <th>Lead</th>
            <th>Organization</th>
            <th>Stage</th>
            <th>Score</th>
            <th>Last activity</th>
            <th style={{textAlign:'right',paddingRight:20}}></th>
          </tr></thead>
          <tbody>
            {DATA.leads.map((l,i)=>(
              <tr key={i} onClick={()=>setPage('conversations')}>
                <td style={{paddingLeft:18}}><span className="check"><span className="box"></span></span></td>
                <td>
                  <div className="who">
                    <div className="av">{l.name.split(' ').map(s=>s[0]).join('').slice(0,2)}</div>
                    <div>
                      <div className="nm">{l.name}</div>
                      <div className="em">{l.email}</div>
                    </div>
                  </div>
                </td>
                <td><div style={{color:'#fff'}}>{l.org}</div><div style={{fontSize:11.5,color:'var(--ink-mute)'}}>{l.role}</div></td>
                <td><span className="pill violet">{l.stage}</span></td>
                <td><span className={'score '+(l.hot==='hot'?'hot':l.hot==='warm'?'warm':'')}>{l.score}</span></td>
                <td style={{color:'var(--ink-dim)',fontSize:12.5}}>{l.last}</td>
                <td style={{textAlign:'right',paddingRight:20}}>
                  <button className="iconbtn" style={{width:28,height:28,display:'inline-grid'}}><Ico.MoreH size={14}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={'overlay '+(bulkOpen?'show':'')} onClick={()=>setBulkOpen(false)}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-head">
            <h3>Send Bulk SMS</h3>
            <button className="iconbtn" style={{width:30,height:30,border:0}} onClick={()=>setBulkOpen(false)}><Ico.X size={14}/></button>
          </div>

          <div className="section-h">Select Recipients</div>
          <div className="recipients-card">
            <div className="rc-ic"><Ico.Users size={20}/></div>
            <div className="rc-l">
              <b>5,000 Leads</b>
              <span>From list: All Leads</span>
            </div>
            <button className="btn">Change</button>
          </div>

          <div className="section-h" style={{marginTop:14}}>Message</div>
          <textarea className="input" style={{padding:'11px 14px',background:'#0a0c16',border:'1px solid var(--line)',borderRadius:11,color:'#fff',width:'100%',minHeight:90,resize:'vertical',fontFamily:'inherit',fontSize:13.5,lineHeight:1.5}}
            defaultValue={"Hey there! Check out our latest offer just for you.\nLimited time only. Act now!\nReply STOP to opt out."}></textarea>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8,fontSize:11.5,color:'var(--ink-mute)'}}>
            <div className="row" style={{gap:10}}>
              <Ico.Smile size={14}/><Ico.Paperclip size={14}/><span style={{fontFamily:'monospace'}}>{'{ }'}</span>
            </div>
            <span>91/160 Characters</span>
          </div>

          <div className="section-h" style={{marginTop:14}}>Sender ID</div>
          <select className="input" style={{padding:'10px 14px',background:'#0a0c16',border:'1px solid var(--line)',borderRadius:9,color:'#fff',width:'100%',fontSize:13}}>
            <option>Revra Sales</option>
          </select>

          <div className="modal-stats">
            <div className="s"><div className="l">Total Recipients</div><div className="v">5,000</div></div>
            <div className="s"><div className="l">Estimated Parts</div><div className="v">1 SMS</div></div>
            <div className="s"><div className="l">Estimated Cost</div><div className="v">$250.00</div></div>
          </div>

          <div className="modal-foot">
            <label className="check"><span className="box"></span> Schedule for later</label>
            <div className="row" style={{gap:8}}>
              <button className="btn" onClick={()=>setBulkOpen(false)}>Cancel</button>
              <button className="btn primary"><Ico.Send size={13}/> Send SMS</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.LeadsPage = LeadsPage;
