// Shared mock data
const DATA = {
  user: { name: 'Sales Team', plan: 'Pro Plan', initials: 'ST' },
  agent: { name: 'Emma', role: 'AI Sales Agent' },

  conversations: [
    { id: 'c1', name: 'Jordan Lee', initials: 'JL', org: 'VP of Operations @ Summit Ridge', preview: 'Yes, that would be helpful. What\'s the next step?', time: '9:09 PM', tags: ['High Intent', 'Pricing Interested'], unread: 0, active: true },
    { id: 'c2', name: 'Alex Morgan', initials: 'AM', org: 'Head of Growth @ Acme Corp', preview: 'Revra connects seamlessly with your CRM, email...', time: '10:35 AM', tags: ['Qualifying'], unread: 2 },
    { id: 'c3', name: 'Priya Shah', initials: 'PS', org: 'CTO @ Northbeam Inc.', preview: 'Sounds interesting. How does pricing work?', time: 'Yesterday', tags: ['Demo Scheduled'], unread: 0 },
    { id: 'c4', name: 'Marcus Chen', initials: 'MC', org: 'Director of Sales @ Brightside', preview: 'Let me check with my team and circle back.', time: 'Yesterday', tags: ['Follow-up'], unread: 0 },
    { id: 'c5', name: 'Diana Roth', initials: 'DR', org: 'COO @ Lunar Labs', preview: 'Send me the deck and I\'ll review tonight.', time: 'May 22', tags: [], unread: 0 },
    { id: 'c6', name: 'Sam Patel', initials: 'SP', org: 'Founder @ Vertex Solutions', preview: 'Booked. See you Thursday at 3pm.', time: 'May 21', tags: ['Booked'], unread: 0 },
    { id: 'c7', name: 'Rita Voss', initials: 'RV', org: 'VP Marketing @ TerraNova', preview: 'Thanks for the intro — would love a chat.', time: 'May 20', tags: ['New'], unread: 1 },
  ],

  jordanThread: [
    { who:'them', text:'Hey! Saw your note about helping ops teams save time without adding headcount. Curious how that works in practice.', time:'9:07 PM' },
    { who:'me', text:'Great question, Jordan. We typically help teams automate manual follow-ups and meeting scheduling — freeing up 10+ hours per rep each week.\n\nWant to see how it could work for Summit Ridge?', time:'9:08 PM' },
    { who:'them', text:'Yes, that would be helpful. What\'s the next step?', time:'9:09 PM' },
    { who:'me', text:'Perfect. How does Tuesday at 10:00 AM PT look for a quick walkthrough?', time:'9:09 PM' },
  ],

  pipeline: {
    columns: [
      { id:'new', title:'New Leads', count:42, value:'$580K', deals:[
        { id:'d1', name:'Northbeam Inc.', role:'VP of Sales', source:'Website', time:'2 min ago', live:true },
        { id:'d2', name:'Summit Logistics', role:'Operations Director', source:'Inbound Call', time:'5 min ago', live:true },
        { id:'d3', name:'Lunar Labs', role:'COO', source:'Website', time:'7 min ago' },
        { id:'d4', name:'Vertex Solutions', role:'Sales Manager', source:'Referral', time:'9 min ago', live:true },
      ]},
      { id:'qual', title:'Qualified', count:31, value:'$720K', deals:[
        { id:'d5', name:'RingCentral', role:'Sales Director', score:82, time:'15 min ago' },
        { id:'d6', name:'Pioneer Consulting', role:'Partner', score:78, time:'25 min ago' },
        { id:'d7', name:'DataForge', role:'Head of Revenue', score:76, time:'30 min ago' },
        { id:'d8', name:'BluePeak Systems', role:'President', score:74, time:'1 hr ago' },
      ]},
      { id:'booked', title:'Booked', count:24, value:'$820K', deals:[
        { id:'d9', name:'TerraNova', role:'CTO', date:'May 24, 11:00 AM' },
        { id:'d10', name:'Brightside Health', role:'VP of Ops', date:'May 24, 2:00 PM' },
        { id:'d11', name:'StrataOps', role:'Director of IT', date:'May 25, 10:30 AM' },
        { id:'d12', name:'Momentum AI', role:'Head of Growth', date:'May 25, 1:30 PM' },
      ]},
      { id:'prog', title:'In Progress', count:18, value:'$280K', deals:[
        { id:'d13', name:'CloudWave', role:'VP of Sales', stage:'Proposal Sent', progress:60 },
        { id:'d14', name:'Addison Tech', role:'Head of Procurement', stage:'Negotiation', progress:75 },
        { id:'d15', name:'InfraCore', role:'COO', stage:'Technical Validation', progress:45 },
        { id:'d16', name:'Zenith Retail', role:'CEO', stage:'Proposal Sent', progress:30 },
      ]},
      { id:'won', title:'Closed Won', count:11, value:'$80K', deals:[
        { id:'d17', name:'Greenfield Co.', price:'$24,000', won:true },
        { id:'d18', name:'Catalyst One', price:'$18,500', won:true },
        { id:'d19', name:'Lexon Partners', price:'$22,000', won:true },
      ]},
    ]
  },

  leads: [
    { name:'Michael Thompson', email:'michael@northbeam.com', org:'Northbeam Inc.', role:'CTO', score:84, hot:'hot', stage:'Qualified', last:'Today, 9:10 PM' },
    { name:'Jordan Lee', email:'jordan.lee@summitridge.com', org:'Summit Ridge', role:'VP Operations', score:91, hot:'hot', stage:'Booked', last:'Today, 9:09 PM' },
    { name:'Alex Morgan', email:'alex@acmecorp.com', org:'Acme Corporation', role:'Head of Growth', score:78, hot:'warm', stage:'Qualifying', last:'Today, 10:35 AM' },
    { name:'Priya Shah', email:'p.shah@northbeam.com', org:'Northbeam Inc.', role:'CTO', score:72, hot:'warm', stage:'Demo Scheduled', last:'Yesterday' },
    { name:'Diana Roth', email:'diana@lunarlabs.io', org:'Lunar Labs', role:'COO', score:65, hot:'warm', stage:'Nurture', last:'Yesterday' },
    { name:'Marcus Chen', email:'marcus@brightside.health', org:'Brightside Health', role:'Dir. Sales', score:58, hot:null, stage:'Follow-up', last:'2d ago' },
    { name:'Sam Patel', email:'sam@vertex.io', org:'Vertex Solutions', role:'Founder', score:88, hot:'hot', stage:'Booked', last:'2d ago' },
    { name:'Rita Voss', email:'rita@terranova.co', org:'TerraNova', role:'VP Marketing', score:51, hot:null, stage:'New', last:'3d ago' },
    { name:'Owen Park', email:'owen@cloudwave.com', org:'CloudWave', role:'VP Sales', score:81, hot:'hot', stage:'Proposal', last:'3d ago' },
    { name:'Lina Werner', email:'l.werner@strataops.io', org:'StrataOps', role:'Dir. IT', score:69, hot:'warm', stage:'Booked', last:'4d ago' },
  ],

  integrations: [
    { name:'Salesforce', desc:'Sync contacts, accounts, and opportunities bi-directionally.', initials:'SF', color:'#1798c1', connected:true },
    { name:'HubSpot', desc:'Two-way contact sync and deal stage updates.', initials:'HS', color:'#ff7a59', connected:true },
    { name:'Gmail', desc:'Send and track emails directly from Revra.', initials:'GM', color:'#ea4335', connected:true },
    { name:'Outlook', desc:'Calendar and email sync with Microsoft 365.', initials:'OL', color:'#0078d4', connected:false },
    { name:'Slack', desc:'Notify channels on lead activity and meetings.', initials:'SL', color:'#4a154b', connected:true },
    { name:'Zoom', desc:'Auto-create meeting links for booked calls.', initials:'ZM', color:'#2d8cff', connected:true },
    { name:'LinkedIn', desc:'Outreach and InMail messaging via Sales Nav.', initials:'IN', color:'#0a66c2', connected:false },
    { name:'Stripe', desc:'Track revenue and convert deals to invoices.', initials:'ST', color:'#635bff', connected:false },
  ],
};

window.DATA = DATA;
