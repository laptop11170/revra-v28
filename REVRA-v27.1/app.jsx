// App router
const { useState } = React;

function App() {
  const [page, setPage] = useState('home');

  // Special: live call lives under conversations but is its own surface
  const goCall = () => setPage('livecall');

  let body, crumb;
  switch(page){
    case 'home':
      crumb = <><b>Home</b></>;
      body = <HomePage setPage={setPage} />; break;
    case 'conversations':
      crumb = <>Conversations / <b>Jordan Lee</b></>;
      body = <ConversationsPage setPage={setPage} openCall={goCall} />; break;
    case 'livecall':
      crumb = <span style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}} onClick={()=>setPage('conversations')}><Ico.ArrowLeft size={14}/> Back to Conversations</span>;
      body = <LiveCallPage setPage={setPage} />; break;
    case 'pipeline':
      crumb = <><b>Pipeline</b></>;
      body = <PipelinePage setPage={setPage} />; break;
    case 'campaigns':
      crumb = <><b>Campaigns</b></>;
      body = <CampaignsPage setPage={setPage} />; break;
    case 'leads':
      crumb = <><b>Leads</b></>;
      body = <LeadsPage setPage={setPage} />; break;
    case 'analytics':
      crumb = <><b>Analytics</b></>;
      body = <AnalyticsPage />; break;
    case 'integrations':
      crumb = <><b>Integrations</b></>;
      body = <IntegrationsPage />; break;
    case 'automations':
      crumb = <><b>Automations</b></>;
      body = <StubPage title="Automations" sub="Background flows and triggers Emma runs on your behalf." icon="Bolt" />; break;
    case 'settings':
      crumb = <><b>Settings</b></>;
      body = <StubPage title="Settings" sub="Workspace, billing, agent persona, and access controls." icon="Settings" />; break;
    default:
      body = <HomePage setPage={setPage} />;
  }

  // Highlight the right sidebar item when on livecall
  const navHighlight = page === 'livecall' ? 'conversations' : page;

  return (
    <div className="shell" data-screen-label={page}>
      <Sidebar page={navHighlight} setPage={setPage} />
      <div className="main">
        <Topbar crumb={crumb} />
        {body}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
