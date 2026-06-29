# RevRa Frontend-Ready Plan
**Version 1.0 | May 1, 2026**
**Goal:** Fully functional frontend — every button works, every element aligned, every feature from PRD2 + Lightfield implemented in UI. No design system yet. Clean, functional, professional.

---

## Phase 0: Audit — What's Broken Right Now

### 0.1 Current Problems

| Problem | Location | Fix |
|---|---|---|
| Kanban toggle does nothing | `user/pipeline` | Implement kanban board view |
| Add Lead button does nothing | `user/pipeline`, `admin` | Create AddLead modal |
| Import CSV button does nothing | `admin` | Create CSVImport modal |
| AI Sort button does nothing | `user/pipeline` | Implement AI sort |
| Post-call form missing | `user/calls` | Create PostCallForm modal |
| Team chat has no persistence UI | `user/team` | Add message send/receive simulation |
| Calendar has no event creation | `user/calendar` | Create NewAppointment modal |
| AI Draft button non-functional | `user/texts`, `user/pipeline` | Show loading + mock AI response |
| Google Calendar sync button | `user/calendar` | Show "syncing" state, then mock success |
| Twilio call button | `user/pipeline` | Open call interface |
| Team chat message send | `user/team` | Simulate send + append message |
| Invite Member | `admin/team` | Create InviteMember modal |
| Assign button in lead pool | `admin/lead-pool` | Show confirmation feedback |
| Stripe Portal button | `admin/subscriptions`, `superadmin/subscriptions` | Open Stripe mock portal |
| Configure buttons (integrations) | Multiple | Open config panel/modal |
| Save buttons | Settings pages | Show saved confirmation |
| New Campaign | `user/ai` | Open CampaignBuilder modal |
| Add to Queue | `user/ai` | Show confirmation |
| New Channel | `user/team` | Open NewChannel modal |
| Calendar event click | `user/calendar` | Open appointment detail/edit |
| Lead profile: notes save | `user/pipeline` | Save to localStorage |
| Morning Briefing Play | `user/page` | Simulate audio playback UI |

### 0.2 Missing Pages (Route-Level)

| Page | Route | Priority |
|---|---|---|
| Morning Briefing (full page) | `/user/briefing` | High |
| Tasks | `/user/tasks` | Medium |
| Active Call Interface | `/user/calls/active` | High |
| Lead Profile → Campaign Builder | `/user/ai/campaign/new` | High |
| Admin → Workflows | `/admin/workflows` | High |
| Super Admin → Add Workspace | (modal) | Low |
| Super Admin → Add User | (modal) | Low |
| Super Admin → Plan Editor | (modal) | Low |

### 0.3 Missing Shared Components

| Component | Priority | Used In |
|---|---|---|
| `Modal` (reusable) | Critical | AddLead, CSVImport, PostCall, CampaignBuilder, InviteMember, NewChannel, etc. |
| `Textarea` (standalone) | Critical | texts page, notes tab, SMS input |
| `Tabs` (reusable) | Critical | lead profile, superadmin providers, AI features |
| `CommandPalette` (Cmd+K) | High | All user/admin pages |
| `Toast` / notification | High | All form submissions, call outcomes |
| `SlideOver` (refactor lead profile) | High | Lead profile, any side panel |
| `KanbanBoard` | High | `user/pipeline` |
| `Avatar` | Medium | Team member lists, lead profiles |
| `Toggle` / Switch | Medium | Settings pages |
| `DropdownMenu` | Medium | Assign dropdowns, more menus |
| `Badge` (already exists) | — | — |
| `Tooltip` | Low | Icon buttons, badges |
| `Skeleton` | Low | Loading states |
| `EmptyState` | Low | Documents tab, email tab |
| `ProgressBar` | Medium | Pipeline stage bars, lead pool stats |
| `WorkflowCanvas` | High | `admin/workflows` page |
| `AICallInterface` | Critical | Active call view |

---

## Phase 1: Shared Components (Foundation)

**Goal:** Build all reusable UI primitives once so pages use them consistently.

### 1.1 Core UI Components

