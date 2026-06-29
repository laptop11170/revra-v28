// Live Call page
function LiveCallPage({ setPage }) {
  const [duration, setDuration] = React.useState(462); // 7:42
  const [muted, setMuted] = React.useState(false);
  const [held, setHeld] = React.useState(false);

  React.useEffect(()=>{
    const t = setInterval(()=>setDuration(d=>d+1), 1000);
    return ()=>clearInterval(t);
  },[]);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const transcript = [
    { who:'them', name:'Michael Thompson', time:'9:07 PM', text:"We're using another platform right now. What makes Revra different?" },
    { who:'ai', name:'Emma', time:'9:07 PM', text:'Revra is the only CRM that combines AI agents with automation. I handle follow-ups, qualify leads, and book meetings — so your team can focus on closing.' },
    { who:'them', name:'Michael Thompson', time:'9:09 PM', text:'Sounds interesting. How does pricing work?' },
    { who:'ai', name:'Emma', time:'9:09 PM', text:'We offer flexible plans based on your team size and volume. I can create a custom estimate for you and walk you through it.' },
    { who:'them', name:'Michael Thompson', time:'9:10 PM', text:"Sure, that'd be helpful." },
    { who:'ai', name:'Emma', time:'9:10 PM', text:"Great! I'll send that over right after we lock in a time that works for you." },
  ];

  return (
    <div className="page active" style={{padding:'14px 18px 0'}}>
      <div className="call-shell">
        <div className="call-card">
          <div className="call-head">
            <div>
              <div className="label">Current Call</div>
              <h2>Michael Thompson</h2>
              <div className="phone"><Ico.Phone size={11} style={{display:'inline',verticalAlign:'middle'}} /> +1 (415) 555-0187</div>
              <span className="pill green" style={{marginTop:10}}>Lead Score 84</span>
            </div>
            <div className="call-duration">
              Call Duration
              <div className="val"><span className="rec"></span>{fmt(duration)}</div>
            </div>
          </div>

          <div className="big-orb-wrap">
            <div className="big-orb" style={{filter: held?'grayscale(.6) brightness(.7)':'none'}}>Emma</div>
            <div className="ai-label">AI Sales Agent</div>
          </div>

          <div className="call-actions">
            <div className="call-btn" onClick={()=>setMuted(!muted)} style={{borderColor:muted?'var(--violet-line)':''}}>
              <div className="ic" style={{background:muted?'var(--violet-soft)':''}}><Ico.Mic size={16} /></div>
              {muted?'Unmute':'Mute'}
            </div>
            <div className="call-btn">
              <div className="ic"><Ico.Grid size={16} /></div>
              Keypad
            </div>
            <div className="call-btn" onClick={()=>setHeld(!held)} style={{borderColor:held?'var(--violet-line)':''}}>
              <div className="ic" style={{background:held?'var(--violet-soft)':''}}><Ico.Pause size={16} /></div>
              {held?'Resume':'Hold'}
            </div>
            <div className="call-btn end" onClick={()=>setPage('conversations')}>
              <div className="ic"><Ico.PhoneEnd size={16} /></div>
              End Call
            </div>
          </div>

          <div className="insights">
            <div className="insights-head">
              <h4><Ico.Chart size={14} /> Live Call Insights</h4>
              <a style={{fontSize:11.5,color:'var(--violet-glow)'}}>View all</a>
            </div>
            <div className="insights-grid">
              <div className="insight">
                <div className="lbl">Sentiment</div>
                <div className="val" style={{color:'var(--green)'}}>Positive</div>
                <svg viewBox="0 0 100 30">
                  <path d="M0 22 Q15 16 30 18 T55 12 T80 8 T100 4" stroke="#3ddc97" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
              <div className="insight">
                <div className="lbl">Engagement</div>
                <div className="val" style={{color:'var(--violet-glow)'}}>High</div>
                <svg viewBox="0 0 100 30">
                  <path d="M0 20 Q12 10 24 14 T48 8 T72 12 T100 6" stroke="#7c6cff" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
              <div className="insight">
                <div className="lbl">Talk Time</div>
                <div className="val">62%</div>
                <svg viewBox="0 0 30 30" style={{height:24,width:24,margin:'4px auto 0',display:'block'}}>
                  <circle cx="15" cy="15" r="12" fill="none" stroke="#1d2234" strokeWidth="3" />
                  <circle cx="15" cy="15" r="12" fill="none" stroke="#7c6cff" strokeWidth="3"
                    strokeDasharray={`${62*0.754} ${100*0.754}`} strokeLinecap="round" transform="rotate(-90 15 15)" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="transcript-card">
          <div className="transcript-head">
            <h3><Ico.MessageSquare size={14} /> Live Transcript</h3>
            <a>View Full Transcript</a>
          </div>
          <div className="transcript">
            {transcript.map((m,i)=>(
              <div key={i} className={'ts-msg '+(m.who==='ai'?'ai':'')}>
                <div className="dot"></div>
                <div>
                  <div className="who"><b>{m.name}</b> <span>{m.time}</span></div>
                  <div className="text">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="listening">
            <Ico.Sparkle size={13} />
            Emma is listening and adapting...
            <span className="dots"><span></span><span></span><span></span></span>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div className="mini-card" style={{borderColor:'var(--violet-line)',background:'linear-gradient(180deg,#161936,#0e1024)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
              <div className="check-mark" style={{width:36,height:36,margin:0}}><Ico.Check size={18} /></div>
              <div>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:600,color:'#fff'}}>Meeting Booked</div>
                <div style={{fontSize:11.5,color:'var(--ink-mute)'}}>On Calendar</div>
              </div>
            </div>
            <div style={{padding:'10px 0',borderBottom:'1px solid var(--line)',marginBottom:8}}>
              <div className="info-row" style={{padding:'4px 0'}}><Ico.Calendar size={14} /><div><b>Discovery Call</b><div style={{fontSize:11,color:'var(--ink-mute)'}}>with Michael Thompson</div></div></div>
              <div className="info-row" style={{padding:'4px 0'}}><Ico.Clock size={14} /><b>11:00 AM – 11:30 AM</b></div>
              <div className="info-row" style={{padding:'4px 0'}}><Ico.Video size={14} /> Google Meet</div>
            </div>
            <button className="btn primary" style={{width:'100%',justifyContent:'center'}}>View in Calendar</button>
          </div>

          <div className="mini-card">
            <h4 style={{display:'flex',justifyContent:'space-between'}}>Lead Details <a style={{fontSize:11,color:'var(--violet-glow)'}}>Edit</a></h4>
            <div className="info-row"><Ico.User size={14} /><b>Michael Thompson</b></div>
            <div className="info-row"><span style={{width:14,fontSize:11,color:'var(--ink-mute)'}}></span>CTO, Northbeam Inc.</div>
            <div className="info-row"><Ico.Mail size={14} /> michael@northbeam.com</div>
            <div className="info-row"><Ico.Phone size={14} /> +1 (415) 555-0187</div>
            <div className="info-row"><Ico.Building size={14} /> Northbeam Inc.</div>
            <div className="info-row"><Ico.Tag size={14} /> Enterprise</div>
            <div className="info-row"><Ico.Star size={14} /> Lead Score <span className="score" style={{marginLeft:'auto'}}>84</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.LiveCallPage = LiveCallPage;
