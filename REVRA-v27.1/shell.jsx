// App shell — sidebar + topbar
const { useState } = React;

function Sidebar({ page, setPage }) {
  const items = [
    { id:'home', label:'Home', icon:'Home' },
    { id:'conversations', label:'Conversations', icon:'Chat' },
    { id:'leads', label:'Leads', icon:'Users' },
    { id:'pipeline', label:'Pipeline', icon:'Pipeline' },
    { id:'campaigns', label:'Campaigns', icon:'Megaphone' },
    { id:'automations', label:'Automations', icon:'Bolt' },
    { id:'analytics', label:'Analytics', icon:'Chart' },
    { id:'integrations', label:'Integrations', icon:'Plug' },
    { id:'settings', label:'Settings', icon:'Settings' },
  ];
  return (
    <aside className="sidebar">
      <div className="side-logo">
        <span className="logo"><span className="logo-mark"></span>REVRA</span>
      </div>
      <nav className="nav">
        {items.map(it => {
          const Icon = window.Ico[it.icon];
          return (
            <a key={it.id} className={page===it.id?'active':''} onClick={()=>setPage(it.id)}>
              <Icon /> {it.label}
            </a>
          );
        })}
      </nav>
      <div className="side-foot">
        <div className="agent-card">
          <div className="agent-orb"></div>
          <div className="grow">
            <div className="name">{DATA.agent.name}</div>
            <div className="role">{DATA.agent.role}</div>
          </div>
          <span className="status-dot" title="Active"></span>
        </div>
        <div className="team-card">
          <div className="team-avatar">{DATA.user.initials}</div>
          <div className="grow">
            <div style={{fontSize:13,fontWeight:600,color:'#fff',lineHeight:1.2}}>{DATA.user.name}</div>
            <div style={{fontSize:11,color:'var(--ink-mute)'}}>{DATA.user.plan}</div>
          </div>
          <Ico.ChevronDown size={14} style={{color:'var(--ink-mute)'}} />
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumb, right }) {
  return (
    <div className="topbar">
      <div className="crumb">{crumb}</div>
      <div className="spacer"></div>
      {right ? right : <>
        <div className="search">
          <Ico.Search size={14} />
          <span style={{flex:1}}>Search anything...</span>
          <kbd>⌘K</kbd>
        </div>
        <button className="iconbtn"><Ico.Help size={16} /></button>
        <button className="iconbtn"><Ico.Bell size={16} /><span className="bell-dot"></span></button>
        <div className="avatar">AC</div>
      </>}
    </div>
  );
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