```
components/ui/
├── modal.tsx          — Reusable modal (title, body, footer, close)
├── textarea.tsx       — Standalone textarea (already imported in texts page)
├── tabs.tsx           — Reusable tabs (underline variant + pill variant)
├── toggle.tsx         — Toggle/Switch component
├── dropdown.tsx       — Dropdown menu (for assign, more options)
├── tooltip.tsx        — Hover tooltip
├── skeleton.tsx       — Loading skeleton
├── progress.tsx       — Progress bar for pipeline stages
├── avatar.tsx         — Avatar with fallback initials
├── empty-state.tsx    — Empty state with icon + message
└── dialog.tsx         — Confirmation dialog (delete, unsaved changes)
```

### 1.2 Layout Components

```
components/layouts/
├── Shell.tsx          — (existing — verify no issues)
├── CommandPalette.tsx  — Cmd+K global search overlay
├── SlideOver.tsx      — Refactored slide-over (lead profile uses this)
├── Header.tsx         — Page header with title + actions (used everywhere)
├── PageContainer.tsx  — Consistent page wrapper with max-width
└── GridLayout.tsx     — Reusable grid layouts (2-col, 3-col, stat cards)
```

### 1.3 Feature Components

```
components/features/
├── kanban/
│   ├── KanbanBoard.tsx     — Full kanban with drag-drop columns
│   ├── KanbanColumn.tsx   — Single column (stage)
│   └── KanbanCard.tsx     — Lead card within column
├── workflow/
│   ├── WorkflowCanvas.tsx — Visual node-based workflow builder
│   ├── WorkflowNode.tsx   — Individual node (trigger/condition/action/delay)
│   └── WorkflowEdge.tsx   — Connection lines between nodes
├── ai/
│   ├── AICallInterface.tsx — Active call split-screen view
│   ├── AIChatBar.tsx      — Floating RevRa AI chat bar
│   ├── AIMorningBriefing.tsx — Full morning briefing view
│   ├── AISMSDraft.tsx      — SMS draft generation UI
│   └── AILeadScoring.tsx   — Score display with factor breakdown
├── communications/
│   ├── TextConversation.tsx — Two-panel SMS/text layout
│   ├── CallQueue.tsx       — Call queue list (user dashboard)
│   ├── CallDialer.tsx      — Standalone dialer view
│   └── PostCallForm.tsx    — Post-call outcome + stage form
├── calendar/
│   ├── CalendarMonth.tsx  — Month view grid (extend existing)
│   ├── CalendarWeek.tsx   — Week view
│   └── AppointmentForm.tsx — New/edit appointment modal
├── csv/
│   ├── CSVImportModal.tsx  — Step 1: upload, Step 2: column mapping, Step 3: preview
│   └── CSVMappingRow.tsx  — Individual column mapping row
├── lead/
│   ├── LeadForm.tsx        — Add/edit lead form (all fields)
│   ├── LeadCard.tsx        — Compact lead card for kanban/list
│   └── LeadFilters.tsx     — Filter panel for pipeline/lead pool
└── task/
    ├── TaskList.tsx        — Central task view
    ├── TaskItem.tsx        — Single task row
    └── TaskFilters.tsx     — Filter by type, priority, due date
```

---

## Phase 2: User Dashboard — Full Feature Completion

### 2.1 `/user` (Dashboard)

| Element | Current | Needed |
|---|---|---|
| Morning Briefing widget | Static list, Play button does nothing | Play button shows audio playback UI (simulated) |
| Call Queue | Read-only list, Call button doesn't open | Call button opens `AICallInterface` |
| Stats cards | Static numbers | No change needed |
| Recent Activity | Static | No change needed |
| "Start Dialer" button | Does nothing | Opens `CallDialer` view |
| Notifications button | Does nothing | Opens notification panel (slide-over) |
| Click lead in queue | No action | Opens `LeadProfile` slide-over |

**Actions:**
- Create `AICallInterface` component
- Create `CallDialer` view (full-page or modal)
- Wire Call buttons to open call interface

### 2.2 `/user/pipeline` (Pipeline)

