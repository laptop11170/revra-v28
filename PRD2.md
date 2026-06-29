# RevRa — Product Requirements Document (Concepts & Workflows)

**Version 2.0 | April 2026**
**Status:** Pre-Development

---

> **Purpose of this document:** This PRD describes the **concepts, business logic, workflows, data flows, and system behaviors** of RevRa — not its visual design, layout, or UI structure. All design references (Notion, LightField CRM, Railway, etc.) and layout specifications are inherited from PRD v1.0. Any section discussing screen positioning, element placement, component dimensions, or visual hierarchy belongs in PRD v1.0 only.

---

## 1. Product Overview

### 1.1 What RevRa Is

**RevRa** is an AI-powered CRM purpose-built for health insurance sales agents in the United States. It is a single operating system that manages the entire lifecycle of an insurance sale — from the moment a lead enters the system, through every call, text, and meeting, to the final policy decision — all while being augmented by AI at every step.

The product's three foundational principles:

1. **Speed of action** — Every agent interaction is designed to get the agent to their next meaningful action (a call, a text, a stage decision) in under three seconds.
2. **AI everywhere** — AI is not a standalone tool. It is woven into every workflow: prioritizing leads, drafting messages, briefing agents before calls, summarizing conversations, and generating daily briefings.
3. **Collaborative independence** — Agents primarily work alone but can instantly share lead context with teammates. Admins have full oversight without being intrusive.

### 1.2 The Core Problem RevRa Solves

Insurance agents lose deals for predictable, preventable reasons:

- **Failure to follow up** — Leads grow cold because agents lose track of who needs a callback.
- **No lead prioritization** — Agents waste time calling low-potential leads while high-potential leads go uncontacted.
- **Administrative overhead** — Agents spend 45+ minutes per day logging calls, sending texts, and updating records manually.
- **Tool fragmentation** — Agents juggle a dialer, SMS platform, email, calendar, CRM, and spreadsheets simultaneously.
- **No AI assistance** — Existing tools don't help agents prepare for calls, draft outreach, or synthesize call outcomes.

RevRa solves all of this by being the single workspace where every lead, every interaction, and every AI-assisted decision lives.

### 1.3 Target Users

| Persona | Role | Primary Goal |
|---|---|---|
| **Marcus Chen** | Independent Medicare Advantage agent | Close more policies, reduce admin work |
| **Sarah Mitchell** | Agency Operations Manager | Distribute leads, monitor agent activity, manage escalations |
| **David Rodriguez** | Platform Owner / Super Admin | Onboard agencies, manage platform subscriptions, monitor platform health |

---

## 2. Architectural Concepts

### 2.1 Two-System Architecture

RevRa operates as **two completely separate web applications** that share no UI but share a database:

- **Agent Workspace Application** — Used by agents, admins, and viewers within an agency. Contains all lead management, communication, scheduling, and workflow tools.
- **Platform Admin Application** — Used exclusively by the Super Admin (platform owner). Contains workspace management, cross-agency analytics, platform-wide integrations, billing oversight, and system health monitoring.

These are separate route groups in the codebase (`(workspace)` and `(admin)`), with separate AppShell layouts and authentication flows. An agent logged into the workspace application cannot access the admin application, and vice versa.

**Why separate:**
- Agents and admins have fundamentally different mental models — agents need action-oriented tools, admins need oversight-oriented dashboards.
- Mixing them creates navigation complexity and security concerns.
- Each can be independently scaled and iterated upon.

### 2.2 Multi-Tenancy Model

RevRa is a **multi-tenant SaaS platform**. The isolation boundary is the **workspace** — each agency (or individual agent) is a workspace. Every database record belongs to a workspace, and data never crosses workspace boundaries except through explicit sharing mechanisms.

```
Platform
 └── Workspace A (Agency: "San Diego Health Agents")
       ├── Users (agents, admins)
       ├── Leads
       ├── Pipeline stages
       ├── Communications (SMS, calls, emails)
       ├── Appointments
       ├── Tasks
       ├── Workflows
       ├── Discussions
       └── Subscriptions
 └── Workspace B (Agency: "Texas Insurance Group")
       └── ... (completely isolated)
```

All shared infrastructure (Twilio, Meta Ads, Emma AI, Stripe) is configured at the platform level by the Super Admin and used by all workspaces. Each workspace's data is segmented by `workspace_id` in every table.

### 2.3 Role-Based Access Control

There are three roles within a workspace, plus one platform-wide role:

| Role | Scope | Dashboard | What They Can Do |
|---|---|---|---|
| **Viewer** | Workspace | Agent | Read-only access to leads, pipeline, inbox, appointments |
| **Agent** | Own leads only | Agent | Manage own leads, call, SMS, email, schedule, use AI |
| **Admin (Workspace)** | All leads in workspace | Agent | Full access to all workspace leads, assign leads, manage team, create workflows |
| **Super Admin (Platform)** | All workspaces | Admin | Full platform access: workspaces, billing, integrations, analytics, system health |

**Lead sharing** overrides the "own leads only" restriction for agents: an agent can share a lead with a teammate, granting either view-only or full edit access for a defined period.

### 2.4 Tech Stack Concept Map

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Server-side rendering, routing, React components |
| State Management | Zustand + TanStack Query | UI state (Zustand) + server/cache state (TanStack Query) |
| Database | Supabase (PostgreSQL) | Relational data storage, real-time subscriptions, auth |
| Authentication | Supabase Auth | Email/password auth, session management, invite flows |
| AI | Custom LLM (Claude Haiku via API gateway) | All AI features: chat, drafts, scoring, briefings, summaries |
| SMS & Voice | Twilio | Programmable SMS, outbound/inbound calls, call recordings, voicemail |
| Payments | Stripe | Subscription billing, billing portal, webhook-based event handling |
| Lead Ads | Meta | Lead capture from Facebook/Instagram ad campaigns |
| AI Voice Agent | Emma AI (third-party) | Autonomous outbound calling with AI conversations |
| Hosting | Railway | Web application, background workers, cron jobs |
| Calendar | Google Calendar API | Bi-directional appointment sync for agents |

