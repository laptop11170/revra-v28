**LIGHTFIELD.APP**

**Product Requirements Document**

Deep Research Edition  |  May 2026

| Document Type Comprehensive PRD | Research Date May 2, 2026 |
| :---- | :---- |
| Product **Lightfield — AI-Native CRM** | Stage **Generally Available (Nov 2025\)** |

# **1\. Executive Summary**

Lightfield is an AI-native Customer Relationship Management (CRM) platform built on the thesis that the future of CRM is unstructured-data-first rather than fields-first. Founded by Keith Peiris (ex-Meta, Instagram Direct lead: 0 → 500M users) and Henri Liriani (ex-Meta CPO), the company exited Tome — a presentation tool they built to 25M users and $81M in funding at a $300M valuation — to build Lightfield from scratch.

The core architectural bet: instead of forcing every interaction into predefined fields and dropdown menus, Lightfield ingests the complete record of what customers actually say — emails, meeting transcripts, calls — and derives structured data from that unstructured memory. The AI then acts on this full context to update records, answer questions, draft emails, extract action items, and run outbound campaigns.

| Core Product Philosophy CRM should build itself. Every customer conversation compounds into institutional memory. The AI extracts structure from unstructured data — not the other way around. |
| :---- |

Lightfield reached general availability in November 2025 and ships weekly product updates. It is SOC 2 Type II compliant, HIPAA-ready (Pro/Growth), and trusted by high-growth startups. The product is positioned as a direct replacement for HubSpot and Salesforce, not a supplement to them.

## **1.1 Product Pillars**

* Zero manual data entry — the CRM fills itself from email, calendar, and calls

* Full conversation memory — not disconnected records, but continuous relationship context

* AI agent that acts — not just answers but executes tasks, drafts, enrichments, and workflows

* Outbound on your CRM data — pipeline generation trained on your own closed-won customer patterns

# **2\. Problem Statement**

## **2.1 The CRM Maintenance Trap**

Traditional CRM systems (Salesforce, HubSpot, Pipedrive) were built on a foundational assumption: humans will keep the data current. This assumption breaks at scale:

* Activity never makes it in — a typical sales rep has 5–10 calls a day and logs fewer than half of them

* Records go stale within days — a deal stage filled 3 weeks ago with 4 emails and 2 calls since is worse than useless

* Context lives in people's heads — institutional knowledge about why a deal stalled or which contact actually holds budget disappears when a rep leaves or transfers

* AI can't help on incomplete data — deploying AI agents or onboarding new reps on an out-of-date CRM produces bad outputs

## **2.2 Structural Limitations of Legacy CRMs**

Competitors like Attio and Clay have improved UX but are still fundamentally structured-data-first systems — they require humans to define schema and fill fields. AI bolted onto structured-first CRMs is constrained by the data that was manually entered. Lightfield bets that starting from unstructured conversations and deriving structure from them is the winning architecture for an AI-native world.

## **2.3 Outbound is Broken for Early-Stage Teams**

* A standard outbound stack (data enrichment \+ inbox warming \+ sequencing) costs $20,000+ annually before sending a single email

* Sequences break and tools go offline constantly — over half of outbound time goes to system maintenance, not selling

* Founders building outbound have no methodology — without a tested playbook, every campaign feels like guesswork

# **3\. Target Users & Use Cases**

## **3.1 Primary Users**

| Segment | Core Need | Key Value |
| :---- | :---- | :---- |
| Founders doing founder-led sales | No time for CRM admin; need all context captured | Zero data entry; complete relationship history from day 1 |
| Early GTM teams (1-10 reps) | Keep CRM current without a RevOps hire | Continuous auto-updates; AI handles all logging |
| Growth-stage sales orgs | Scale outbound without a large SDR team | Pipeline generation on top of existing CRM data |
| Sales & success leaders | Track every touchpoint; automate follow-ups | AI task management \+ deal reviews \+ account plans |
| Product teams | Understand customer feature requests at scale | Natural-language queries across all call transcripts |

# **4\. Product Modules & Feature Inventory**

Lightfield is structured around four interconnected product modules, all running on a shared CRM data layer.

## **4.1 Module 1: Automatic Data Capture**

The foundational layer. Lightfield connects to email and calendar and silently builds and maintains the CRM from every conversation — with zero behavior change required from the user.