**Critical fixes:**
1. **Kanban view** — Implement `KanbanBoard` component. Drag-drop to change stage. Syncs with list view.
2. **Add Lead** — Create `AddLeadModal` with all fields from PRD3.3: name, phones, email, DOB, coverage type, carrier, budget, household, income, source, assignment.
3. **AI Sort** — Sort leads by AI score (descending), hot leads first.
4. **Lead Profile** — Already has slide-over, but needs: notes save to localStorage, stage change from within profile, "Add to Emma AI" action works.

**Add Lead Modal fields:**
```
- First Name (required)
- Last Name (required)
- Phone Primary (required)
- Phone Secondary (optional)
- Email (optional)
- Date of Birth (optional)
- State (required, dropdown)
- Coverage Type (required: ACA/Medicare/Final Expense/Life/Group Health)
- Current Carrier (optional)
- Monthly Budget (optional)
- Household Size (optional)
- Income Range (optional)
- Lead Source (required: Meta Ads/Manual/CSV/Referral)
- Assigned Agent (optional dropdown)
- Exclusive (toggle)
```

### 2.3 `/user/ai` (Emma AI)

| Element | Current | Needed |
|---|---|---|
| New Campaign button | Does nothing | Opens `CampaignBuilderModal` |
| Add to Queue button | Does nothing | Shows lead selector → confirm |
| Play/Pause campaign | Static | Toggles state with visual feedback |
| Settings per campaign | Does nothing | Opens campaign config panel |
| Remove from queue | X button | Confirms removal, updates list |

**CampaignBuilderModal steps:**
1. Campaign name
2. Coverage type (ACA/Medicare/Final Expense/Life/Group Health)
3. Target pipeline stages (multi-select)
4. Target agents (multi-select)
5. AI script (textarea)
6. Call timeout, max retries, voicemail behavior
7. Review → Create

### 2.4 `/user/calls` (Call History)

| Element | Current | Needed |
|---|---|---|
| Play recording button | Non-functional | Open audio player (mock audio URL) |
| Call back button | Does nothing | Opens call interface with pre-filled lead |
| "More" filter | Non-functional | Opens filter panel (date range, agent, campaign) |
| Export button | Does nothing | Triggers file download (mock CSV) |
| Row click | No action | Opens lead profile |

**Post-call form** (appears after call ends, not in call history page):
- Create as a modal that opens after the active call ends
- Fields: outcome (required), next stage (required, AI-suggested), notes, schedule follow-up toggle, add to Emma AI queue toggle

### 2.5 `/user/texts` (Text History)

| Element | Current | Needed |
|---|---|---|
| Send message | Does nothing | Appends message to thread (optimistic UI) |
| AI Draft button | Non-functional | Shows loading state (1s) → mock AI draft in textarea |
| Channel filter tabs | Work but no real data | No change |
| Unread indicators | Static | No change |

### 2.6 `/user/calendar` (Calendar)

| Element | Current | Needed |
|---|---|---|
| New Appointment button | Does nothing | Opens `AppointmentFormModal` |
| Google Calendar sync | Does nothing | Shows syncing → synced confirmation |
| Click event on calendar | Does nothing | Opens appointment detail/edit |
| Click appointment → Join/Call | Does nothing | Opens video call link or call interface |
| Reschedule button | Does nothing | Opens appointment form in edit mode |
| Prev/Next month navigation | Static dates | Implement real month navigation |

**AppointmentFormModal fields:**
```
- Lead (required, search/select)
- Date (required, date picker)
- Time (required, time picker)
- Duration (required: 15/30/45/60 min)
- Type (required: Phone/Video/In-Person)
- Meeting link (auto-generate for Video, optional for In-Person)
- Notes (optional)
- Generate AI Pre-Meeting Brief (toggle)
```

### 2.7 `/user/team` (Team Chat)

| Element | Current | Needed |
|---|---|---|
| Send message | Does nothing | Appends to thread (optimistic, with timestamp) |
| New Channel button | Does nothing | Opens `NewChannelModal` |
| Members button | Does nothing | Opens members slide-over |
| DMs tab | Shows static DMs | Add "New DM" button that opens user picker |
| Unread badges | Static | No change |

**NewChannelModal:** Channel name, description (optional), member selection

