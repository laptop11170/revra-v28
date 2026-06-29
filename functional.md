# RevRa CRM — Functional Specification
## Full Backend Architecture & Integration Plan

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND                                      │
│  Next.js 16 (App Router + Turbopack) · React 19 · TypeScript             │
│  ─────────────────────────────────────────────────────────────────────  │
│  Shell Layout (Sidebar + Topbar) · Role-based Views                      │
│  User Dashboard · Admin Dashboard · Superadmin Dashboard                 │
│  Lead Pipeline · Call Dialer · Messaging · AI Chat · Settings            │
└──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬────────┘
           │          │          │          │          │          │
     ┌─────┴───┐ ┌───┴──┐  ┌────┴───┐  ┌───┴──┐  ┌───┴──┐  ┌───┴──┐
     │ Clerk   │ │Twilio│  │LoopMsg  │  │Twilio│  │SendGrid│ │Google │
     │ Auth    │ │Voice │  │Messages │  │ SMS  │  │ Email │  │Calendar│
     └─────┬───┘ └──┬───┘  └────┬───┘  └──┬───┘  └───┬──┘  └───┬──┘
           │        │          │          │          │          │
           └────────┴────┬─────┴──────────┴──────────┴──────────┘
                        │
              ┌─────────┴─────────┐
              │    Supabase       │
              │  ─────────────── │
              │  PostgreSQL      │
              │  Row-Level Security│
              │  Realtime        │
              │  Storage         │
              └──────────────────┘
                        │
              ┌─────────┴─────────┐
              │   RevRa AI Agent  │
              │  ─────────────── │
              │  Custom LLM API   │
              │  Tool Executor    │
              │  Context Builder  │
              └──────────────────┘
```

### Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ COMPLETE | Frontend foundation + Auth + All dashboard pages + API routes |
| Phase 2 | 📋 PLANNED | Database migrations + Real data wiring |
| Phase 3 | 📋 PLANNED | Communications (SMS, Email, Multi-Channel) |
| Phase 4 | 📋 PLANNED | Twilio Voice (Click-to-Call + WebRTC) |
| Phase 5 | 📋 PLANNED | Google Calendar + Lead Marketplace |

See: `docs/phase1status.md`, `docs/phase2_plan.md`, `docs/phase3_plan.md`, `docs/phase4_plan.md`, `docs/phase5_plan.md`

---

## 2. Supabase — Database & Backend

### 2.1 Multi-Tenant Architecture

Workspaces are the top-level tenant unit. All data is scoped by `workspace_id`.

### 2.2 Core Schema

#### `workspaces`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            TEXT NOT NULL
slug            TEXT UNIQUE NOT NULL
plan            TEXT DEFAULT 'starter' -- starter, professional, enterprise
twilio_account_sid   TEXT
loopmessages_api_key TEXT
sendgrid_api_key     TEXT
google_calendar_creds JSONB
settings          JSONB DEFAULT '{}'
created_at       TIMESTAMPTZ DEFAULT now()
updated_at       TIMESTAMPTZ DEFAULT now()
```

#### `users` (synced from Clerk)
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
clerk_user_id   TEXT UNIQUE NOT NULL
workspace_id    UUID REFERENCES workspaces(id)  -- single workspace per user (Phase 1)
email           TEXT NOT NULL
full_name       TEXT
role            TEXT NOT NULL -- 'superadmin' | 'admin' | 'user'
status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
leads_count     INTEGER DEFAULT 0
avatar_url      TEXT
last_active_at  TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT now()
```

**Multi-workspace per user** is planned for Phase 5 via `workspace_members` junction table.

#### `leads`
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id        UUID REFERENCES workspaces(id) NOT NULL
assigned_agent_id   UUID REFERENCES users(id)

-- Identity
first_name      TEXT NOT NULL
last_name       TEXT NOT NULL
email           TEXT
phone           TEXT NOT NULL
phone_formatted TEXT

-- Classification
lead_type       TEXT -- 'medicare' | 'aca' | 'final_expense' | 'life' | 'other'
score           INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100)
score_breakdown JSONB -- { engagement: 30, intent: 40, fit: 30 }

-- Pipeline
pipeline_stage      TEXT DEFAULT 'new_lead'
previous_stages     TEXT[] DEFAULT '{}'

-- Contact history (denormalized for performance)
last_contacted_at   TIMESTAMPTZ
last_call_at        TIMESTAMPTZ
last_message_at     TIMESTAMPTZ

-- Meta
source             TEXT -- 'website' | 'referral' | 'ad' | 'cold_call' | 'import'
notes              TEXT
tags               TEXT[] DEFAULT '{}'

-- Enrichment data
enrichment_data   JSONB -- full contact data from enrichment APIs

-- Google Calendar
calendar_event_id TEXT

created_at       TIMESTAMPTZ DEFAULT now()
updated_at       TIMESTAMPTZ DEFAULT now()
```