---

## 3. Lead Management — Full Lifecycle

### 3.1 What a Lead Is

A **Lead** in RevRa is a complete insurance prospect profile. It is not just a name and phone number — it is a full insurance context that includes:

- **Identity:** Full name, primary phone, secondary phone, email, date of birth, age (computed), state, county, home address
- **Insurance profile:** Coverage type (ACA, Medicare, Final Expense, Life, Group Health), current carrier, policy renewal date, pre-existing conditions (HIPAA-compliant summaries only, not raw medical data), budget/monthly spend, household size, dependents, income range
- **Lead intelligence:** Lead score (0–100, AI-generated), lead source, exclusivity status, tags, outcome (pending, won, lost, lapsed)
- **Assignment:** Assigned agent, assigned date, last contact date, notes
- **Activity history:** A complete, immutable audit log of every action taken on the lead

### 3.2 Lead Sources — How Leads Enter the System

Leads can enter RevRa from four primary sources:

1. **Meta Ads (Facebook/Instagram)** — When someone fills out a lead ad on Meta, the form submission is sent via webhook to RevRa. The Super Admin configures the Meta Ads integration at the platform level. Leads from Meta include campaign metadata (campaign name, form name, ad set) that gets stored on the lead record.

2. **Manual Entry** — An agent or admin creates a lead directly in RevRa through the Add Lead form. This is used for referrals, walk-ins, or leads obtained outside of advertising.

3. **CSV Import** — An admin or agent uploads a CSV/XLSX file containing multiple leads. An AI model reads the header row to intelligently map CSV columns to RevRa fields (e.g., "Client Name" → `full_name`, "Mobile #" → `phone_primary`). After mapping, the system validates each row, flags duplicates and missing required fields, then batch-inserts the leads.

4. **Referral** — A lead generated through an agent referral (not a Meta ad, not a direct ad response). Referrals may come from existing clients, partner agents, or community events.

### 3.3 Lead Exclusivity Model

Each lead has an **exclusivity** status:

- **Exclusive** — The lead is assigned to only one agent and cannot be seen or contacted by other agents in the workspace. This applies to leads purchased at a premium or generated through exclusive campaigns.
- **Shared** — The lead is in the shared lead pool. Admins can reassign it freely.

### 3.4 Coverage Types

RevRa supports five distinct insurance product types, each with its own sales motion, pipeline considerations, and follow-up cadence:

1. **ACA (Affordable Care Act / Individual & Family)** — Open enrollment periods, income-based subsidies, metal tier plans (Bronze/Silver/Gold/Platinum)
2. **Medicare Advantage** — Age-qualified (65+), often sold during AEP (Oct 15–Dec 7), high-volume telesales product
3. **Final Expense** — Smaller face value whole life policies, simplified underwriting, typically sold to ages 50–85
4. **Life Insurance** — Term, whole, universal life products
5. **Group Health** — Employer-sponsored plans, sold to small business owners

### 3.5 Lead Scoring (AI-Assisted)

Every lead receives a **Lead Score** from 0 to 100, generated by the AI system. The score is calculated when a lead is first created and recalculated whenever a significant activity occurs (a call, a stage change, a message).

**Inputs to scoring:**
- Demographic factors: age, state, income range, household size
- Insurance factors: coverage type, budget, current carrier, policy renewal date
- Behavioral factors: lead source (organic referrals score higher), recency of purchase, engagement level
- Activity factors: response rate to outreach, stage progression velocity

**Outputs:**
- A single score from 0–100
- A **factor breakdown** — an explanation of what drove the score up or down ("Budget of $300+/month increases score by +15. Medicare coverage type in California is high-demand, +20.")

**Scoring tiers:**
- Green (80–100): Hot leads — prioritize immediately
- Yellow (50–79): Warm leads — work within normal cadence
- Red (0–49): Cold leads — minimal investment unless capacity allows

Lead scores are used throughout the product to sort and prioritize — in the Morning Briefing, the call queue, the AI suggestions, and the pipeline views.

---

## 4. The Lead Pipeline — How Leads Move Through the System

### 4.1 The 11-Stage Pipeline

Every lead in RevRa moves through a fixed 11-stage pipeline. Each stage represents a logical step in the insurance sales process:

| # | Stage Name | What It Means |
|---|---|---|
| 1 | **New Lead** | Lead just entered the system, uncontacted |
| 2 | **Attempting Contact** | Agent is actively trying to reach the lead |
| 3 | **Contacted** | Successfully reached the lead, initial conversation done |
| 4 | **Needs Analysis** | Agent is gathering requirements: coverage needs, budget, existing coverage |
| 5 | **Quote Sent** | Agent has sent a coverage proposal/quote to the lead |
| 6 | **Application Submitted** | Lead has agreed and submitted a formal insurance application |
| 7 | **In Underwriting** | The insurance carrier is reviewing the application |
| 8 | **Bound / Policy Active** | The policy has been approved and is active — **this is a won deal** |
| 9 | **Closed Lost** | Lead dropped off or explicitly declined — **this is a lost deal** |
| 10 | **Renewal Due** | A bound policy is approaching its renewal date — proactive re-engagement needed |
| 11 | **Lapsed** | A previously bound policy was not renewed — reactivation opportunity |

### 4.2 Stage Progression Rules