### 2.8 `/user/settings` (User Settings)

| Element | Current | Needed |
|---|---|---|
| Save Changes button | Does nothing | Shows "Saved" confirmation toast |
| Change Photo | Non-functional | Show file picker (mock success) |
| Google Calendar connect | Shows connected | Refresh button shows syncing → success |
| Twilio configure | Opens external link (placeholder) | Open Twilio config panel |

### 2.9 `/user/briefing` (NEW — Morning Briefing Full Page)

Create full morning briefing page at `/user/briefing` with:
- 8 sections: Overdue Follow-Ups (red), Due Today (yellow), Tomorrow's Prep (blue), Hot Leads (orange), New Leads (green), Appointments Today (purple), Renewals This Month (amber), AI Suggestions (violet)
- Each section: AI-written summary sentence + lead list with quick action buttons
- "Read Aloud" button (Web Speech API — simulated for now)
- "Regenerate" button (simulated loading)
- Date header showing "May 1, 2026"

### 2.10 `/user/tasks` (NEW — Tasks Page)

Create `/user/tasks` with:
- Central task view (per PRD section — extracted from calls and emails)
- Filter by type (Follow-up/Callback/Send Info/Reactivation/Custom)
- Filter by priority (Low/Medium/High/Urgent)
- Filter by status (Open/Completed/Overdue)
- Task source indicator (from call / from email / manual)
- "Mark Complete" action
- "Reschedule" action
- Link back to source lead

### 2.11 Active Call Interface (Critical)

Create `/user/calls/active/page.tsx` as a split-screen view:
```
LEFT PANEL (AI Script):
- Lead name + coverage type header
- AI-generated talking points (3-5 bullets)
- Checklist of topics to cover (checkboxes)
- Anticipated objections
- Live note-taking textarea
- Pause/Resume recording button
- End Call button

RIGHT PANEL (Lead Context):
- Full lead profile (compact view)
- Insurance details
- Last conversation summary
- Upcoming appointments
- Call timer (counting up)
- Quick actions: SMS, Add Note, Schedule
```

---

## Phase 3: Admin Dashboard — Full Feature Completion

### 3.1 `/admin` (Admin Dashboard)

| Element | Current | Needed |
|---|---|---|
| Add Lead button | Does nothing | Opens `AddLeadModal` |
| Import CSV button | Does nothing | Opens `CSVImportModal` |
| Pipeline stages | Static bars | Implement actual stage data |
| Team Activity | Static | No change (simulated real-time) |
| Recent Leads table | Read-only | Click opens lead profile |

### 3.2 `/admin/lead-pool` (Lead Pool)

| Element | Current | Needed |
|---|---|---|
| Assign button | Does nothing | Shows "Assigned to John Smith" confirmation toast, moves lead out of pool |
| Filters | Static | Implement real filtering (debounced search, type/source dropdowns) |
| Refresh button | Does nothing | Refreshes lead count (simulated) |
| Bulk assign | Not present | Add "Select All" + "Bulk Assign" button |

### 3.3 `/admin/team` (Team Management)

| Element | Current | Needed |
|---|---|---|
| Invite Member button | Does nothing | Opens `InviteMemberModal` |
| Mail button per member | Does nothing | Opens email compose (mock) |
| Role filter | Works | No change |
| Status filter | Works | No change |
| Search bar | Works | No change |

**InviteMemberModal:** Email, role (Agent/Admin/Viewer), first name, last name → sends mock invite

### 3.4 `/admin/performance` (Team Performance)

| Element | Current | Needed |
|---|---|---|
| Period filter | Not present | Add: This Week / This Month / This Quarter / This Year |
| Export Report button | Does nothing | Downloads mock PDF/CSV report |
| Row click (agent) | No action | Opens agent detail slide-over |

**Agent Detail SlideOver:**
- Agent info (name, email, role, last active)
- Performance stats (leads, calls, conversion, revenue)
- Recent activity feed
- Leads assigned list
- "Reassign All Leads" button
- "Deactivate" button

### 3.5 `/admin/integrations` (Integrations)