#### `calls`
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id        UUID REFERENCES workspaces(id) NOT NULL
lead_id             UUID REFERENCES leads(id) NOT NULL
agent_id            UUID REFERENCES users(id) NOT NULL

-- Twilio
twilio_call_sid     TEXT UNIQUE
twilio_recording_sid TEXT

-- Call details
direction           TEXT -- 'inbound' | 'outbound'
status              TEXT -- 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'busy' | 'no_answer' | 'failed'
started_at          TIMESTAMPTZ
ended_at            TIMESTAMPTZ
duration_seconds    INTEGER

-- AI-generated
transcription       TEXT
ai_summary          TEXT
ai_disposition      TEXT -- 'interested' | 'not_interested' | 'callback' | 'not_reachable'
ai_next_steps       TEXT

-- Recording
recording_url       TEXT
recording_duration  INTEGER

created_at          TIMESTAMPTZ DEFAULT now()
```

#### `messages`
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id        UUID REFERENCES workspaces(id) NOT NULL
lead_id             UUID REFERENCES leads(id) NOT NULL
agent_id            UUID REFERENCES users(id) NOT NULL

-- Routing
channel             TEXT NOT NULL -- 'sms' | 'imessage' | 'whatsapp' | 'rcs' | 'email'
direction           TEXT NOT NULL -- 'inbound' | 'outbound'

-- Message content
body                TEXT NOT NULL
media_url           TEXT -- MMS attachment

-- External IDs
external_id         TEXT -- LoopMessages / Twilio message SID
external_status     TEXT -- delivered, read, failed, etc.

-- AI
ai_generated        BOOLEAN DEFAULT FALSE
ai_context          JSONB -- reasoning for AI-generated responses

sent_at             TIMESTAMPTZ
created_at           TIMESTAMPTZ DEFAULT now()
```

#### `pipeline_stages`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id) NOT NULL
name            TEXT NOT NULL
slug            TEXT NOT NULL -- 'new_lead', 'contacted', 'qualified', 'quote_sent', 'won', 'lost'
position        INTEGER NOT NULL
color           TEXT
lead_count      INTEGER DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT now()
```

#### `pipeline_moves` (audit log)
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
lead_id         UUID REFERENCES leads(id) NOT NULL
from_stage      TEXT
to_stage        TEXT NOT NULL
moved_by        UUID REFERENCES users(id) NOT NULL
moved_at        TIMESTAMPTZ DEFAULT now()
note            TEXT
```

#### `ai_conversations`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id) NOT NULL
agent_id        UUID REFERENCES users(id) NOT NULL
lead_id         UUID REFERENCES leads(id) -- can be null for general chat
mode            TEXT DEFAULT 'agent' -- 'agent' | 'chat'
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

#### `ai_messages`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
conversation_id UUID REFERENCES ai_conversations(id) NOT NULL
role            TEXT NOT NULL -- 'user' | 'assistant' | 'system' | 'tool'
content         TEXT
tool_calls      JSONB
tool_results    JSONB
tokens_used     INTEGER
latency_ms      INTEGER
created_at      TIMESTAMPTZ DEFAULT now()
```

#### `tasks`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id) NOT NULL
lead_id         UUID REFERENCES leads(id)
assigned_agent_id UUID REFERENCES users(id) NOT NULL
created_by      UUID REFERENCES users(id) -- AI or human

type            TEXT -- 'call' | 'email' | 'sms' | 'follow_up' | 'schedule' | 'custom'
title           TEXT NOT NULL
description     TEXT
due_date        TIMESTAMPTZ
priority        TEXT DEFAULT 'medium' -- 'low' | 'medium' | 'high' | 'urgent'
status          TEXT DEFAULT 'pending' -- 'pending' | 'completed' | 'skipped'
source          TEXT -- 'ai' | 'manual'
recurring       JSONB -- { enabled: false, pattern: null }

completed_at    TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT now()
```