- Leads can only move **forward** (e.g., New Lead → Attempting Contact) or **backward** (e.g., Quote Sent → Needs Analysis) manually. The system does not auto-advance stages.
- Leads can jump from any stage to **Closed Lost** or **Bound** directly (a sale can close at any point).
- The **Renewal Due** stage is triggered automatically when a bound policy's renewal date approaches (30 days prior, configurable).
- The **Lapsed** stage is set manually by an agent or automatically if a Renewal Due lead is not re-engaged within a configured window.
- Each lead tracks **days in current stage** — a critical metric for agents to know when a lead is going stale.

### 4.3 Pipeline Views

The pipeline has two viewing modes:

- **List View** — A spreadsheet-style table with columns for name, phone, coverage type, stage, score, days in stage, last activity, and actions. Sortable, filterable, supports multi-select for bulk operations.

- **Kanban View** — A horizontal board with one column per stage. Leads are represented as cards. Agents can drag and drop cards between columns to change stage. This is the visual pipeline management view.

Both views support the same filtering and sorting capabilities and are accessible to agents and admins.

---

## 5. Lead Distribution — How Leads Get Assigned

### 5.1 The Lead Pool

All newly incoming leads (from Meta Ads, manual entry, or CSV import) enter a **Lead Pool** before being assigned to an agent. The pool is a holding state — leads are in the pool but not yet assigned to any specific agent.

### 5.2 Auto-Distribution Engine

When a lead enters the pool, the **Auto-Distribution Engine** immediately evaluates which agent should receive it. The engine uses a **round-robin algorithm** with several eligibility filters:

**Eligibility Rules (all must be true):**
1. The agent must be **active** (not paused or deactivated by admin)
2. The agent must have **remaining quota** — they have not exceeded their plan's weekly lead limit
3. The agent's **workspace must have an active subscription**
4. The agent must belong to the **same workspace** as the incoming lead

**Round-Robin Distribution Logic:**

The engine maintains a per-coverage-type counter per workspace: `round_robin_index[coverage_type]`. When a lead of a given coverage type arrives:

1. Find all eligible agents (active, within quota, same workspace)
2. Sort by `round_robin_index[coverage_type]` ascending
3. Assign to the agent with the lowest index
4. Increment that agent's `round_robin_index` for that coverage type
5. Send the agent a notification
6. Generate a Morning Briefing item for the next morning

This ensures leads are distributed evenly across agents, with additional fairness applied per coverage type.

### 5.3 Admin Override Capabilities

Workspace admins have full manual control over lead distribution:

- **Manual assignment** — Assign any lead in the pool to any agent (bypasses round-robin)
- **Bulk assignment** — Assign all leads from a specific campaign or CSV import to one or more agents
- **Reassignment** — Move a lead from one agent to another at any point
- **Bonus leads** — Assign leads beyond the plan's weekly limit without affecting the agent's quota
- **Lead recall** — Return a lead to the pool for redistribution

### 5.4 Agent Notifications on Lead Assignment

When a lead is assigned to an agent:
1. The agent receives a **push notification** (if push is enabled)
2. Their **notification badge** increments
3. The lead appears in their **Morning Briefing** the next morning as a "New Lead" item
4. The lead appears at the top of their **call queue** (prioritized by score)

---

## 6. Communications System

### 6.1 Overview — All Communication Channels

RevRa is the single hub for all lead communications. Every call, SMS, and email is logged automatically (or manually for non-integrated channels) against the lead record, creating a complete communication history.

All SMS and voice traffic flows through **Twilio**. The Super Admin configures Twilio at the platform level, and workspace admins assign individual phone numbers to agents from a shared pool.

### 6.2 SMS (Twilio)

**Outbound SMS:**
- Agent types a message in the Inbox or Lead Profile and sends via Twilio
- Message is stored in the `messages` table with direction = `outbound`
- Twilio delivers the message and pushes a delivery status webhook
- Status updates to: sent → delivered → read (if available)
- An activity is logged on the lead

**Inbound SMS:**
- When a lead replies to an SMS, Twilio receives it and sends a webhook to RevRa
- RevRa matches the phone number to a lead in the system
- A new message is created with direction = `inbound`
- If the lead has an active AI conversation, the AI can generate a response draft
- An activity is logged on the lead

**SMS Templates:**
- Admins can create SMS templates at the workspace level — reusable text snippets with merge fields (e.g., "Hi {{lead_name}}, this is {{agent_name}} from RevRa...")
- Agents access templates from the message input field
- Templates are categorized by stage or action type

**AI Draft SMS:**
- The AI can generate a contextual SMS draft based on the lead's profile, last conversation, and the lead's current stage
- The draft appears in the message input, pre-filled, with a tone label (Friendly / Professional / Urgent) and a confidence score
- The agent reviews, edits if needed, and sends — never auto-sent

### 6.3 Voice / Dialer (Twilio)

**Outbound Dialing:**
- Agent clicks "Call" on any lead from any screen (Dashboard, Leads, Pipeline, Inbox, Dialer)
- RevRa initiates a Twilio call through the agent's assigned phone number (not their personal number)
- Twilio connects agent → RevRa server → leads phone (masked call)
- The call is recorded by Twilio
- After the call ends, Twilio sends a webhook with call metadata (duration, outcome)
- The AI generates a post-call summary

**Dialer Queue:**
- The dialer queue is a prioritized list of leads assigned to the agent
- Leads are sorted by: Priority flag → Lead Score → Days waiting → Last contact
- The agent can manually dial any lead in the queue or start an auto-dialing session (one lead at a time, manual initiation per call)
- The agent can skip a lead (moves to end of queue), pause the queue, or send a lead to the Emma AI queue for AI-driven follow-up

**Active Call View:**
- When a call is active, the agent sees a split-screen interface:
  - **Left panel (AI Script):** AI-generated talking points for the current coverage type and stage, a checklist of topics to cover, live note-taking field, pause/resume recording button
  - **Right panel (Lead Context):** Full lead profile, insurance details, last conversation summary, upcoming appointments, AI-generated anticipated objections, call timer