| Element | Current | Needed |
|---|---|---|
| Configure button | Does nothing | Opens `IntegrationConfigModal` per integration |
| Refresh button | Does nothing | Shows syncing → success |
| Slack | Disconnected | "Connect" button → shows "OAuth flow" simulation |

**IntegrationConfigModal per integration:**
- Twilio: phone number, webhook URL display
- Meta Ads: ad account ID, webhook URL, test connection button
- Google Calendar: OAuth connect/disconnect
- Stripe: billing portal link
- EMMA AI: API key, workspace config
- Slack: OAuth connect

### 3.6 `/admin/subscriptions` (Subscriptions)

| Element | Current | Needed |
|---|---|---|
| Stripe Portal button | Does nothing | Opens "Stripe Portal" in new tab (mock URL) |
| Upgrade buttons | Do nothing | Show "Contact Sales" or plan upgrade confirmation |
| Seats usage | Static 8/40 | Add "Manage Seats" button → modal |

### 3.7 `/admin/settings` (Workspace Settings)

| Element | Current | Needed |
|---|---|---|
| Save button | Does nothing | Shows saved confirmation toast |
| All fields | Static | Work as form inputs |
| Auto-distribution toggle | Works (visual only) | No backend logic needed yet |

### 3.8 `/admin/workflows` (NEW — Workflow Automation)

Create `/admin/workflows` with:
- **Workflow list** (table): name, trigger type, effectiveness %, last run, status (active/paused)
- **"Create Workflow" button** → opens `WorkflowCanvas`
- **WorkflowCanvas:** n8n-style visual builder
  - Left panel: node palette (Trigger/Condition/Action/Delay nodes)
  - Center: canvas with drag-and-drop nodes + bezier curve connections
  - Right panel: node configuration when selected
  - Save / Publish / Test buttons

---

## Phase 4: Super Admin Dashboard — Full Feature Completion

### 4.1 `/superadmin` (Platform Overview)

| Element | Current | Needed |
|---|---|---|
| Quick Actions | Do nothing | Add Workspace → modal, Platform Settings → page, View Alerts → slide-over |
| All Systems Operational | Static badge | No change |
| Top Workspaces table | Read-only | Click row → workspace detail slide-over |

**WorkspaceDetail slide-over:**
- Workspace name, owner, plan, status
- User count, lead count, MRR
- Subscription status
- "Upgrade Plan" button
- "Suspend Workspace" button
- "Delete Workspace" button (with confirmation)

### 4.2 `/superadmin/workspaces` (All Workspaces)

| Element | Current | Needed |
|---|---|---|
| Add Workspace button | Does nothing | Opens `AddWorkspaceModal` |
| Detail button | Does nothing | Opens workspace slide-over |
| Status filter | Not present | Add status filter |
| Plan filter | Not present | Add plan filter |

**AddWorkspaceModal:**
- Workspace name
- Owner name + email
- Plan (dropdown)
- Trial period toggle
- Create button

### 4.3 `/superadmin/users` (All Users)

| Element | Current | Needed |
|---|---|---|
| Add User button | Does nothing | Opens `AddUserModal` |
| Role filter | Works | No change |
| Workspace filter | Not present | Add workspace filter |
| Row click | No action | Opens user detail slide-over |

**UserDetail slide-over:**
- User info, role, workspace
- Lead count, last active
- "Change Role" dropdown
- "Deactivate" button
- "Impersonate" button

### 4.4 `/superadmin/ai` (AI & LLM Providers)

| Element | Current | Needed |
|---|---|---|
| Add Provider button | Does nothing | Opens `AddProviderModal` |
| Configure/Test buttons | Do nothing | Show configuration panel + mock "connection successful" |
| Copy API Key | Works | No change |
| EMMA AI Configure | Does nothing | Open EMMA config panel |
| AI Features Enable/Disable | Toggles | Show saved confirmation |

**AddProviderModal:** Provider name, API key, model ID, max tokens, temperature

### 4.5 `/superadmin/health` (System Health)

| Element | Current | Needed |
|---|---|---|
| Refresh button | Does nothing | Refreshes status (simulated) |
| Alert row click | No action | Opens alert detail slide-over |
| Meta Webhooks degraded | Static | Show "Investigating" status + timestamp |