#### `calendar_events`
```sql
id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id        UUID REFERENCES workspaces(id) NOT NULL
lead_id             UUID REFERENCES leads(id)
agent_id            UUID REFERENCES users(id) NOT NULL

google_event_id     TEXT
title               TEXT NOT NULL
description         TEXT
start_time          TIMESTAMPTZ NOT NULL
end_time            TIMESTAMPTZ NOT NULL
location            TEXT
attendees           JSONB
google_meet_link     TEXT

status              TEXT DEFAULT 'confirmed' -- 'confirmed' | 'cancelled'
reminder_sent       BOOLEAN DEFAULT FALSE

created_at          TIMESTAMPTZ DEFAULT now()
```

#### `integrations`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id) NOT NULL
provider        TEXT NOT NULL -- 'twilio' | 'loopmessages' | 'sendgrid' | 'google'
credentials     JSONB NOT NULL -- encrypted
settings        JSONB DEFAULT '{}'
status          TEXT DEFAULT 'active' -- 'active' | 'error' | 'disconnected'
last_sync_at    TIMESTAMPTZ
error_message   TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

#### `webhooks_log`
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
workspace_id    UUID REFERENCES workspaces(id) NOT NULL
provider        TEXT NOT NULL
event_type      TEXT NOT NULL
payload         JSONB
processed       BOOLEAN DEFAULT FALSE
processed_at    TIMESTAMPTZ
error           TEXT
created_at      TIMESTAMPTZ DEFAULT now()
```

### 2.3 Row-Level Security (RLS)

Every table has RLS policies enforcing `workspace_id` scoping:
```sql
-- Example: leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access workspace leads"
  ON leads FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM users WHERE clerk_user_id = auth.uid()
  ));
```

### 2.4 Edge Functions

#### `/webhooks/twilio-voice`
- **POST** — receives Twilio webhook for call status updates
- Handles: `initiated`, `ringing`, `completed`, `busy`, `no_answer`, `failed`
- Updates `calls` table, triggers AI summarization on completion
- Stores recordings when `RecordingUrl` is present

#### `/webhooks/twilio-sms`
- **POST** — receives Twilio SMS inbound webhooks
- Creates `messages` record, publishes to Supabase Realtime for frontend

#### `/webhooks/loopmessages`
- **POST** — receives LoopMessages webhooks for all channels (iMessage, SMS, RCS, WhatsApp)
- Normalizes payload into `messages` table
- Publishes to Supabase Realtime

#### `/webhooks/sendgrid`
- **POST** — receives SendGrid email events (delivered, opened, clicked, bounced)
- Updates `messages` record status

#### `/webhooks/clerk`
- **POST** — receives Clerk webhook for user lifecycle events
- `user.created` → create `users` record in Supabase
- `user.updated` → update `users` record
- `user.deleted` → deactivate or soft-delete

#### `/ai/revra`
- **POST** — main AI agent endpoint
- Receives: `{ conversation_id, message, lead_id? }`
- Builds context (lead data, history, tasks)
- Calls custom LLM with tool definitions
- Executes tools, returns response

#### `/ai/summarize-call`
- **POST** — receives `{ call_id }`
- Fetches recording, runs through LLM with summarization prompt
- Updates `calls.ai_summary` + disposition

#### `/leads/enrich`
- **POST** — receives `{ lead_id }`
- Calls enrichment API (Clearbit, Apollo, etc.)
- Updates `leads.enrichment_data` + score

#### `/calendar/sync`
- **POST** — syncs Google Calendar events for workspace
- OAuth2 refresh, fetch new events, upsert `calendar_events`

---

## 3. Clerk — Authentication

### 3.1 Auth Flow (Implemented)

```
/                     → Landing page (redirects authenticated users)
/sign-in              → Clerk <SignIn> component → /select-workspace
/sign-up              → Clerk <SignUp> component → /select-workspace
/select-workspace     → Create workspace or join existing
  → POST /api/workspaces → Create workspace + user record
  → POST /api/workspaces/[id]/join → Join existing workspace
