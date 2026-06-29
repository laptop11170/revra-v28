// Conversations page
function ConversationsPage({ setPage, openCall }) {
  const [activeId, setActiveId] = React.useState('c1');
  const [tab, setTab] = React.useState('all');
  const [draft, setDraft] = React.useState('');
  const [thread, setThread] = React.useState(DATA.jordanThread);
  const messagesRef = React.useRef(null);

  const conv = DATA.conversations.find(c=>c.id===activeId) || DATA.conversations[0];

  const send = () => {
    if (!draft.trim()) return;
    const next = [...thread, { who:'me', text:draft, time:'now' }];
    setThread(next);
    setDraft('');
    setTimeout(()=>{
      setThread(t => [...t, { who:'them', text:'Got it — thanks for the quick reply!', time:'now' }]);
    }, 1200);
  };

  React.useEffect(()=>{
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [thread]);

  return (
    <div className="page active" style={{padding:'14px 18px 0'}}>
      <div className="conv-shell">
        <div className="conv-list">
          <div className="conv-list-head">
            <h3>Conversations</h3>
            <button className="iconbtn" style={{width:28,height:28}}><Ico.Plus size={14} /></button>
          </div>
          <div className="conv-tabs">
            {['all','unread','ai','team'].map(t => (
              <div key={t} className={'conv-tab '+(tab===t?'active':'')} onClick={()=>setTab(t)}>
                {t==='all'?'All':t==='unread'?'Unread':t==='ai'?'AI':'Team'}
              </div>
            ))}
          </div>
          <div className="conv-items">
            {DATA.conversations.map(c => (
              <div key={c.id} className={'conv-item '+(c.id===activeId?'active':'')} onClick={()=>setActiveId(c.id)}>
                <div className="av">{c.initials}</div>
                <div className="body">
                  <div className="top-line">
                    <span className="name">{c.name}</span>
                    <span className="time">{c.time}</span>
                  </div>
                  <div className="preview">{c.preview}</div>
                  {c.tags.length>0 && (
                    <div className="meta-line">
                      {c.tags.slice(0,2).map(t=>(
                        <span key={t} className="pill violet" style={{fontSize:10,padding:'2px 7px'}}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="conv-main">
          <div className="conv-head">
            <div className="row" style={{gap:11}}>
              <button className="iconbtn" onClick={()=>setPage('home')} style={{width:28,height:28}}>
                <Ico.ArrowLeft size={14} />
              </button>
              <div className="person">
                <h3>{conv.name}</h3>
                <p>{conv.org}</p>
                {conv.tags.length>0 && (
                  <div className="tags">
                    {conv.tags.map(t => (
                      <span key={t} className="pill violet">
                        <Ico.Bolt size={10} /> {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="row" style={{gap:14}}>
              <span style={{fontSize:11.5,color:'var(--ink-mute)'}}>Saturday, 9:14 PM</span>
              <span className="pill green"><span className="status-dot"></span> Real-time</span>
              <button className="iconbtn" onClick={()=>openCall()} title="Start call"><Ico.Phone size={14} /></button>
              <div className="mini-orb" style={{width:36,height:36}}></div>
            </div>
          </div>

          <div className="messages" ref={messagesRef}>
            {thread.map((m,i)=>(
              <div key={i} className={'msg '+(m.who==='them'?'in':'out')}>
                <div className={'bubble '+(m.who==='them'?'in':'out')} style={{whiteSpace:'pre-line'}}>{m.text}</div>
                <div className="meta">
                  {m.time} {m.who==='me' && <Ico.Check size={11} />}
                </div>
              </div>
            ))}
          </div>

          <div className="composer">
            <div className="pill-input">
              <Ico.Paperclip size={15} style={{color:'var(--ink-mute)'}} />
              <Ico.Smile size={15} style={{color:'var(--ink-mute)'}} />
              <input
                placeholder="Type a message..."
                value={draft}
                onChange={e=>setDraft(e.target.value)}
                onKeyDown={e=>e.key==='Enter' && send()}
              />
            </div>
            <button className="send-btn" onClick={send}><Ico.Send size={16} /></button>
          </div>
        </div>

        <div className="conv-side">
          <div className="meeting-banner">
            <div className="check-mark"><Ico.Check size={26} /></div>
            <h3>Meeting Booked</h3>
            <p>Emma booked a meeting and updated the opportunity.</p>
          </div>

          <div>
            <div className="info-row"><Ico.Calendar size={14} /> <b>Tue, May 6, 2026</b></div>
            <div className="info-row"><Ico.Clock size={14} /> <b>10:00 – 10:30 AM PT</b></div>
            <div className="info-row"><Ico.Clock size={14} /> 30 min</div>
            <div className="info-row"><Ico.Video size={14} /> Google Meet</div>
          </div>

          <div>
            <div className="section-h">Attendees</div>
            <div className="info-row"><Ico.User size={14} />
              <div><b>Jordan Lee</b><div style={{fontSize:11,color:'var(--ink-mute)'}}>jordan.lee@summitridge.com</div></div>
            </div>
            <div className="info-row"><Ico.User size={14} />
              <div><b>You</b><div style={{fontSize:11,color:'var(--ink-mute)'}}>alex@yourcompany.com</div></div>
            </div>
          </div>

          <div>
            <div className="section-h">Opportunity Updated</div>
            <div style={{padding:12,borderRadius:10,background:'#10131e',border:'1px solid var(--line)'}}>
              <div style={{fontSize:13,color:'#fff',fontWeight:500,marginBottom:6}}>Summit Ridge — New Deal</div>
              <div style={{fontSize:12,color:'var(--ink-dim)'}}>Stage: <span className="pill violet" style={{padding:'2px 8px'}}>Demo Scheduled</span></div>
            </div>
          </div>

          <button className="btn" style={{width:'100%',justifyContent:'center',padding:'10px',marginTop:'auto'}}>View in Calendar</button>
        </div>
      </div>
    </div>
  );
}

window.ConversationsPage = ConversationsPage;