### **4.1.1 Email Sync**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Gmail & Outlook native connect | Connect Gmail or Outlook. All sent/received emails matched to contacts, accounts, and deals automatically. No BCCing, no forwarding. | All plans |
| Smart record matching | Matches incoming emails to existing records using email addresses and conversation context. Prevents duplicates, merges cleanly. | All plans |
| Retroactive history sync | On connect, syncs up to 2 years of email and calendar history and reconstructs relationship history retroactively. | All plans |
| Custom field backfill | When a new custom field is added (e.g. 'current CRM', 'budget timeline'), AI scans ALL past conversations and backfills that field across all records. | All plans |
| Action item extraction | Identifies commitments, next steps, and requests from email threads and surfaces them in the task view. | All plans |

### **4.1.2 Calendar Sync**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Google Calendar & Outlook Calendar | Native connection to both major calendar platforms. | All plans |
| Auto contact/account creation | When a meeting is scheduled with a new prospect, Lightfield creates the contact and account before the call begins. | All plans |
| Record auto-update on reschedule | When a follow-up is added to calendar, the existing record is updated automatically. | All plans |
| Internal meeting exclusion | Internal meetings excluded from recording and logging by default. Configurable per workspace. | All plans |

### **4.1.3 Meeting Recording & Intelligence**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Built-in meeting recorder | Records every external meeting on Zoom, Google Meet, and Microsoft Teams. No Chrome extension, no separate app required. | All plans |
| Full transcription | Every call gets a timestamped, speaker-separated full transcript. | All plans |
| Auto-link to account/contact/deal | Every transcript is automatically linked to the correct account, contact, and opportunity record. | All plans |
| Meeting summaries | AI summarizes every call into discussion points, decisions made, and open questions. | All plans |
| Action item detection | Identifies all commitments and next steps from the call and adds them to the task view. | All plans |
| Shareable meeting links | Every meeting gets a shareable link. Team members and external viewers can access recording, transcript, summary, and tasks. | All plans |
| Granola/Fathom MCP ingestion | Can ingest recordings and transcripts from existing tools via MCP during transition. | All plans |
| Call intelligence analytics | Record, transcribe, and analyze calls for patterns, objections, sentiment across the pipeline. | All plans |

### **4.1.4 Continuous Record Updates**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Always-on field maintenance | Fields that go stale in other CRMs (last contacted, deal stage, key contacts) stay current automatically after every email or call. | All plans |
| AI-suggested updates with approval gate | CRM field changes are suggested by AI and shown for user review before being applied. Nothing changes without user approval. | All plans |
| Manual record merge | Users can manually merge duplicate records when needed. | All plans |
| CSV import (agentic) | Agent can import opportunities, accounts, and contacts from CSV. Duplicate-safe — re-running an interrupted import doesn't create duplicates. | All plans |

## **4.2 Module 2: AI Sales Assistant**

The day-to-day workhorse. Lightfield's AI agent operates across all your CRM data to answer questions, draft communications, surface tasks, and generate insights.

### **4.2.1 Natural Language Queries (Q\&A Agent)**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Plain English questions | Ask anything: 'What did the VP of Sales at Acme say about budget?' Returns the answer with a citation link to the exact moment in the call. | All plans |
| Cross-record synthesis | Ask questions that span multiple accounts: 'Which customers asked for this feature, and why?' Draws from all emails, calls, and notes. | All plans |
| Pipeline-wide pattern recognition | Ask 'Which deals are stalling and why?' or 'Where are objections clustering?' AI reads across all conversations. | All plans |
| AI deal reviews | On-demand structured review of any deal's health, risks, and recommended next steps. | All plans |
| AI account plans | Generate a full account plan for any account using all captured conversation history. | All plans |
| Unlimited agent queries | No cap on the number of Q\&A queries run. | All plans |

### **4.2.2 AI Actions**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Follow-up email drafting | After every meeting, AI drafts a personalized follow-up using the customer's own words and your communication tone learned from email history. | All plans |
| Batch outreach personalization | Draft personalized outreach to a list of contacts in minutes, with each email referencing what was actually discussed. | All plans |
| Proposal generation | Agent can generate proposals and account documents on request. | All plans |
| Task creation from conversations | Agent creates tasks based on call commitments and email follow-through expectations. | All plans |
| Account reassignment via agent | Ask the agent to reassign accounts, update stages, or tag segments based on what was said in conversations. | All plans |
| Stalled deal revival | Search for prospects who went quiet after a positive signal; have the agent draft tailored revival emails for each. | All plans |
| Report generation (AI-native) | Ask the agent to generate pipeline analysis, win/loss breakdowns, and custom dashboards in plain English. | All plans |
| Code execution | Agent can write and execute code against your CRM data for custom analyses and integrations. | All plans |