### 4.6 `/superadmin/integrations` (Platform Integrations)

| Element | Current | Needed |
|---|---|---|
| Sync button per integration | Does nothing | Shows syncing → success |
| Configure button | Does nothing | Opens integration config panel |
| Connect button (Slack/Intercom) | Does nothing | Simulates OAuth flow → shows connected |

### 4.7 `/superadmin/performance` (Cross-Workspace Performance)

| Element | Current | Needed |
|---|---|---|
| Period selector | Not present | Add: This Month / Last 3 Months / Last 6 Months / Year |
| Export button | Does nothing | Downloads report |
| Revenue chart | Static bars | Implement interactive chart (hover for details) |
| Agent row click | No action | Opens agent cross-workspace detail |

### 4.8 `/superadmin/subscriptions` (All Subscriptions)

| Element | Current | Needed |
|---|---|---|
| Plan tier edit | Does nothing | "Edit Plan" → modal to change plan tier |
| Subscription row | Read-only | Click → subscription detail slide-over |
| Stripe Dashboard link | Does nothing | Opens mock Stripe Dashboard |

### 4.9 `/superadmin/settings` (Platform Settings)

| Element | Current | Needed |
|---|---|---|
| Save button | Does nothing | Shows saved confirmation |
| Generate webhook secret | Not present | Button to regenerate secret |

---

## Phase 5: Global Features (All Dashboards)

### 5.1 Command Palette (Cmd+K)

Create `CommandPalette.tsx` — opens with Cmd+K (or Ctrl+K on Windows):
- Search across: leads, contacts, pages, settings, actions
- Recent searches
- Quick actions: "Add Lead", "Start Dialer", "New Appointment", "Open Pipeline"
- Keyboard navigation (arrow keys, enter to select, esc to close)
- Grouped results: Leads / Pages / Actions

### 5.2 Toast Notifications

Create `Toast.tsx` system:
- Success toasts: "Lead assigned", "Message sent", "Changes saved"
- Error toasts: "Failed to send", "Connection error"
- Info toasts: "Syncing...", "Processing..."
- Auto-dismiss after 3 seconds
- Stack multiple toasts

### 5.3 Notification Panel

Create slide-over notification panel:
- Unread notification count
- Notification list (lead assigned, stage changed, call completed, etc.)
- Mark all as read
- Click notification → navigate to relevant page

### 5.4 Global Search Bar (in Shell)

Add search bar to Shell sidebar or header:
- Quick lead search
- Navigate to any page
- Access to Command Palette

---

## Phase 6: Lightfield-Inspired Additions

These features come from Lightfield's feature set, not currently in RevRa's PRD:

### 6.1 AI Q&A Chat Bar (RevRa AI)

Create `RevRaAIChat.tsx` — floating chat bar at bottom of screen:
- Persistent on every user page
- Natural language questions: "Which leads are stalling?", "Show me hot leads with Medicare"
- Answers with citations (mock)
- Quick action buttons in responses
- Collapsible to icon only

### 6.2 Stalled Deal Revival

In pipeline view, add "Stalled Deals" section:
- Leads with no activity in 7+ days
- AI-generated revival message drafts
- "Send to All" bulk action

### 6.3 Lead Detail Enhancement

In lead profile → Overview tab:
- Add "Next Best Action" section (AI-generated recommendation)
- Add "Related Leads" (same household, same source)
- Add "Last 5 Activities" compact view

### 6.4 List Management

In pipeline page, add "Save as List" feature:
- Name the list
- Auto-saves filter configuration
- Access from sidebar navigation

### 6.5 Table Column Customization

In pipeline and call history tables:
- Show/hide columns
- Reorder columns
- Sort preferences saved

---

## Phase 7: Polish & Quality

### 7.1 Alignment & Spacing Audit

Every page must follow consistent spacing:
```
Section gaps: space-y-8 (32px) — use in page-level containers
Card padding: p-6 (24px) — use in all Card components
Grid gaps: gap-6 (24px) for 2-col, gap-4 (16px) for 3-4 col
Inline gaps: gap-3 (12px) for related elements, gap-6 (24px) for loose
Button spacing: gap-3 in button groups
Table cell padding: px-4 py-3
```

