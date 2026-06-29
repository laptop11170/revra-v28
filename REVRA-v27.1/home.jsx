// Home — Emma orb screen
function HomePage({ setPage }) {
  const [msg, setMsg] = React.useState('');
  return (
    <div className="page active">
      <div className="home-wrap">
        <div className="home-hero">
          <div className="hero-head">
            <div>
              <div className="hero-name">Emma</div>
              <div className="hero-role">AI Sales Agent</div>
            </div>
            <span className="hero-active"><span className="status-dot"></span> Active</span>
          </div>

          <div className="orb-stage">
            <div className="orb">Emma</div>
            <div className="hero-prompt">
              <h2>How can I help you today?</h2>
              <p>I can engage leads, qualify opportunities, book meetings, and follow up — so you can focus on closing.</p>
            </div>
          </div>

          <div className="ask-row">
            <div className="ask-input">
              <Ico.Sparkle size={16} style={{color:'var(--violet-glow)'}} />
              <input
                value={msg}
                onChange={e=>setMsg(e.target.value)}
                placeholder="Ask Emma anything..."
              />
              <button className="send-btn"><Ico.Send size={16} /></button>
            </div>
            <div className="quick-chips">
              <span className="chip" onClick={()=>setPage('leads')}>Qualify new leads</span>
              <span className="chip" onClick={()=>setPage('conversations')}>Follow up with unresponded leads</span>
              <span className="chip" onClick={()=>setPage('pipeline')}>Book meetings</span>
              <span className="chip">Re-engage cold leads</span>
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="mini-card">
            <h4>Agent Status</h4>
            <div className="agent-row">
              <div className="ico violet"><Ico.Sparkle size={14} /></div>
              <div className="lbl"><div className="t">Emma</div><div className="s">AI Sales Agent</div></div>
              <div className="v green">Active</div>
            </div>
            <div className="agent-row">
              <div className="ico"><Ico.Mail size={14} /></div>
              <div className="lbl"><div className="t">Inbox</div><div className="s">0 Unread</div></div>
              <div className="v">0</div>
            </div>
            <div className="agent-row">
              <div className="ico green"><Ico.CheckCircle size={14} /></div>
              <div className="lbl"><div className="t">Tasks</div><div className="s">3 Pending</div></div>
              <div className="v">3</div>
            </div>
          </div>

          <div className="mini-card">
            <h4 style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>Today's Summary</span>
              <span className="pill" style={{textTransform:'none',letterSpacing:0,fontWeight:500}}>
                <Ico.Calendar size={12} /> May 4
              </span>
            </h4>
            {[
              ['Conversations','128','↑ 24%'],
              ['Replies Sent','96','↑ 31%'],
              ['Meetings Booked','12','↑ 50%'],
              ['Opportunities Created','8','↑ 14%'],
            ].map((row,i)=>(
              <div className="summary-row" key={i}>
                <div className="l">{row[0]}<div className="num">{row[1]}</div></div>
                <div className="r">
                  <span className="pct">{row[2]}</span>
                  <svg width="64" height="22" viewBox="0 0 64 22">
                    <path d="M0 14 Q8 8 16 12 T32 10 T48 6 T64 8" stroke="#7c6cff" strokeWidth="1.4" fill="none" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          <div className="mini-card" style={{borderColor:'var(--violet-line)',background:'linear-gradient(180deg,#15172a,#0e101e)'}}>
            <div style={{display:'flex',gap:11,alignItems:'flex-start'}}>
              <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(180deg,#7c6cff,#5b4dff)',display:'grid',placeItems:'center',color:'#fff',flexShrink:0}}>
                <Ico.Sparkle size={14} />
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:3}}>Emma is always working for you</div>
                <div style={{fontSize:12,color:'var(--ink-dim)',lineHeight:1.5}}>Engaging, qualifying, and advancing conversations — 24/7.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.HomePage = HomePage;