- The AI dynamically updates talking points based on conversation direction

**Post-Call Flow:**
- When a call ends, a Post-Call Form appears
- Required: Call Outcome (Contacted, No Answer, Voicemail, Not Interested, Wrong Number, Dead Line, Callback Requested)
- Required: Next Stage (pre-selected by AI based on outcome, can be changed)
- Optional: Call notes
- Optional: Schedule a follow-up task (date/time picker)
- Optional: Add lead to Emma AI Queue for follow-up call
- Two buttons: "Save & Next Lead" (most common) or "Save & Stay"

**Inbound Calls:**
- If a lead calls the agent's assigned Twilio number, the call is routed to the agent
- The agent's Inbox shows an incoming call notification
- The agent sees the lead's full profile and conversation history before answering

**Call Recordings:**
- All outbound and inbound calls are recorded by Twilio
- Recordings are stored and linked to the Call record
- Agents and admins can play back recordings inline from the lead profile or the Inbox
- A transcript is generated for each call (async, via webhook from Twilio or a transcription service)
- An AI summary is generated for each call: 2–3 sentences summarizing the conversation, key outcomes, and recommended next action

### 6.4 Email

- Email is logged when an agent sends or receives an email linked to a lead
- Email threads are shown in the lead profile's Communications tab and in the Inbox
- Email integration is available but secondary to SMS and phone in the insurance sales workflow

### 6.5 Conversations — Unified Communication Thread

Every lead has one **Conversation** record that aggregates all communication channels (SMS, email, calls, Emma AI calls) into a single timeline. The conversation has a status:

- **Active** — Normal ongoing communication
- **Paused** — Communication temporarily paused (e.g., lead asked to stop contact)
- **Closed** — Communication concluded
- **Agent Takeover** — An agent has manually taken over the AI's communication with the lead

The conversation has an `ai_active` flag — when true, the AI can generate draft responses for inbound messages. When an agent manually sends a message or the lead responds to an AI message, the AI's involvement is logged.

---

## 7. AI System Architecture

### 7.1 The AI Philosophy in RevRa

AI in RevRa is not a chatbot in a sidebar. It is a **contextual intelligence layer** that reads all available CRM data and proactively assists the agent. The AI knows:
- Who the agent is and their role
- The current tab and context
- The full lead profile if one is open
- The pipeline state and queue priorities
- Recent activities and conversations

It uses this context to generate relevant, actionable outputs — not generic responses.

### 7.2 AI Features — Seven Distinct Capabilities

**A. RevRa AI (Floating Chat Bar)**
The persistent AI chat interface visible on every screen. It accepts natural language questions and commands about the agent's leads, pipeline, schedule, and workflow. It produces streaming text responses with interactive elements (clickable lead cards, action buttons, stats). It also proactively displays suggestions when expanded: overdue follow-ups, upcoming appointments with prep briefs, morning briefing availability, and leads ready for AI call queue.

**B. SMS Draft Generation**
Triggered from the Inbox or Lead Profile message input. Given the lead's full profile, last conversation, and the agent's intended tone, it generates a complete SMS draft. The draft includes a tone label (Friendly / Professional / Urgent) and a confidence score. The agent reviews and sends — never auto-sent.

**C. Morning Briefing Generator**
Generated automatically every morning at 7 AM local time (via a background scheduled job) for every agent. It reads the agent's lead queue, pipeline state, appointments, and yesterday's activities, then generates a structured briefing with AI-written summary sentences for each section. It is cached in the `morning_briefings` table and can be regenerated on-demand. It supports audio playback via the Web Speech API for agents who prefer to listen.

**D. Lead Scoring**
Triggered on lead creation and on significant activity updates. Reads all lead profile fields, activity history, source, and demographics to produce a 0–100 score with a factor breakdown explaining what drove the score up or down.

**E. Pre-Call Brief Generator**
Triggered before an active call begins (or on-demand). Reads the full lead profile, the last 10 activities, and the last conversation to generate: 3–5 talking points specific to the lead's coverage type and situation, key questions to ask, anticipated objections the lead may raise, and a coverage recommendation. The brief is stored on the appointment record and shown in the active call view.

**F. Post-Call Summary**
Triggered after every call ends (via Twilio webhook). Reads the call transcript (if transcribed), the recording, and the lead context to generate: a 2–3 sentence summary of what happened, the key outcomes (e.g., "Lead agreed to Medicare Advantage quote, wants to proceed"), and a recommended next action (e.g., "Schedule needs analysis call"). Stored on the Call record.

**G. CSV Column Mapping (Import)**
Triggered after a CSV file is uploaded during the import flow. The AI reads only the header row of the file (token-efficient) and maps each column to the correct RevRa field using intelligent name matching. The agent reviews and can override any mapping before import begins.

### 7.3 Context Window Strategy

The AI uses a four-tier context strategy to manage token usage efficiently:

- **Tier 1 — Always Provided (~500 tokens):** Agent name, workspace name, role, current date/time, CRM overview stats (total leads, stage counts, today's appointments), current plan tier.
- **Tier 2 — Tab Context (~1,000–3,000 tokens):** Current tab, filter state, summary stats for that view (e.g., Pipeline tab → stage distribution, average scores per stage).
- **Tier 3 — Lead Context (~2,000 tokens):** Full lead profile object, last 10 activities, last 5 messages with direction and content, lead score with factor breakdown, upcoming appointments for this lead.
- **Tier 4 — Session Context (~500 tokens):** Last 5 AI conversation exchanges (role-labeled), dialer queue state if applicable.

The maximum context window is approximately 6,000 tokens. If the API gateway is unreachable, the system shows a cached response with an "AI temporarily unavailable" notice.

### 7.4 AI Credits System

Instead of a wallet balance, RevRa uses an **AI Credits** system. AI Credits are a consumption-based currency that tracks how much AI capacity an agent or workspace uses. Each plan tier includes a monthly allocation of AI Credits.

**How AI Credits Work:**
- Every AI action consumes a set number of credits: SMS Draft (~1 credit), Morning Briefing (~5 credits), Lead Scoring (~2 credits), Pre-Call Brief (~3 credits), Post-Call Summary (~3 credits), Chat messages (~1 credit per message), CSV Column Mapping (~2 credits).
- AI Credits are allocated at the **workspace level** and shared among all agents in the workspace, or optionally at the individual agent level based on plan configuration.
- Credits reset monthly with the billing cycle. Unused credits do not roll over (or optionally roll over depending on plan tier).
- When a workspace exhausts its credits, AI features show a "Credits exhausted" notice. The admin can purchase additional credit packs or upgrade the plan.
- AI Credits are tracked per action type in the `ai_credit_transactions` table for analytics and billing reconciliation.

**Design Reference:** The "Wallet & Performance" section on the Dashboard (per PRD v1.0) conceptually evolves to represent AI Credits remaining and weekly/monthly usage, rather than monetary balance. The quick actions remain the same — New Lead, Import CSV, Start AI Calls, Schedule Appointment.

---

## 8. Emma AI Integration — AI Voice Agent

### 8.1 What Emma AI Is

Emma AI is a **third-party AI voice agent platform** that RevRa integrates with via API. Emma AI can autonomously call leads, have natural conversations about insurance products, answer common questions, collect information, and book appointments — all without human involvement.

RevRa acts as the **orchestration layer** for Emma AI: RevRa agents select which leads to send to Emma, configure campaigns, and receive results back into the CRM.

### 8.2 How It Works

**Campaign Setup (Workspace Admin):**
The admin creates an Emma AI Campaign with:
- Campaign name
- The target coverage type (e.g., Medicare Advantage)
- The target pipeline stages (e.g., "Quote Sent" — leads ready for follow-up)
- The target agents whose leads should be included
- The AI script to use (provided by Emma AI or customized)
- Call timeout settings, max retries, voicemail behavior (leave voicemail vs. skip)

**Agent Actions:**
- An agent can add a lead to an Emma AI queue from any screen (Lead Profile, Dashboard, Dialer, Morning Briefing) using an "Add to Emma AI Queue" button
- The lead is queued with the campaign configuration
- Emma AI calls the lead autonomously from the workspace's assigned phone number
- Results are pushed back to RevRa via webhook

**Webhook Events from Emma AI to RevRa:**
- `emma.call.started` — Emma initiated the call
- `emma.call.answered` — The lead picked up
- `emma.call.completed` — Call ended normally
- `emma.call.voicemail` — Emma left a voicemail
- `emma.call.no_answer` — No answer after all retries
- `emma.summary.available` — AI-generated summary and transcript are ready

### 8.3 Emma AI Results in RevRa

When Emma AI completes a call, the results appear in RevRa:
- A new **Call record** is created (flagged as `emma_ai = true`)
- The call is visible in the lead's Communications tab under "Emma AI" sub-filter
- The recording, transcript, and AI summary are stored and displayed
- An activity is logged on the lead
- The agent reviews the summary and decides next action (call the lead themselves, send an SMS, or move to the next pipeline stage)

### 8.4 RevRa → Emma AI API

- `POST /api/emma/queue-lead` — Add a lead to the Emma AI call queue
- `GET /api/emma/queue-status` — Check current queue depth and stats
- `DELETE /api/emma/queue-lead/:id` — Remove a lead from the queue before Emma calls them

---

## 9. Workflow Automation

### 9.1 What Workflows Are

Workflows in RevRa are **event-driven automation rules** that the workspace admin creates to eliminate repetitive manual actions. A workflow consists of a **Trigger**, one or more **Conditions**, and a chain of **Actions** and **Delays**.

When the trigger event occurs and all conditions are met, the workflow executes its action chain automatically.

### 9.2 Workflow Node Types

| Node Type | Color | Description |
|---|---|---|
| **Trigger** | Blue | The event that starts the workflow. One per workflow. |
| **Condition** | Amber | A logical check (field equals value, stage equals X, score is above Y). Multiple conditions can be chained with AND/OR. |
| **Action** | Green | Something the system does: send SMS, send email, create task, move pipeline stage, trigger Emma AI, add/remove tag |
| **Delay** | Gray | Wait a specified duration (minutes, hours, days) or wait until a specific date/time before proceeding to the next node |

### 9.3 Available Triggers

1. **Lead Assigned** — Fires when a lead is assigned to an agent (auto or manual)
2. **Stage Changed** — Fires when a lead moves from one pipeline stage to another
3. **No Reply X Days** — Fires after X days with no outbound contact (call, SMS, or email)
4. **Appointment Booked** — Fires when an appointment is created for a lead
5. **Sale Closed (Bound)** — Fires when a lead moves to the Bound/Policy Active stage
6. **Renewal Due** — Fires when a bound policy enters the Renewal Due stage

### 9.4 Workflow Canvas Concept

Workspace admins build workflows using a visual canvas (n8n-style):
- A **node palette** on the left lists all available node types
- A **canvas** in the center is where nodes are placed and connected
- A **configuration panel** on the right appears when a node is selected, where the admin fills in the node's parameters
- Nodes are connected by **bezier curves** drawn from output ports to input ports
- The canvas supports drag-and-drop, undo/redo, zoom, and node deletion

Workflows are saved as JSON documents (`{nodes: [], edges: []}`) in the `workflows` table.

### 9.5 Example Workflow: Medicare Follow-Up Sequence

```
[Lead Assigned: Medicare] → [Wait 24 hours] → [Check: No Reply]
→ [Send SMS: "Hi {{lead_name}}, this is {{agent_name}}..."]
→ [Wait 48 hours] → [Check: No Reply Again]
→ [Send SMS: Alternative message]
→ [Wait 72 hours] → [Create Task: "Manual follow-up required"]
```

### 9.6 Effectiveness Tracking

Every workflow tracks its **effectiveness score** — the percentage of leads that successfully progressed through the entire workflow without being marked as Closed Lost or manually interrupted. This helps admins identify which workflows are performing well and which need revision.

---

## 10. Appointments & Scheduling

### 10.1 Appointment Model

An appointment in RevRa is a scheduled interaction between an agent and a lead. It includes:
- The lead it is associated with
- The agent who owns it
- Date and time
- Duration (15, 30, 45, or 60 minutes)
- Type: Phone, Video, or In-Person
- Meeting link (auto-generated for Video calls, manual for In-Person)
- Status: Pending, Confirmed, Completed, No-Show, Cancelled
- Notes
- AI Pre-Meeting Brief (generated on demand)

### 10.2 AI Pre-Meeting Brief

When booking an appointment, the agent can opt to generate an AI Pre-Meeting Brief. When triggered:
1. The AI reads the lead's full profile, all recent activities, and the last conversation
2. It generates a brief containing:
   - Key talking points for the meeting
   - A summary of the lead's current situation
   - Important questions to ask
   - Anticipated objections
   - A coverage recommendation
3. The brief is stored on the appointment record
4. It appears in the appointment detail view, the Morning Briefing, and the active call view if the appointment is a phone/video call

### 10.3 Calendar Sync

Agents can connect their **Google Calendar** to RevRa. When connected:
- Appointments created in RevRa are automatically added to the agent's Google Calendar
- Optionally, Google Calendar events can be imported into RevRa (single-direction or bi-directional, configurable)
- A default event duration can be set per agent

### 10.4 Appointment Reminders

RevRa sends automated reminders for appointments:
- **24-hour reminder** — SMS to the lead, sent automatically
- **1-hour reminder** — SMS to the lead, sent automatically
- Both are tracked with boolean flags (`reminder_24h_sent`, `reminder_1h_sent`) on the appointment record

### 10.5 Meeting Outcomes

After an appointment, the agent marks it as **Completed** or **No-Show**:
- **Completed:** Prompts the agent to log outcome notes and decide next steps
- **No-Show:** Creates a follow-up task automatically
- **Cancelled:** Prompts for a cancellation reason

---

## 11. Team Discussions — Workspace Communication

### 11.1 Purpose

RevRa includes a built-in team communication tool called **Discussions** — a lightweight, CRM-native alternative to Slack. It exists so agents and admins can collaborate without leaving the workspace or relying on external tools.

### 11.2 Channels and Direct Messages

**Channels** are workspace-wide group conversations organized by topic. Examples: "# general", "# medicare-tips", "# health-team". Only workspace admins can create channels.

**Direct Messages (DMs)** are 1-on-1 conversations between any two team members.

Agents can only see and participate in channels and DMs within their own workspace. Cross-workspace communication is not supported by design.

### 11.3 Message Features

- **@Mentions** — Typing `@name` mentions a team member, who receives a notification
- **Voice Notes** — Agents can record and send voice messages up to 2 minutes long. Inline audio playback is supported.
- **Threads** — Any message can have a threaded reply, keeping context grouped together
- **Reactions** — Emoji reactions can be added to any message
- **Unread indicators** — Channels and DMs show unread count badges

### 11.4 File Sharing Policy

Discussions intentionally **does not support file attachments**. The philosophy is: if it's about a lead, it belongs in the CRM (lead profile → Documents tab). Discussions is for conversational context only.

---

## 12. Morning Briefing — The Agent's Daily Starting Point

### 12.1 Concept

The **Morning Briefing** is a daily AI-generated summary of everything an agent needs to know to start their day. It is the first thing an agent sees when they open RevRa in the morning, and it is also accessible as a dedicated tab.

### 12.2 Generation

- **Auto-generation:** A background job runs at 7 AM local time for each agent and generates the briefing using the AI system. It is cached in the `morning_briefings` table.
- **On-demand refresh:** The agent can regenerate the briefing at any time by clicking Refresh.

### 12.3 Briefing Sections

The Morning Briefing is structured into color-coded sections by urgency:

| Section | Color | Content |
|---|---|---|
| **New Leads** | Varies | Leads assigned to the agent overnight, sorted by score |
| **Overdue Follow-Ups** | Red | Leads past their follow-up window — most urgent |
| **Due Today** | Yellow | Leads that need to be contacted today |
| **Tomorrow's Prep** | Blue | Appointments and follow-ups scheduled for tomorrow |
| **Hot Leads** | Varies | Leads with scores above 85 that need immediate attention |
| **Appointments Today** | Varies | The agent's scheduled appointments for the day |
| **Renewals This Month** | Amber | Bound policies approaching renewal |
| **AI Suggestions** | Purple | AI-generated recommendations for action |

Each section begins with an AI-written summary sentence, followed by lead-level details with quick action buttons (Call, SMS, Add to Emma AI Queue).

### 12.4 Audio Playback

The Morning Briefing is optimized for **audio consumption**. A "Read Aloud" button uses the Web Speech API to read each section sequentially. The agent can pause and resume during playback. This is particularly valuable for agents who review their day during a commute.

---

## 13. Subscription & Billing System

### 13.1 Plan Tiers

RevRa uses a **per-workspace, per-week** subscription model managed through Stripe:

| Plan | Weekly Lead Limit | Weekly Price | Notes |
|---|---|---|---|
| **Starter** | 10 | ~$57.50/wk | ~$250/month |
| **Growth** | 20 | ~$103.75/wk | ~$450/month |
| **Scale** | 40 | ~$184/wk | ~$799/month |
| **Enterprise** | Custom | Custom | Negotiated per-agency |

All plans are billed monthly through **Stripe Subscriptions**. Overage leads (beyond the weekly limit) can be assigned manually by the admin as bonus leads — they are not auto-billed.

### 13.2 Subscription Lifecycle

- **Trial period:** New workspaces can start with a free trial (configurable by Super Admin)
- **Upgrade:** Immediate, prorated for the remainder of the billing period
- **Downgrade:** Takes effect at the next billing cycle
- **Cancellation:** Workspace loses access at the end of the current billing period
- **Failed payment:** Grace period (configurable), then workspace is suspended

### 13.3 AI Credits Allocation

Each plan tier includes a monthly AI Credits allocation:
- Credits are allocated at the workspace level
- Admins can monitor credit usage via the Settings → Billing section
- When credits are exhausted, AI features show a notice and admins can purchase additional credit packs or upgrade plans
- AI Credits are tracked per action type for analytics

### 13.4 Billing Portal

Agents and admins access Stripe's hosted billing portal to:
- View current plan and usage
- Update payment method
- Download invoices
- Upgrade, downgrade, or cancel subscription

---

## 14. Platform Admin Dashboard — Concept

### 14.1 Purpose

The Platform Admin Dashboard is the **operations center** for the Super Admin who owns and operates RevRa. It provides complete visibility across all workspaces, all agents, all subscriptions, all integrations, and all platform infrastructure.

### 14.2 Key Sections

**Overview / KPIs:**
- Total monthly revenue (platform-wide)
- Active workspaces count
- Total leads across all workspaces (all-time and new this month)
- Active calls in the last 24 hours
- Revenue trend chart
- New workspace signups per day
- Activity feed of platform events (new signup, subscription activated, integration connected)

**Agent Management (Cross-Workspace):**
- A table of all agents across all workspaces
- Columns: name, email, role, workspace, leads assigned, last active, status
- Admin can view any agent's activity log
- Admin can add, edit, or deactivate any agent on the platform

**Plans & Billing:**
- Management of the four plan tiers (add, edit, deactivate)
- Promotional offers management (discount codes, limited-time offers)
- A list of all active subscriptions across all workspaces with renewal dates and MRR

**Analytics:**
- Revenue and MRR trend (monthly bars + growth %)
- Lead funnel: Captured → Qualified → Converted → Lapsed
- Top agents ranked by closures and revenue
- Subscription mix by plan tier

**Integrations (Platform-Wide Configuration):**
All third-party services are configured here — not per-workspace:
- **Twilio:** Account credentials, phone number pool management, per-number workspace/agent assignment, webhook URL, SMS configuration
- **Meta Ads:** Access token, ad account ID, campaign list with leads captured and cost, webhook URL
- **Emma AI:** API key, workspaces using Emma AI, usage stats
- **Stripe:** Connection status and management
- **Custom LLM / AI Gateway:** API key, model selection, connection test

**Network & Health:**
- API server status: uptime, response time, version
- Database status: query latency, replication status
- AI service status: response time, model version
- 24-hour health timeline: all API calls, webhooks, sync events with success/fail indicators
- Emma AI real-time status: connection, active calls, queue depth
- Alert panel: recent errors and warnings with severity levels

**Settings:**
- Platform name and branding
- Default plan for new workspaces
- Email configuration (FROM address, reply-to)
- API rate limits
- Super admin account management

---

## 15. Data Model — Conceptual Overview

### 15.1 Core Entities

The RevRa data model centers on these primary entities:

**Workspace** — The top-level tenant container. Owns all users, leads, subscriptions, and configuration for an agency.

**User** — A person with a role (admin, agent, viewer) within a workspace. Synced with Supabase Auth.

**Lead** — A complete insurance prospect profile. Lives in a workspace, optionally assigned to an agent. Contains all demographic, insurance, and intelligence data.

**LeadPipeline** — A one-to-one record linking a lead to its current pipeline stage and when it entered that stage.

**PipelineStage** — One of 11 fixed stages with a name, slug, color, position, and automation trigger configuration.

**Conversation** — One conversation record per lead, aggregating all channels (SMS, email, calls, Emma AI). Has an `ai_active` flag.

**Message** — An individual communication event (SMS, email) within a conversation. Includes direction, channel, sender type, content, delivery status, and AI generation metadata.

**Call** — A call record linked to a lead and agent. Includes Twilio SID, direction, duration, outcome, recording URL, transcript, AI summary, and Emma AI flag.

**Appointment** — A scheduled meeting between an agent and a lead. Includes date/time, duration, type, status, meeting link, notes, AI pre-meeting brief, and reminder flags.

**Task** — A follow-up item linked to a lead. Includes type (Follow-up, Callback, Send Info, Reactivation, Custom), priority (Low, Medium, High, Urgent), due date, status, and assignee.

**DiscussionChannel** — A workspace channel or DM thread.

**DiscussionMessage** — A message within a channel. Supports text and voice note types, @mentions, and threading.

**Subscription** — A Stripe subscription record linking a workspace to a plan. Includes billing cycle, status, and period dates.

**Plan** — A subscription tier definition with name, price, billing period, lead limit, and feature list.

**AI Credit Allocation** — Per-workspace record of monthly AI credits, usage tracking, and renewal date.

**Workflow** — An automation rule defined as a JSON document with nodes and edges.

**MorningBriefing** — A cached AI-generated daily briefing per agent, with sections and audio playback state.

**LeadShare** — A permission record granting a user (grantee) view or edit access to a specific lead for a defined period.

**WorkspaceIntegration** — Per-provider credentials and settings for Twilio, Meta, Stripe, and Emma AI.

### 15.2 Soft Delete

All core records (leads, appointments, tasks) support **soft delete** — records are marked with a `deleted_at` timestamp rather than being physically removed from the database. This preserves audit history and allows data recovery.

### 15.3 Row-Level Security (RLS)

All database tables have Row-Level Security enabled with these default policies:
- Agents: see only records where `workspace_id` matches theirs AND (`assigned_agent_id` = their user ID OR the record has no assignment)
- Workspace Admins: see all records within their workspace
- Super Admin: sees all records across all workspaces

Lead shares create explicit cross-user access overrides with expiration dates.

### 15.4 Key Indexes

Critical query performance indexes:
- `leads(workspace_id, assigned_agent_id)` — primary lookup for agent lead lists
- `leads(workspace_id, outcome)` — pipeline filtering
- `messages(conversation_id, created_at)` — conversation thread loading
- `lead_activities(lead_id, created_at DESC)` — activity timeline
- `calls(agent_id, created_at DESC)` — agent call history
- `appointments(agent_id, scheduled_at)` — calendar query
- `tasks(lead_id, status)` — task management
- `discussion_messages(channel_id, created_at)` — discussion thread loading

---

## 16. API Design — Core Concepts

### 16.1 REST API Groups

| Group | Description |
|---|---|
| **Auth** | Login, logout, password reset, invite acceptance |
| **Leads** | CRUD operations, search, filter, pagination, sharing, CSV import |
| **Pipeline** | Stage retrieval, lead movement between stages |
| **Conversations** | List conversations, fetch messages, send SMS/email |
| **Calls** | List call history, log manual calls, initiate Twilio calls, request transcription |
| **Messages** | Send messages, update delivery status |
| **Appointments** | CRUD, status transitions, reminder management |
| **Tasks** | CRUD, status transitions, bulk operations |
| **Workflows** | CRUD for automation rules |
| **Emma AI** | Queue management, campaign management |
| **AI** | All AI feature endpoints: chat, SMS draft, briefing, scoring, pre-call brief, CSV mapping |
| **Billing** | Subscription status, Stripe portal, plan listing |
| **Admin** | Workspace management, cross-workspace analytics, integration configuration, platform health |

### 16.2 Webhook Architecture

RevRa receives and processes webhooks from three external platforms:

**Twilio Webhooks:**
- Incoming SMS from leads
- Call status updates (initiated, answered, completed)
- Call recording ready
- Voicemail received

**Meta Lead Ads Webhook:**
- New lead form submission (leadgen_id, form_id, field_data)

**Stripe Webhooks:**
- Payment succeeded
- Payment failed
- Subscription created, updated, cancelled
- Customer updated

**Emma AI Webhooks:**
- Call started, answered, completed, voicemail, no answer
- Summary and transcript available

All webhooks are received at `POST /api/webhooks/:provider`, verified (signature verification where supported — Twilio, Stripe), and processed by background workers. Webhook processing creates appropriate records in the database and triggers downstream actions (AI summaries, activity logs, notifications).

### 16.3 SSE (Server-Sent Events) for AI Responses

The RevRa AI chat interface uses **Server-Sent Events (SSE)** for streaming responses. When an agent sends a message to RevRa AI:
1. The frontend opens an SSE connection to `POST /api/ai/ask`
2. The backend streams the LLM response token by token to the frontend
3. The frontend renders the response in real time
4. Interactive elements (lead cards, action buttons) are rendered as special tokens in the stream

---

## 17. Build Roadmap — Phase Summary

| Phase | Duration | Focus |
|---|---|---|
| **Phase 1 — Foundation** | Weeks 1–2 | Next.js setup, design system primitives, Supabase auth, workspace onboarding, database schema with RLS |
| **Phase 2 — Core Agent Workflow** | Weeks 3–5 | Leads tab (CRUD, profile, all sub-tabs), CSV import, Pipeline (list + kanban), lead sharing |
| **Phase 3 — Communications** | Weeks 6–7 | Twilio SMS + inbound, Inbox, Templates, Dialer, call logging, recordings |
| **Phase 4 — AI + Emma AI** | Weeks 8–10 | AI gateway integration, RevRa AI chat, all 7 AI features, Emma AI campaign + queue + webhooks |
| **Phase 5 — Scheduling + Workflows** | Weeks 11–12 | Appointments, Google Calendar sync, Workflow canvas, Discussions, Morning Briefing |
| **Phase 6 — Admin Dashboard** | Week 13 | All admin sections: workspaces, agents, plans, analytics, integrations, health |
| **Phase 7 — Polish + Launch** | Weeks 14–15 | Virtualization, optimistic UI, loading states, mobile responsiveness, realtime subscriptions, E2E tests |

---

## 18. Open Questions

1. **HIPAA BAA** — Whether a Business Associate Agreement is required from Supabase, Twilio, and Emma AI given that leads contain health-related information (pre-existing conditions)
2. **Lead score algorithm weights** — The precise weighting factors for the AI-assisted scoring model
3. **Meta Ads integration method** — Webhook vs. polling approach for lead form submissions
4. **Emma AI campaign parameters** — Full scope of configurable parameters (call timeout, max retries, voicemail behavior)
5. **AI Credits rollover policy** — Whether unused AI Credits roll over to the next month, and whether this varies by plan tier
6. **Data retention** — How long call recordings, transcripts, and AI summaries are retained before deletion
7. **Stripe trial configuration** — Default trial length for new workspaces, grace period for failed payments

---

> **Relationship to PRD v1.0:** This document assumes all design references, color palette, typography, motion specifications, component library, layout dimensions, and visual direction are inherited from PRD v1.0. Where conflicts arise, PRD v1.0 governs visual/design matters and this document governs conceptual/methodological matters.

---

*This PRD (Concepts & Workflows) is the authoritative reference for business logic, system behavior, data flows, and user workflows. Design implementation must be guided by PRD v1.0.*