### 7.2 Empty States

Every list/table must have an empty state:
```
No leads: "No leads yet. Add your first lead to get started."
No tasks: "All caught up! No pending tasks."
No messages: "Start the conversation by sending a message."
No campaigns: "No Emma AI campaigns yet. Create your first campaign."
```

### 7.3 Loading States

Add skeleton loaders for:
- Pipeline table on load
- Call history on load
- Lead profile on load
- Dashboard stats on load

### 7.4 Error States

Add error boundaries for:
- Failed to load pipeline
- Failed to load lead profile
- Network error states

### 7.5 Confirmation Dialogs

Every destructive action must have confirmation:
- Delete lead
- Deactivate user
- Remove from queue
- Close campaign

---

## Implementation Order

### Week 1: Core Components + Critical Fixes
1. Build Modal, Textarea, Tabs, Toggle, Dropdown, Toast
2. Fix kanban board in pipeline (biggest visual feature)
3. Add Lead modal
4. Lead profile → make notes save
5. Post-call form modal
6. Cmd+K command palette

### Week 2: User Dashboard Completion
1. Active call interface
2. Calendar appointment form
3. CSV import modal
4. Morning Briefing full page
5. Tasks page
6. Team chat: send message + new channel

### Week 3: Admin + Super Admin
1. Admin workflows page + canvas
2. Admin team → invite member modal
3. Admin integrations → config panels
4. Lead pool → bulk assign
5. Super admin workspaces → add workspace modal
6. Super admin users → add user modal

### Week 4: Polish + Lightfield Features
1. AI Q&A chat bar
2. Stalled deal revival
3. Lead profile enhancements
4. Notification panel
5. Empty states everywhere
6. Loading states everywhere
7. Alignment audit

---

## File Structure (Final)