```

After workspace selection:
```
role = superadmin → /superadmin
role = admin      → /admin
role = user       → /user
```

### 3.2 Middleware Protection (Implemented)

```typescript
// middleware.ts — role-based route protection
- Superadmin routes: /superadmin/* → superadmin only
- Admin routes: /admin/* → admin or superadmin
- User routes: /user/* → any authenticated user with workspace
- No workspace → forced to /select-workspace
```

### 3.3 Clerk-to-Supabase Sync

```typescript
// app/api/webhooks/clerk/route.ts
// Handles: user.created, user.updated, user.deleted
// Creates/updates users in Supabase
```

### 3.4 Role Mapping

| Clerk Role | RevRa Role | Access |
|---|---|---|
| Super Admin | `superadmin` | All workspaces, system settings, provider config |
| Workspace Admin | `admin` | Own workspace, team management, leads, calls |
| User | `user` | Assigned leads, own calls/messages, AI chat |

### 3.5 Authentication Files

```
app/(auth)/sign-in/[[...sign-in]]/page.tsx   ← Clerk <SignIn>
app/(auth)/sign-up/[[...sign-up]]/page.tsx   ← Clerk <SignUp>
app/(auth)/select-workspace/page.tsx         ← Workspace creation/selection
app/api/workspaces/route.ts                   ← Create workspace
app/api/workspaces/my/route.ts                ← Get user's workspaces
app/api/workspaces/[id]/join/route.ts         ← Join workspace
middleware.ts                                  ← Role-based routing
context/auth-context.tsx                       ← Auth context
```

---

## 4. Twilio Voice — Calling

### 4.1 Outbound Calls (click-to-call)

```
Frontend                   Supabase                  Twilio
   │                           │                        │
   │  POST /api/calls/create   │                        │
   │  { lead_id }              │                        │
   │──────────────────────────►│                        │
   │                           │  POST /api/calls/twiml │
   │                           │  (returns TwiML)        │
   │                           │◄───────────────────────│
   │                           │                        │
   │                           │  POST twilio.calls      │
   │                           │───────────────────────►│
   │                           │                        │
   │◄──────────────────────────│                        │
   │  { call_sid, status }      │                        │
   │                           │                        │
   │                           │◄───── Call Events ─────│
   │                           │       (webhook)        │
   │                           │                        │
   │  Realtime: call_started    │                        │
   │◄──────────────────────────│                        │
```

### 4.2 Inbound Calls

```
Twilio                Supabase Edge Fn         Frontend
   │                         │                     │
   │  POST /webhooks/twilio  │                     │
   │────────────────────────►│                     │
   │                         │                     │
   │  Lookup lead by phone   │                     │
   │                         │                     │
   │                         │  Broadcast: new_call │
   │                         │────────────────────►│
   │                         │                     │
   │  Return TwiML           │                     │
   │◄────────────────────────│                     │
```

### 4.3 TwiML Endpoint

```typescript
// app/api/calls/twiml/route.ts
// Returns TwiML XML:
// - For outbound: <Dial> to connect to agent's phone or browser
// - For inbound: <Dial> to assigned agent's softphone
```

### 4.4 WebRTC Softphone (Frontend)

- Twilio Client SDK for browser-based calling
- Components:
  - `<DialerPad>` — number entry, call button
  - `<ActiveCall>` — in-call UI with lead context, hold, mute, transfer
  - `<CallHistory>` — list of past calls
- Features: call timer, note-taking during call, disposition buttons

### 4.5 Call Recording & Transcription

1. Twilio records call (`Record=true` in TwiML)
2. Recording URL posted to `/webhooks/twilio-voice`
3. Recording stored in Supabase Storage
4. `POST /ai/summarize-call` triggered after call ends
5. AI generates: summary, disposition, next steps → stored in `calls` table

---

## 5. LoopMessages — Multi-Channel Messaging

### 5.1 Supported Channels

| Channel | Notes |
|---|---|
| iMessage | Via LoopMessages Business API |
| SMS | Fallback when iMessage unavailable |
| WhatsApp | Business API |
| RCS | Google Jibe integration |

### 5.2 Outbound Messaging

```typescript
// lib/loopmessages.ts
interface SendMessageParams {
  lead_id: string;
  channel: "imessage" | "sms" | "whatsapp" | "rcs";
  body: string;
  media_url?: string;
}

// Frontend → API → LoopMessages → Carrier → Recipient
```

### 5.3 Inbound Messaging

```
LoopMessages    Supabase Edge Fn    Supabase Realtime    Frontend
    │                   │                    │               │
    │  POST webhook     │                    │               │
    │──────────────────►│                    │               │
    │                   │  Create message    │               │
    │                   │──────────────────►│               │
    │                   │                    │  Broadcast    │
    │                   │                    │──────────────►│
    │                   │◄───────────────────│               │
    │  200 OK           │                    │               │
    │◄──────────────────│                    │               │
```

### 5.4 Channel Routing Logic

```typescript
// Preferred order for outbound:
1. Check if lead has iMessage (via LoopMessages lookup)
2. If yes → send via iMessage
3. If no → send via SMS (Twilio or LoopMessages)
4. For marketing: WhatsApp if opt-in
5. RCS for Android users with RCS support
```

---

## 6. Twilio SMS — Secondary/Fallback

### 6.1 Use Cases

- SMS when LoopMessages is unavailable
- International SMS not covered by LoopMessages
- Backup channel for critical alerts

### 6.2 Configuration

Per-workspace: `workspaces.twilio_sms_auth_token` + `twilio_phone_number`

### 6.3 Same Pattern as LoopMessages

- Outbound: `POST /api/messages/send` → Twilio REST API
- Inbound: `/webhooks/twilio-sms` → create `messages` record → Realtime

---

## 7. SendGrid — Email

### 7.1 Use Cases

| Use Case | Trigger |
|---|---|
| Appointment confirmation | Calendar event created |
| Follow-up after call | Call marked `completed` |
| Lead nurture sequence | AI agent triggered |
| Manual agent emails | Agent compose in UI |
| System notifications | Task reminders, SLA alerts |

### 7.2 Email Templates (SendGrid Templates)

- `appointment-confirmed` — calendar booking confirmation
- `call-summary` — post-call follow-up with summary
- `lead-intro` — welcome sequence for new leads
- `task-reminder` — daily task digest
- `weekly-performance` — agent KPI report

### 7.3 Email as Message Channel

Emails are stored as `messages` with `channel: 'email'`, linked to leads for full conversation history.

### 7.4 Webhook Events

```
SendGrid          Supabase           Action
   │                 │                 │
   │  POST webhook   │                 │
   │────────────────►│                 │
   │                 │  Update status  │
   │                 │─────────────────│
   │  delivered      │                 │
   │  opened         │  AI engagement  │
   │  clicked        │  score +1       │
   │  bounced        │  mark inactive  │
   │                 │                 │
```

---

## 8. Google Calendar — Scheduling

### 8.1 OAuth2 Setup

Each workspace connects Google Calendar via OAuth2:
- Scopes: `calendar.events` (read/write)
- Credentials stored encrypted in `integrations` table
- Token refresh handled in Edge Function

### 8.2 Features

| Feature | Description |
|---|---|
| View calendar | Agent sees own Google Calendar in-app |
| Create event | Schedule call/meeting from lead profile |
| Two-way sync | Google events ↔ `calendar_events` table |
| Send invite | Email invite to lead via SendGrid |
| Auto-reminder | Push notification 15 min before |
| Google Meet | Auto-generate meet link |

### 8.3 Calendar-to-Task Link

When calendar event is created for a lead:
- Task auto-created for the agent
- Task linked to lead
- Due = event start time
- On event completion → prompt AI for follow-up

---

## 9. RevRa AI — Autonomous Agent

### 9.1 Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     RevRa AI Agent                       │
│  ──────────────────────────────────────────────────── │
│                                                          │
│  User Message ──► Intent Classifier ──► Context Builder  │
│                        │                    │           │
│                        ▼                    ▼           │
│                  ┌──────────────┐    ┌──────────────┐  │
│                  │  System      │    │  Tool        │  │
│                  │  Prompt      │    │  Definitions │  │
│                  │              │    │              │  │
│                  │  + Lead Data │    │  + Context   │  │
│                  │  + History   │    │  + Memory    │  │
│                  │  + Tasks     │    │              │  │
│                  └──────┬───────┘    └──────┬───────┘  │
│                         │                    │          │
│                         └─────┬──────────────┘          │
│                               ▼                         │
│                        ┌─────────────┐                  │
│                        │  Custom LLM  │                  │
│                        │  (Tool Use)  │                  │
│                        └──────┬───────┘                  │
│                               │                          │
│                    ┌─────────┴──────────┐              │
│                    ▼                      ▼              │
│            ┌───────────────┐    ┌──────────────┐       │
│            │  Tool Executor │    │   Response   │       │
│            │               │    │   Formatter   │       │
│            └───────┬───────┘    └──────────────┘       │
│                    │                                   │
│                    ▼                                   │
│            ┌───────────────┐                           │
│            │  Tool Results │                           │
│            │  (injected as  │                           │
│            │  tool_call msg)│                           │
│            └───────────────┘                           │
│                          │                              │
│                          ▼ (loop back to LLM if needed) │
└─────────────────────────────────────────────────────────┘
```

### 9.2 System Prompt

```
You are RevRa, an AI sales agent for insurance leads.

GOALS:
- Help the agent close more deals by providing insights, suggestions, and automation
- Move leads through the pipeline efficiently
- Ensure every lead gets followed up within SLA

PERSONA:
- Professional, friendly, proactive
- Speaks like a skilled sales assistant, not a chatbot
- Always cites data points when making recommendations

TOOLS AVAILABLE:
- get_lead(lead_id) — full lead profile + history
- get_leads_by_stage(stage) — leads in a specific pipeline stage
- update_lead_score(lead_id, score, reason) — update lead score with reasoning
- update_pipeline_stage(lead_id, stage) — move lead in pipeline
- send_message(lead_id, message, channel) — send SMS/iMessage/WhatsApp
- place_call(lead_id) — initiate a call to the lead
- create_task(lead_id, title, type, due_date) — create follow-up task
- get_tasks(agent_id, status) — fetch agent's task queue
- complete_task(task_id) — mark task done
- schedule_event(lead_id, title, start_time, end_time) — create calendar event
- summarize_call(call_id) — get AI summary of past call
- get_performance_report(agent_id) — KPIs, conversion rates, SLA compliance

CONTEXT PROVIDED:
- Active lead profile (name, phone, type, score, stage, last contact, notes)
- Recent conversation history (calls, messages)
- Agent's task queue
- Pipeline overview

RULES:
- Never fabricate data or phone numbers
- If unsure, say "Let me check that for you" and use a tool
- Always suggest next best action
- Flag urgent items (overdue follow-ups, SLA breaches)
- Do not share lead data outside the agent's workspace
```

### 9.3 Tool Definitions (LLM Function Calling)

```typescript
const tools = [
  {
    name: "get_lead",
    description: "Get full lead profile with contact history",
    parameters: {
      type: "object",
      properties: { lead_id: { type: "string" } },
      required: ["lead_id"]
    }
  },
  {
    name: "update_lead_score",
    description: "Update lead score with AI reasoning",
    parameters: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        score: { type: "number", minimum: 0, maximum: 100 },
        reason: { type: "string" }
      },
      required: ["lead_id", "score", "reason"]
    }
  },
  {
    name: "send_message",
    description: "Send outbound message to lead",
    parameters: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        message: { type: "string" },
        channel: { type: "string", enum: ["sms", "imessage", "whatsapp"] }
      },
      required: ["lead_id", "message", "channel"]
    }
  },
  {
    name: "create_task",
    description: "Create follow-up task for agent",
    parameters: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        title: { type: "string" },
        type: { type: "string", enum: ["call", "email", "sms", "follow_up", "schedule"] },
        due_date: { type: "string" }
      },
      required: ["lead_id", "title", "type"]
    }
  },
  {
    name: "schedule_event",
    description: "Schedule calendar event with lead",
    parameters: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        title: { type: "string" },
        start_time: { type: "string" },
        end_time: { type: "string" },
        description: { type: "string" }
      },
      required: ["lead_id", "title", "start_time", "end_time"]
    }
  },
  {
    name: "place_call",
    description: "Initiate outbound call to lead",
    parameters: {
      type: "object",
      properties: { lead_id: { type: "string" } },
      required: ["lead_id"]
    }
  },
  {
    name: "update_pipeline_stage",
    description: "Move lead to new pipeline stage",
    parameters: {
      type: "object",
      properties: {
        lead_id: { type: "string" },
        stage: { type: "string" }
      },
      required: ["lead_id", "stage"]
    }
  },
  {
    name: "get_tasks",
    description: "Get agent's task queue",
    parameters: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        status: { type: "string", enum: ["pending", "completed", "all"] }
      },
      required: ["agent_id"]
    }
  },
  {
    name: "complete_task",
    description: "Mark task as completed",
    parameters: {
      type: "object",
      properties: { task_id: { type: "string" } },
      required: ["task_id"]
    }
  }
];
```

### 9.4 Context Builder

Before every LLM call, build context:

```typescript
async function buildContext(params: {
  agent_id: string;
  lead_id?: string;
  conversation_id: string;
}): Promise<ContextObject> {

  const [agent, lead, conversations, messages, calls, tasks] = await Promise.all([
    supabase.from("users").select("*").eq("id", params.agent_id).single(),
    params.lead_id ? supabase.from("leads").select("*").eq("id", params.lead_id).single() : null,
    supabase.from("ai_conversations").select("*").eq("id", params.conversation_id).single(),
    supabase.from("messages").select("*").eq("lead_id", params.lead_id).order("created_at", { ascending: false }).limit(20),
    supabase.from("calls").select("*").eq("lead_id", params.lead_id).order("created_at", { ascending: false }).limit(5),
    supabase.from("tasks").select("*").eq("assigned_agent_id", params.agent_id).eq("status", "pending").order("due_date"),
  ]);

  return {
    agent: agent.data,
    lead: lead.data,
    conversation_history: messages.data.map(m => ({ role: m.role, content: m.content })),
    recent_calls: calls.data.map(c => ({ date: c.created_at, duration: c.duration_seconds, summary: c.ai_summary })),
    task_queue: tasks.data,
    pipeline_overview: await getPipelineOverview(params.agent_id),
  };
}
```

### 9.5 AI Conversation Modes

| Mode | Trigger | Behavior |
|---|---|---|
| **Agent** | Click AI button in lead profile | Full tool access, actions on lead |
| **Assistant** | ⌘K command palette | Suggestions, no actions without confirmation |
| **Morning Briefing** | Play briefing button | Task-focused, performance summary, hot leads |
| **Call Summary** | Post-call auto | Generate summary, disposition, next steps |

### 9.6 Custom LLM Integration

```typescript
// lib/llm.ts
interface LLMConfig {
  api_key: string;
  base_url: string;       // Your LLM endpoint
  model: string;          // e.g., "revra-agent-v1"
  max_tokens: number;
  temperature: number;
}

async function chat(
  messages: OpenAI.Chat.ChatCompletionMessage[],
  tools: Tool[],
  context: ContextObject
): Promise<ChatCompletion> {
  // Attach context as system message + tool definitions
  // Stream response for UX
}
```

---

## 10. Implementation Phases

### Phase 1 — Foundation ✅ COMPLETE (2026-05-05)
- [x] Next.js 16 project setup with App Router
- [x] Clerk authentication + sign-in/sign-up pages
- [x] Workspace creation/selection flow
- [x] Role-based middleware routing
- [x] All 39 dashboard pages (user/admin/superadmin)
- [x] All 40 API routes with real data wiring
- [x] Clerk webhook → Supabase user sync
- [x] All UI components and layouts

### Phase 2 — Database Foundation 📋 PLANNED
- [ ] Supabase schema migrations (all tables)
- [ ] RLS policies on every table
- [ ] Real data queries in all API routes
- [ ] Seed data for demo
- [ ] See: `docs/phase2_plan.md`

### Phase 3 — Communications 📋 PLANNED
- [ ] Twilio SMS outbound/INBOUND
- [ ] LoopMessages (iMessage, WhatsApp, RCS)
- [ ] SendGrid email
- [ ] Real-time messaging (Supabase Realtime)
- [ ] Bulk campaign sending
- [ ] See: `docs/phase3_plan.md`

### Phase 4 — Voice 📋 PLANNED
- [ ] Twilio Voice (click-to-call)
- [ ] TwiML endpoints
- [ ] WebRTC softphone
- [ ] Call recording + storage
- [ ] AI call summarization
- [ ] See: `docs/phase4_plan.md`

### Phase 5 — Calendar + Marketplace 📋 PLANNED
- [ ] Google Calendar OAuth2 + two-way sync
- [ ] Lead marketplace CSV upload
- [ ] Assign leads to workspaces
- [ ] Lead enrichment API
- [ ] Multi-workspace per user (workspace_members table)
- [ ] Workspace switcher UI
- [ ] See: `docs/phase5_plan.md`

### Phase 6 — Polish (TBD)
- [ ] Performance optimization
- [ ] Mobile-responsive refinements
- [ ] Notification system
- [ ] Load testing

---

## 11. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_TWIML_AUTH_TOKEN=

# LoopMessages
LOOPMESSAGES_API_KEY=
LOOPMESSAGES_WEBHOOK_SECRET=

# SendGrid
SENDGRID_API_KEY=
SENDGRID_WEBHOOK_SECRET=

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Custom LLM
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=revra-agent-v1
```

---

## 12. File Structure (Current — Phase 1 Complete)

```
frontend-revra/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx     ← Clerk sign-in ✅
│   │   ├── sign-up/[[...sign-up]]/page.tsx     ← Clerk sign-up ✅
│   │   └── select-workspace/page.tsx           ← Workspace selector ✅
│   ├── user/                                    ← 17 user pages ✅
│   ├── admin/                                   ← 8 admin pages ✅
│   ├── superadmin/                              ← 10 superadmin pages ✅
│   └── api/
│       ├── webhooks/clerk/route.ts             ← Clerk sync ✅
│       ├── leads/                              ← Lead CRUD ✅
│       ├── calls/                              ← Call management ✅
│       ├── tasks/                              ← Task management ✅
│       ├── appointments/                       ← Calendar events ✅
│       ├── campaigns/                          ← Bulk campaigns ✅
│       ├── conversations/                       ← SMS conversations ✅
│       ├── channels/                           ← Team chat ✅
│       ├── team/                               ← Workspace members ✅
│       ├── workflows/                          ← Automation workflows ✅
│       ├── integrations/                       ← Third-party integrations ✅
│       ├── workspaces/                         ← Workspace management ✅
│       ├── admin/                              ← Admin dashboard APIs ✅
│       ├── superadmin/                         ← Superadmin APIs ✅
│       ├── emma-campaigns/                     ← AI voice campaigns ✅
│       ├── emma-queue/                         ← AI call queue ✅
│       ├── home/                               ← User home data ✅
│       ├── analytics/                          ← Analytics data ✅
│       └── briefing/                           ← Morning briefing ✅
│
├── components/
│   ├── ui/                                      ← 20 shadcn components ✅
│   ├── layouts/                                 ← Shell, CommandPalette, Notifications ✅
│   └── features/
│       ├── ai/                                  ← Emma AI chat ✅
│       ├── communications/                     ← AddLead, Invite, PostCall, etc. ✅
│       ├── csv/                                 ← CSVImportModal ✅
│       ├── lead/                                ← LeadProfilePanel, LeadProfileModal ✅
│       ├── modals/                              ← UserDetail, WorkspaceDetail, etc. ✅
│       ├── pipeline/                           ← KanbanBoard ✅
│       └── workflow/                            ← WorkflowCanvas ✅
│
├── context/
│   ├── auth-context.tsx                         ← Auth wrapper ✅
│   ├── theme-provider.tsx                       ← Dark/light theme ✅
│   └── lead-profile-context.tsx                 ← Lead panel state ✅
│
├── lib/
│   ├── supabase/                                ← Server + client clients ✅
│   ├── ai/tools.ts                             ← AI tool definitions ✅
│   ├── mock-data.ts                            ← Fallback seed data ✅
│   └── types.ts                                ← Shared TypeScript types ✅
│
└── docs/
    ├── phase1status.md                         ← What's built vs pending ✅
    ├── phase1_plan.md                           ← Phase 1 completed details ✅
    ├── phase2_plan.md                           ← Database migrations plan ✅
    ├── phase3_plan.md                           ← Communications plan ✅
    ├── phase4_plan.md                           ← Voice/Twilio plan ✅
    └── phase5_plan.md                           ← Calendar/Marketplace plan ✅
```

---

## 13. Testing Strategy

| Layer | Approach |
|---|---|
| Frontend | Playwright — critical user flows (login, open lead, send message, place call) |
| API | Supertest on Edge Functions — webhook payloads |
| Realtime | Manual testing + automated pub/sub tests |
| AI Agent | Eval suite — benchmark on standardized lead scenarios |

---

## 14. Monitoring & Observability

- **Supabase Dashboard** — DB performance, API usage, realtime connections
- **Edge Function logs** — via Supabase, or external (Datadog, Axiom)
- **Twilio Console** — call quality, usage, errors
- **Health page** (`/superadmin/health`) — custom status dashboard showing:
  - All webhook endpoints + last success/failure time
  - LLM API latency + error rate
  - Google Calendar sync status
  - Database connection pool

---

*Last updated: 2026-05-05 — Phase 1 Complete*