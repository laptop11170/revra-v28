// Campaigns / Workflow Builder page
function CampaignsPage({ setPage }) {
  const [selected, setSelected] = React.useState('wait1');
  const [active, setActive] = React.useState(false);
  const [tab, setTab] = React.useState('builder');

  // Node positions
  const nodes = [
    { id:'start', type:'start', x:480, y:30, title:'Start', desc:'Contact added to list — Q4 Nurture' },
    { id:'email1', type:'email', x:480, y:130, title:'Send Email', desc:'Intro Email' },
    { id:'wait1', type:'wait', x:480, y:230, title:'Wait', desc:'2 Days' },
    { id:'cond1', type:'cond', x:480, y:330, title:'If / Else', desc:'Email Opened?' },
    // YES branch (left)
    { id:'email2', type:'email', x:300, y:430, title:'Send Email', desc:'Value Email 1' },
    { id:'wait2', type:'wait', x:300, y:530, title:'Wait', desc:'3 Days' },
    { id:'cond2', type:'cond', x:300, y:630, title:'If / Else', desc:'Link Clicked?' },
    { id:'email3', type:'email', x:160, y:730, title:'Send Email', desc:'Close Warm' },
    { id:'email4', type:'email', x:340, y:730, title:'Send Email', desc:'Value Email 2' },
    { id:'cond3', type:'cond', x:340, y:830, title:'If / Else', desc:'Email Opened?' },
    { id:'tag1', type:'tag', x:200, y:930, title:'Add Tag', desc:'Engaged · Hot' },
    { id:'task1', type:'task', x:200, y:1030, title:'Create Task', desc:'Follow up call' },
    { id:'fup1', type:'email', x:380, y:930, title:'Send Email', desc:'Follow up 1' },
    { id:'wait3', type:'wait', x:380, y:1030, title:'Wait', desc:'5 Days' },

    // NO branch (right)
    { id:'email5', type:'email', x:660, y:430, title:'Send Email', desc:'Reminder' },
    { id:'wait4', type:'wait', x:660, y:530, title:'Wait', desc:'2 Days' },
    { id:'cond4', type:'cond', x:660, y:630, title:'If / Else', desc:'Email Opened?' },
    { id:'sms1', type:'sms', x:820, y:730, title:'Send SMS', desc:'Quick check-in' },
    { id:'wait5', type:'wait', x:820, y:830, title:'Wait', desc:'2 Days' },
    { id:'cond5', type:'cond', x:820, y:930, title:'If / Else', desc:'Replied to SMS?' },
    { id:'tag2', type:'tag', x:720, y:1030, title:'Add Tag', desc:'Engaged · SMS' },
    { id:'task2', type:'task', x:720, y:1130, title:'Create Task', desc:'Follow up call' },
    { id:'list1', type:'list', x:920, y:1030, title:'Add to List', desc:'Nurture · Long-Term' },
    { id:'wait6', type:'wait', x:920, y:1130, title:'Wait', desc:'7 Days' },

    // Center merge
    { id:'update1', type:'update', x:530, y:730, title:'Update Field', desc:'Lead Status = Nurturing' },
    { id:'reeng', type:'email', x:530, y:830, title:'Send Email', desc:'Re-engagement' },
    { id:'wait7', type:'wait', x:530, y:930, title:'Wait', desc:'8 Days' },
    { id:'end', type:'end', x:530, y:1230, title:'End', desc:'Exit this workflow' },
  ];

  const edges = [
    ['start','email1'],['email1','wait1'],['wait1','cond1'],
    ['cond1','email2','yes'],['cond1','email5','no'],
    ['email2','wait2'],['wait2','cond2'],
    ['cond2','email3','yes'],['cond2','email4','no'],
    ['email4','cond3'],['cond3','tag1','yes'],['cond3','fup1','no'],
    ['tag1','task1'],['fup1','wait3'],
    ['email5','wait4'],['wait4','cond4'],
    ['cond4','update1','yes'],['cond4','sms1','no'],
    ['update1','reeng'],['reeng','wait7'],
    ['sms1','wait5'],['wait5','cond5'],
    ['cond5','tag2','yes'],['cond5','list1','no'],
    ['tag2','task2'],['list1','wait6'],
    ['wait7','end'],['task1','end'],['email3','end'],['wait3','end'],['task2','end'],['wait6','end'],
  ];

  const nm = id => nodes.find(n=>n.id===id);
  const nodeIcon = t => ({start:'PlayCircle',email:'Mail',sms:'MessageSquare',wait:'Clock',cond:'Split',tag:'Tag',task:'CheckCircle',update:'Pencil',list:'List',end:'X'}[t] || 'Hash');

  const inspector = nm(selected);

  const actions = {
    'Communication': [
      {n:'Send Email',i:'Mail',k:'email'},
      {n:'Send SMS',i:'MessageSquare',k:'sms'},
      {n:'Send InMail',i:'Send',k:'email'},
      {n:'Add to Sequence',i:'Refresh',k:'email'},
    ],
    'Conditions & Logic': [
      {n:'If / Else',i:'Split',k:'cond'},
      {n:'Split Path',i:'Split',k:'cond'},
      {n:'Wait / Delay',i:'Clock',k:'wait'},
      {n:'Goal',i:'Star',k:'cond'},
    ],
    'Data Operations': [
      {n:'Update Field',i:'Pencil',k:'cond'},
      {n:'Add Tag',i:'Tag',k:'cond'},
      {n:'Remove Tag',i:'Tag',k:'cond'},
      {n:'Adjust Score',i:'Trend',k:'cond'},
    ],
    'Integrations': [
      {n:'Slack Notification',i:'MessageSquare',k:'cond'},
      {n:'Webhook',i:'Plug',k:'cond'},
      {n:'Create Task',i:'CheckCircle',k:'cond'},
      {n:'Add to CRM List',i:'List',k:'cond'},
    ],
  };

  return (
    <div className="page active" style={{padding:'14px 18px 20px'}}>
      <div className="wf-pageheader">
        <div className="l">
          <button className="crumb-back" onClick={()=>setPage('home')}><Ico.ArrowLeft size={14}/></button>
          <div style={{fontSize:13,color:'var(--ink-dim)'}}>
            Campaigns / <b style={{color:'#fff',fontWeight:600}}>Q4 Lead Nurture Campaign</b>
            <span className="pill" style={{marginLeft:10,fontSize:10,padding:'2px 8px'}}>Draft</span>
          </div>
        </div>

        <div className="wf-tabs" style={{padding:0,border:0}}>
          {['builder','settings','enrollment','reports','activity'].map(t=>(
            <div key={t} className={'t '+(tab===t?'active':'')} onClick={()=>setTab(t)}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </div>
          ))}
        </div>

        <div className="row" style={{gap:8}}>
          <button className="iconbtn"><Ico.History size={14}/></button>
          <button className="btn">Test</button>
          <button className="btn">Save</button>
          <button className="btn primary">Publish</button>
        </div>
      </div>

      <div className="wf-shell">
        <div className="wf-actions">
          <div className="wf-search">
            <Ico.Search size={13}/>
            <span>Search actions...</span>
          </div>
          {Object.entries(actions).map(([cat,list])=>(
            <div key={cat}>
              <h4>{cat}</h4>
              {list.map(a => {
                const Icon = window.Ico[a.i];
                return (
                  <div key={a.n} className={'wf-action '+a.k}>
                    <Icon size={13}/> {a.n}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{marginTop:18,padding:14,borderRadius:9,border:'1px dashed var(--line-2)',fontSize:11.5,color:'var(--ink-mute)',textAlign:'center'}}>
            Drag actions to the canvas
          </div>
        </div>

        <div className="wf-canvas">
          <div className="wf-canvas-bg"></div>

          <div className="wf-toolbar">
            <button className="b">+</button>
            <button className="b">−</button>
          </div>
          <div className="wf-zoom">100%</div>
          <button className="b" style={{position:'absolute',top:14,left:96,zIndex:5,width:30,height:30,borderRadius:8,background:'#11141e',border:'1px solid var(--line)',color:'var(--ink-dim)'}}>
            <Ico.Maximize size={13}/>
          </button>

          <div className="wf-toggle">
            {active?'Active':'Inactive'}
            <span className={'toggle '+(active?'on':'')} onClick={()=>setActive(!active)}></span>
          </div>

          <div className="wf-stage">
            <div className="wf-stage-inner">
              <svg className="wf-svg" width="1200" height="1300">
                {edges.map(([from,to,kind],i)=>{
                  const a = nm(from), b = nm(to);
                  if(!a||!b) return null;
                  const x1 = a.x+85, y1 = a.y+62;
                  const x2 = b.x+85, y2 = b.y;
                  const my = (y1+y2)/2;
                  const path = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
                  const stroke = kind==='yes' ? '#3ddc9755' : kind==='no' ? '#ff5c7a55' : '#2a2f4a';
                  return <path key={i} d={path} stroke={stroke} strokeWidth="1.4" fill="none" />;
                })}
              </svg>

              {edges.filter(e=>e[2]).map(([from,to,kind],i)=>{
                const a = nm(from), b = nm(to);
                const x = (a.x+b.x)/2 + 85;
                const y = (a.y+b.y)/2 + 25;
                return (
                  <div key={i} className={'branch-label '+kind} style={{left:x-15,top:y}}>
                    {kind.toUpperCase()}
                  </div>
                );
              })}

              {nodes.map(n=>{
                const Icon = window.Ico[nodeIcon(n.type)];
                return (
                  <div key={n.id}
                    className={'node '+n.type+(selected===n.id?' selected':'')}
                    style={{left:n.x,top:n.y}}
                    onClick={()=>setSelected(n.id)}>
                    <div className="head"><Icon size={12}/> {n.title}</div>
                    <div className="body">{n.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="wf-mini">
            <div className="wf-mini-inner">
              {nodes.map(n=>(
                <span key={n.id} className="wf-mini-dot" style={{left:n.x*0.1,top:n.y*0.05}}></span>
              ))}
              <div className="wf-mini-frame" style={{left:30,top:20,width:60,height:36}}></div>
            </div>
          </div>

          <div className="wf-controls">
            <button><Ico.ZoomOut size={14}/></button>
            <button><Ico.ZoomIn size={14}/></button>
            <button><Ico.Maximize size={14}/></button>
          </div>
        </div>

        <div className="wf-inspector">
          <h3>{inspector.title} <button className="iconbtn" style={{width:24,height:24,border:0}}><Ico.X size={13}/></button></h3>
          <div className="desc">
            {inspector.type==='wait' && 'Add a delay before moving to the next action.'}
            {inspector.type==='email' && 'Send an email to the contact in this branch.'}
            {inspector.type==='cond' && 'Branch the workflow based on a condition.'}
            {inspector.type==='start' && 'Defines who enters this workflow.'}
            {inspector.type==='end' && 'Marks the end of this workflow.'}
            {inspector.type==='tag' && 'Add a tag to this contact.'}
            {inspector.type==='sms' && 'Send an SMS to the contact.'}
            {inspector.type==='task' && 'Create a task for the assigned rep.'}
            {inspector.type==='update' && 'Update a field on the contact record.'}
            {inspector.type==='list' && 'Add the contact to a list.'}
          </div>

          {inspector.type==='wait' && <>
            <div className="field">
              <label>Wait Type</label>
              <select><option>Fixed Time</option><option>Until Event</option><option>Random Window</option></select>
            </div>
            <div className="field">
              <label>Duration</label>
              <div className="row2">
                <input className="input" defaultValue="2"/>
                <select><option>Days</option><option>Hours</option><option>Minutes</option></select>
              </div>
            </div>
            <div className="field">
              <label className="check on" onClick={()=>{}}>
                <span className="box"><Ico.Check size={10}/></span>
                Business Days Only
              </label>
            </div>
            <div className="field">
              <label>Time</label>
              <input className="input" defaultValue="09:00 AM"/>
            </div>
            <div className="field">
              <label>Label <span className="counter">11/50</span></label>
              <input className="input" defaultValue="Wait step"/>
            </div>
            <div className="field">
              <label>Description (Optional) <span className="counter">31/200</span></label>
              <textarea defaultValue="Wait 2 days before the next email"></textarea>
            </div>
          </>}

          {inspector.type==='email' && <>
            <div className="field"><label>Email Template</label>
              <select><option>{inspector.desc}</option><option>Use custom template</option></select>
            </div>
            <div className="field"><label>Subject Line</label><input className="input" defaultValue="Quick question for you"/></div>
            <div className="field"><label>Sender</label><select><option>Emma (AI Agent)</option><option>Account owner</option></select></div>
            <div className="field"><label>Body Preview</label><textarea defaultValue={"Hi {{first_name}},\n\nNoticed you've been exploring how teams scale ops without growing headcount..."} /></div>
          </>}

          {inspector.type==='cond' && <>
            <div className="field"><label>Condition</label><select><option>{inspector.desc}</option><option>Has clicked link</option><option>Has replied</option></select></div>
            <div className="field"><label>Time Window</label>
              <div className="row2">
                <input className="input" defaultValue="3"/>
                <select><option>Days</option><option>Hours</option></select>
              </div>
            </div>
          </>}

          <button className="btn danger" style={{position:'absolute',right:18,bottom:18}}>Delete</button>
        </div>
      </div>
    </div>
  );
}

window.CampaignsPage = CampaignsPage;