```
app/
├── layout.tsx                    (Inter + JetBrains Mono, metadata)
├── page.tsx                      (Landing page — role selection)
├── globals.css
├── user/
│   ├── page.tsx                  (Dashboard)
│   ├── pipeline/page.tsx         (Pipeline list + kanban + lead profile)
│   ├── calls/
│   │   ├── page.tsx             (Call history)
│   │   └── active/page.tsx       (Active call interface) [NEW]
│   ├── texts/page.tsx            (SMS/text history)
│   ├── ai/page.tsx              (Emma AI campaigns)
│   ├── calendar/page.tsx         (Calendar)
│   ├── team/page.tsx            (Team chat)
│   ├── tasks/page.tsx           (Tasks) [NEW]
│   ├── briefing/page.tsx        (Morning Briefing full page) [NEW]
│   └── settings/page.tsx        (User settings)
├── admin/
│   ├── page.tsx                 (Admin dashboard)
│   ├── lead-pool/page.tsx       (Unassigned leads)
│   ├── team/page.tsx            (Team management)
│   ├── performance/page.tsx     (Team leaderboard)
│   ├── integrations/page.tsx    (Workspace integrations)
│   ├── subscriptions/page.tsx   (Plan + billing)
│   ├── settings/page.tsx         (Workspace settings)
│   └── workflows/page.tsx       (Workflow automation) [NEW]
└── superadmin/
    ├── page.tsx                 (Platform overview)
    ├── workspaces/page.tsx      (All workspaces)
    ├── users/page.tsx           (All users)
    ├── performance/page.tsx     (Cross-workspace analytics)
    ├── subscriptions/page.tsx    (All subscriptions)
    ├── integrations/page.tsx     (Platform integrations)
    ├── ai/page.tsx              (LLM + EMMA providers)
    ├── providers/page.tsx       (Message providers)
    ├── health/page.tsx          (System health)
    └── settings/page.tsx        (Platform settings)

components/
├── ui/
│   ├── button.tsx               (existing — verify)
│   ├── card.tsx                 (existing — verify)
│   ├── badge.tsx                (existing — verify)
│   ├── input.tsx                (existing — verify)
│   ├── label.tsx                (existing — verify)
│   ├── select.tsx               (existing — verify)
│   ├── table.tsx                (existing — verify)
│   ├── modal.tsx                [NEW]
│   ├── textarea.tsx              [NEW]
│   ├── tabs.tsx                  [NEW]
│   ├── toggle.tsx                [NEW]
│   ├── dropdown.tsx             [NEW]
│   ├── tooltip.tsx               [NEW]
│   ├── skeleton.tsx              [NEW]
│   ├── progress.tsx              [NEW]
│   ├── avatar.tsx                [NEW]
│   ├── empty-state.tsx           [NEW]
│   └── dialog.tsx                [NEW]
├── layouts/
│   ├── Shell.tsx                 (existing — verify)
│   ├── CommandPalette.tsx        [NEW]
│   ├── SlideOver.tsx             [NEW]
│   └── Header.tsx                [NEW]
└── features/
    ├── kanban/
    │   ├── KanbanBoard.tsx       [NEW]
    │   ├── KanbanColumn.tsx      [NEW]
    │   └── KanbanCard.tsx        [NEW]
    ├── workflow/
    │   ├── WorkflowCanvas.tsx    [NEW]
    │   ├── WorkflowNode.tsx      [NEW]
    │   └── WorkflowEdge.tsx      [NEW]
    ├── ai/
    │   ├── AICallInterface.tsx   [NEW]
    │   ├── RevRaAIChat.tsx       [NEW]
    │   ├── AIMorningBriefing.tsx [NEW]
    │   ├── AISMSDraft.tsx        [NEW]
    │   └── PostCallForm.tsx      [NEW]
    ├── communications/
    │   ├── TextConversation.tsx  [REFACTOR texts page]
    │   ├── CallQueue.tsx         [REFACTOR dashboard]
    │   └── CallDialer.tsx        [NEW]
    ├── calendar/
    │   ├── CalendarMonth.tsx     [REFACTOR calendar]
    │   ├── CalendarWeek.tsx       [NEW]
    │   └── AppointmentForm.tsx   [NEW]
    ├── csv/
    │   ├── CSVImportModal.tsx    [NEW]
    │   └── CSVMappingRow.tsx     [NEW]
    ├── lead/
    │   ├── LeadForm.tsx          [NEW]
    │   ├── LeadCard.tsx          [NEW]
    │   └── LeadFilters.tsx       [NEW]
    ├── task/
    │   ├── TaskList.tsx          [NEW]
    │   ├── TaskItem.tsx          [NEW]
    │   └── TaskFilters.tsx       [NEW]
    ├── team/
    │   ├── NewChannelModal.tsx   [NEW]
    │   └── InviteMemberModal.tsx [NEW]
    └── modals/
        ├── AddLeadModal.tsx      [NEW]
        ├── AddWorkspaceModal.tsx  [NEW]
        ├── AddUserModal.tsx      [NEW]
        ├── InviteMemberModal.tsx [NEW]
        ├── CampaignBuilderModal.tsx [NEW]
        ├── AddProviderModal.tsx  [NEW]
        ├── IntegrationConfigModal.tsx [NEW]
        ├── WorkspaceDetailPanel.tsx [NEW]
        ├── UserDetailPanel.tsx   [NEW]
        └── ConfirmationDialog.tsx [NEW]

lib/
├── utils.ts                      (cn() — existing)
├── mock-data.ts                  [NEW — shared mock data across pages]
└── constants.ts                   [NEW — pipeline stages, coverage types, etc.]
```

---

## Mock Data Strategy

Create `lib/mock-data.ts` with all mock data in one place:
- `LEADS` — array of 20+ leads with full data
- `USERS` — agents, admins, super admins
- `WORKSPACES` — 8 workspaces
- `CAMPAIGNS` — Emma AI campaigns
- `APPOINTMENTS` — calendar events
- `TEAM_MEMBERS` — for team chat
- `CHANNELS` — for team chat
- `MESSAGES` — conversations
- `CALLS` — call history
- `TASKS` — task list
- `ALERTS` — system alerts
- `SERVICES` — health monitoring

All pages import from mock-data.ts. This makes data consistent and easy to update in one place.

---

*End of Plan*