### **4.2.3 Meeting Preparation**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Auto-generated meeting prep | Before any external meeting, Lightfield drafts prep using all past calls, emails, and account history with that contact. | All plans |
| Context on who you're meeting | Surfaces previous discussion topics, open items, commitments not fulfilled, and key background on every attendee. | All plans |
| Meeting prep delivery | Prep delivered before the meeting without requiring any request from the user. | All plans |

### **4.2.4 Task Management**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Central task view | All extracted action items from calls and emails surface in a single task view, linked to the source record. | All plans |
| Task surfacing from commits | Listens for language indicating commitment ('I'll send you the deck', 'Let's schedule a follow-up by Friday') and creates tasks. | All plans |
| AI task suggestions | Agent proactively suggests tasks based on relationship signals (e.g. 'You haven't followed up with Acme in 14 days'). | All plans |
| Background agent tasks | Long-running agent operations (enrichment passes, bulk updates) run in the background without blocking the UI. | All plans |

## **4.3 Module 3: CRM Data Layer & Configuration**

The underlying data model that everything else builds on. Designed to start flexible and add structure over time as the business learns what it needs.

### **4.3.1 Core Data Objects**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Contacts | Individual people with full interaction history, enrichment data, and linked accounts/deals. | All plans |
| Accounts | Companies with full relationship timeline, enrichment, and associated contacts and opportunities. | All plans |
| Opportunities / Deals | Pipeline objects with stage tracking, associated contacts, deal context, and linked conversations. | All plans |
| Custom Objects (Pro+) | Define additional object types specific to your business (e.g. 'Partnership', 'Product Request'). | Pro, Growth |
| Pipeline management | Multi-stage pipeline with kanban and table views, configurable stages, and AI-assisted stage progression. | All plans |
| List management | Build and manage segmented lists of contacts or accounts with filter logic and bulk operations. | All plans |

### **4.3.2 Data Model Configuration**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Custom properties | Define custom fields of any type on any object. No upfront schema required — add fields at any time. | All plans |
| Retroactive backfill | Adding a new field retroactively triggers an AI scan of all past conversations to populate that field across all records. | All plans |
| Table & kanban views | View any object list as a table with sortable columns or as a kanban board. Tables include column-footer math operations. | All plans |
| Bulk select & delete | Select multiple records for bulk operations including deletion. | All plans |
| ⌘K global search | Command-palette style global search and navigation across all records. | All plans |
| Dark mode | Full dark mode support across the app. | All plans |
| Advanced permissioning (Pro+) | Group-level configuration and access control for multi-team workspaces. | Pro, Growth |

### **4.3.3 Data Enrichment**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Web enrichment | AI enriches account and contact records with publicly available information from the web. | All plans |
| Automatic data enrichment | Records are enriched continuously as new information becomes available, not just at creation time. | All plans |
| Third-party signal enrichment (Growth) | Integrates external data signals including hiring, funding, tech stack, and investor activity to score accounts. | Growth only |
| Custom enrichment via agent | Tell the agent to enrich accounts or contacts with whatever specific data field you need. | All plans |

## **4.4 Module 4: Pipeline Generation (Managed Service)**

An end-to-end outbound execution service for early-stage teams that runs on top of Lightfield's CRM data. Available as part of the Growth plan's managed service offering.

### **4.4.1 Target Account Intelligence**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| ICP-trained account scoring | Scores every target account by fit, timing, and connection strength — trained on patterns from your own closed-won customers, not a generic ICP. | Growth |
| Scored account list (refreshed) | Continuously refreshed list of target accounts scored on hiring, funding, tech stack, and investor signals. | Growth |
| Reasoning-backed scores | Every account score comes with AI-generated reasoning grounded in your closed-won data. | Growth |
| Warm intro path surfacing | Maps your team's LinkedIn connection graph to target accounts; surfaces warm intro paths where they exist. | Growth |

### **4.4.2 Contact Identification & Routing**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Verified contact lookup | Surfaces verified email addresses and LinkedIn profiles for key contacts at each target account. | Growth |
| Network cross-reference | Cross-references your full team's professional network for warm introduction opportunities at each target account. | Growth |
| Sequence routing | Routes contacts to the appropriate sequence based on their role, account score, and relationship path. | Growth |

### **4.4.3 Sequence Execution**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Transcript-based messaging | Sequences are drafted using exact language and phrases from your own call transcripts and email threads — language that has actually moved your customers. | Growth |
| Email & LinkedIn sequences | Multi-channel sequences across email and LinkedIn. | Growth |
| Automated sequence delivery | The Lightfield agent runs the cadence, escalates replies for human review, and reroutes contacts when sequences complete. | Growth |
| Inbox warming | Managed inbox warming to protect deliverability. | Growth |
| Weekly hypothesis-based reviews | Forward-deployed team meets weekly to review results, decide what's working, and plan next experiments. | Growth |

### **4.4.4 Pipeline Analytics**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Natural language outbound reporting | Ask which segments convert, which messages get opened, which accounts went quiet — via the same agent chat interface. | Growth |
| Experiment design & tracking | Each engagement built around testable hypotheses scoped with the customer's team. | Growth |

## **4.5 Module 5: Workflows & Automation**

A no-code/low-code automation layer that connects CRM events to agent actions and external systems.

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Agent workflow builder | Visual builder for creating automated workflows that trigger the AI agent to take actions. | All plans |
| Event-triggered workflows | Workflows fire on CRM events: record created, field updated, meeting recorded, email received, etc. | All plans |
| Webhook-powered triggers | Workflows can be triggered by inbound webhooks from external systems. | All plans |
| HTTP request actions | Workflows can send outbound HTTP requests to external APIs and services. | All plans |
| Background execution | Long-running workflow tasks execute in the background without blocking the UI. | All plans |
| Data sync & automation | Workflows can sync and transform data between Lightfield objects and external systems. | All plans |
| Workflow event limits | Startup: 1,000/month. Pro: 20,000/month. Growth: Custom. | Tiered |

## **4.6 Module 6: Integrations & API**

### **4.6.1 Native Integrations**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Gmail | Full bidirectional email sync. Emails matched to records automatically. | All plans |
| Outlook / Outlook Calendar | Full email and calendar sync for Microsoft workspace users. | All plans |
| Google Calendar | Calendar sync with auto-contact/account creation on scheduling. | All plans |
| Zoom | Native meeting recording integration. No bot or extension required. | All plans |
| Google Meet | Native meeting recording. No bot or extension required. | All plans |
| Microsoft Teams | Meeting recording support. | All plans |
| Granola (via MCP) | Ingest recordings and transcripts from Granola during CRM transition. | All plans |
| Stripe | Referenced in architecture context — billing integration. | TBC |

### **4.6.2 API & Developer Access**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| REST API (open beta) | Core REST API for reading and writing CRM objects. Covers accounts, contacts, opportunities, and activities. Every new capability ships with API support. | All plans |
| API rate limits | Standard rate limits on Startup; higher limits on Pro; custom on Growth. | Tiered |
| MCP server | Lightfield publishes an MCP server enabling AI agents (including Claude, Cursor, etc.) to read and interact with CRM data. | All plans |
| CSV import/export | Import data from existing CRMs; export all data at any time. | All plans |
| Skills & Knowledge API | Recently launched: allows configuring AI Skills (custom agent behaviors) and Knowledge (context fed into every agent response). | All plans |

## **4.7 Module 7: Skills & Knowledge (New — April 2026\)**

Launched in April 2026, Skills and Knowledge lets teams configure the AI agent's context and behaviors for their specific business.

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Skills | Custom agent behaviors — define what the agent does when triggered (e.g. 'When a deal closes, generate an account plan and tag the CSM'). | All plans |
| Knowledge | Feed context about your company, product, and market into the agent so every answer reflects your business, not generic CRM logic. | All plans |
| Tone & voice learning | Agent learns your communication style from email history to match your voice in all drafted communications. | All plans |
| No upfront configuration required | Lightfield captures and builds context from day 1\. Skills and Knowledge allow refinement over time, not setup-gating. | All plans |

# **5\. Analytics & Reporting**

| Feature | Description | Plan |
| :---- | :---- | :---- |
| Basic reporting | Out-of-the-box pipeline reports, activity summaries, deal velocity. | All plans |
| Custom dashboards (Pro+) | User-configurable dashboards with custom metrics and visualizations. | Pro, Growth |
| AI-generated reports | Ask the agent to generate any report in natural language — win/loss analysis, ICP shift, feature request clustering, etc. | All plans |
| Table column math | Configurable mathematical operations in table footers (sum, average, count, etc.). | All plans |
| Improved data visualizations | Charting and visual data display within the agent interface. | All plans |
| Code execution for custom analytics | Agent can write and run code against the data layer for bespoke analysis. | All plans |

# **6\. Security, Privacy & Compliance**

| Control | Details |
| :---- | :---- |
| **SOC 2 Type II** | Fully audited and compliant. Certificate available via Vanta trust portal. |
| **HIPAA-ready** | Available on Pro and Growth plans. Suitable for healthcare-adjacent customer data. |
| **Model training policy** | Customer data is NEVER used to train models. Zero exceptions. |
| **Data export** | All data exportable at any time via CSV or API. No lock-in. |
| **User data control** | Users choose which email and calendar accounts to connect. Internal meetings excluded by default. |
| **Approval gate for AI changes** | No CRM field is updated without user review and approval. AI suggests; human approves. |
| **Record capture control** | Users can exclude specific email accounts, meetings, or contacts from capture. |
| **GDPR/Data sovereignty** | Built in San Francisco with enterprise-grade data handling practices. |

# **7\. Pricing & Plans**

Lightfield offers three tiers supporting the full company lifecycle from inception to growth stage. All plans include the core CRM functionality, AI agent, meeting recorder, and API access.

| Feature | Startup | Pro | Growth |
| :---- | :---- | :---- | :---- |
| **Records** | Up to 30,000 | Up to 100,000 | Custom |
| **Workflow events / month** | 1,000 | 20,000 | Custom |
| **AI agent queries (Q\&A)** | ✓ | ✓ | ✓ |
| **AI agent actions** | ✓ | ✓ | ✓ |
| **AI email drafts** | ✓ | ✓ | ✓ |
| **Web enrichment** | ✓ | ✓ | ✓ |
| **AI task management** | ✓ | ✓ | ✓ |
| **AI report generation** | ✓ | ✓ | ✓ |
| **AI account plans** | ✓ | ✓ | ✓ |
| **AI deal reviews** | ✓ | ✓ | ✓ |
| **Automatic record creation** | ✓ | ✓ | ✓ |
| **Continuous record updates** | ✓ | ✓ | ✓ |
| **Custom properties & backfill** | ✓ | ✓ | ✓ |
| **Custom objects** | — | ✓ | ✓ |
| **Meeting recording & transcription** | ✓ | ✓ | ✓ |
| **Call intelligence** | ✓ | ✓ | ✓ |
| **Agent workflow builder** | ✓ | ✓ | ✓ |
| **Event-triggered workflows** | ✓ | ✓ | ✓ |
| **Basic reporting** | ✓ | ✓ | ✓ |
| **Custom dashboards** | — | ✓ | ✓ |
| **API access** | Standard | Higher limits | Custom |
| **MCP server** | ✓ | ✓ | ✓ |
| **Target account list creation** | — | — | ✓ |
| **Third-party signal enrichment** | — | — | ✓ |
| **Warm intro paths** | — | — | ✓ |
| **Automated sequence delivery** | — | — | ✓ |
| **Advanced user permissioning** | — | ✓ | ✓ |
| **HIPAA-ready support** | — | ✓ | ✓ |
| **Migration services** | — | ✓ | ✓ |
| **Support** | Slack & email | Dedicated CSM | Forward-deployed team |
| **Price (per user/mo)** | $79 (monthly) | $199 (annual) | Custom |

# **8\. Onboarding & Migration**

## **8.1 Time to Value**

* Connect Gmail or Outlook → Lightfield syncs 2 years of history → CRM populates automatically within minutes

* No schema to design, no fields to configure, no workflows required to get started

* Upload CSV from old CRM → agent imports and deduplicates records automatically

* Target setup time: 2–5 minutes to first populated pipeline

## **8.2 Migration Services**

* Self-serve: CSV import with agent-guided deduplication (all plans)

* Assisted migration: white-glove migration for Pro and Growth plans including data mapping and validation

* Parallel run: recommended approach is running Lightfield alongside existing CRM for 2–4 weeks before full cutover

* Historical intelligence: even without migrating old CRM data, connecting email gives Lightfield 2 years of relationship context immediately

# **9\. Competitive Landscape**

| Competitor | What They Do | Lightfield Advantage |
| :---- | :---- | :---- |
| HubSpot / Salesforce | Traditional structured-data CRM with AI features bolted on | Zero data entry; AI works on full conversation history, not fields humans remembered to fill |
| Attio | Modern structured-data CRM with better UX | Still fields-first; AI is constrained to what was manually entered |
| Clay | Data enrichment and outbound sequencing platform | Clay starts from a cold database; Lightfield starts from your own closed-won customers |
| Granola / Fathom | Standalone AI meeting recorders that sync to CRM | Transcripts siloed from CRM; AI can't reason across emails \+ meetings \+ deals together |
| AI BDRs (various) | Replace entry-level SDRs at established sales orgs | Lightfield pipeline gen is for 0-to-1 teams building a motion, not automating an existing one |

# **10\. Company & Team**

## **10.1 Founders**

* Keith Peiris (CEO) — Led Instagram Direct from 0 to 500M users; co-founded Tome (25M users, $81M raised at $300M valuation from Coatue, Greylock, Lightspeed, 8VC, GV)

* Henri Liriani (CPO) — Also ex-Meta where they built products for billions of users; co-founded Tome

## **10.2 Notable Facts**

* Both founders walked away from Tome at $300M valuation and 25M users to build Lightfield

* Built in San Francisco; team available on standby for onboarding

* Ships weekly product updates (documented public changelog since Nov 2025\)

* Trusted by Reeva, Intent HQ, CashQ, Covent, Voker, 14.ai, New Generation, and others

# **11\. Recent Changelog Highlights (Nov 2025 – May 2026\)**

Lightfield ships weekly. Key milestones:

| Date | Release |
| :---- | :---- |
| **Apr 2026** | Skills & Knowledge launched \+ MCP server (open beta). Agent can now be configured with custom behaviors and business context. |
| **Apr 2026** | API additions \+ improved data visualizations. Charting and analytics enhancements in agent interface. |
| **Mar 2026** | Table column math, agent data model tools. CRM agent can now read and suggest data model changes. |
| **Mar 2026** | REST API public beta \+ agentic CSV import. Command-K search and navigation launched. |
| **Mar 2026** | Lists \+ background agent tasks \+ HIPAA support \+ API beta access. |
| **Mar 2026** | Bulk delete \+ agent record operations expanded. |
| **Feb 2026** | Contact/account data model improvements. Improved chat interface. Data model flexibility. |
| **Feb 2026** | Code execution in Lightfield agent. Agent can now write and run code against CRM data. |
| **Feb 2026** | Shareable meetings \+ code generation launched. |
| **Feb 2026** | MCP connectors \+ member pages. |
| **Jan 2026** | Dark mode, workflow triggers, full task management system. |
| **Jan 2026** | Agentic workflows, record export, HTTP request actions in workflows. |
| **Jan 2026** | Outlook email sending support. |
| **Dec 2025** | Webhook-powered workflows \+ Outlook Calendar support. |
| **Dec 2025** | Full Microsoft Outlook support (email \+ calendar). |
| **Dec 2025** | Meeting recorder improvements \+ Gemini Pro support. |
| **Nov 2025** | General availability launch \+ suggested record updates \+ support infrastructure. |

# **12\. Strategic Analysis & Founder Perspective**

## **12.1 The Architectural Bet**

Lightfield's fundamental architectural choice — unstructured memory first, structure derived second — is a direct reversal of how every major CRM was built. If this bet is right, competitors cannot replicate it by bolting AI onto their existing systems. The data moat is not the structured fields (which anyone can copy); it's the full-fidelity conversation memory that compounds over time.

## **12.2 Why This Is Relevant for Revra**

| Key Insight for Revra Lightfield is effectively the architecture you're building in the health insurance agent vertical. Their platform is general-purpose; Revra is vertical-specific (health insurance agents). Lightfield's technical choices — continuous auto-capture, AI over unstructured conversation data, pipeline automation on top of CRM context — are the same bets Revra is making. The key differentiation question for Revra is: what does a health insurance agent need that Lightfield's general-purpose platform can't serve? Domain-specific SMS nurturing, NAIC compliance workflows, carrier comparison intelligence, and auto-dialer integration are your moat. |
| :---- |

## **12.3 Gaps & White Spaces**

* No SMS-based AI nurturing (Lightfield focuses on email and calls)

* No auto-dialer / high-volume outbound calling infrastructure

* No domain-specific compliance tooling (HIPAA-ready is a checkbox, not a vertical workflow)

* No mobile app — Lightfield is web-only

* No multi-workspace / agency model (Revra's workspace-to-agent distribution model is a differentiator)

* No carrier or product comparison intelligence baked into the CRM layer

* Marketing automation (Klaviyo-level) explicitly not on their near-term roadmap

**END OF DOCUMENT**

Lightfield.app PRD  •  Deep Research  •  May 2026