"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layouts/Shell";
import { SingleEmailComposer } from "@/components/features/campaigns/SingleEmailComposer";
import {
  Plus,
  Phone,
  Paperclip,
  Send,
  Check,
  CheckCheck,
  ArrowLeft,
  MessageSquare,
  Loader2,
  Mail,
} from "lucide-react";

type Conversation = {
  id: string;
  channel: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  lead: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
    score: number;
    pipeline_stage: string;
    lead_type: string | null;
    source: string | null;
    opted_out: boolean;
  } | null;
};

type Message = {
  id: string;
  lead_id: string;
  channel: string;
  direction: "inbound" | "outbound";
  body: string;
  external_status: string | null;
  // 'sendillo' for SMS routed through the Sendillo API; 'twilio'
  // for legacy rows that used the Twilio SID. NULL means the row
  // predates the provider column.
  provider: "sendillo" | "twilio" | null;
  sent_at: string;
  created_at: string;
};

type ConvTab = "all" | "unread" | "sms";

const convTabs: ConvTab[] = ["all", "unread", "sms"];

const channelIcons: Record<string, string> = {
  sms: "SMS",
  imessage: "iMessage",
  whatsapp: "WhatsApp",
  rcs: "RCS",
  email: "Email",
};

function normalizeDialNumber(phone: string) {
  return phone.replace(/[^\d+*#]/g, "");
}

function formatPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  if (digits.length > 10) return `+${digits.slice(0, digits.length - 10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
  return phone;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function channelBadge(channel: string) {
  const colors: Record<string, { bg: string; text: string }> = {
    sms: { bg: "rgba(59,130,246,0.15)", text: "var(--blue-400, #60a5fa)" },
    imessage: { bg: "rgba(16,185,129,0.15)", text: "var(--mint, #34d399)" },
    whatsapp: { bg: "rgba(16,185,129,0.15)", text: "var(--mint, #34d399)" },
    email: { bg: "rgba(249,115,22,0.15)", text: "#fb923c" },
  };
  const c = colors[channel] ?? colors.sms;
  return (
    <span
      style={{
        padding: "2px 7px",
        borderRadius: "var(--radius-md)",
        fontSize: 10,
        fontWeight: 500,
        background: c.bg,
        color: c.text,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {channelIcons[channel] ?? channel}
    </span>
  );
}

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allLeads, setAllLeads] = useState<Conversation["lead"][]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [errorConvs, setErrorConvs] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>("");
  const [tab, setTab] = useState<ConvTab>("all");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  // Sendillo numbers registered for this workspace. Fetched on
  // mount; if there are 0 active numbers the chat composer is
  // disabled with a clear message; if there are >1 active numbers
  // the user picks one from a small dropdown in the chat header.
  const [sendilloNumbers, setSendilloNumbers] = useState<
    Array<{ id: string; phone_number: string; label: string | null }>
  >([]);
  const [sendilloFrom, setSendilloFrom] = useState<string>("");

  // Single-send email composer (header button -> opens modal pre-filled with active lead)
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [senderEmail, setSenderEmail] = useState("hello@yourdomain.com");
  const [senderName, setSenderName] = useState("RevRa CRM");
  const messagesRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch all leads with phone numbers for the contact list
  const fetchAllLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads?limit=200");
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = await res.json();
      const leads = (data.leads || []).map((l: Record<string, unknown>) => ({
        id: l.id,
        first_name: l.first_name,
        last_name: l.last_name,
        phone: l.phone,
        email: l.email,
        score: l.score,
        pipeline_stage: l.pipeline_stage,
        lead_type: l.lead_type,
        source: l.source,
        opted_out: l.opted_out,
      }));
      setAllLeads(leads);
    } catch (err) {
      console.error("Failed to load leads:", err);
    }
  }, []);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?tab=${tab}&limit=50`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setConversations(data.conversations || []);
      // If nothing active yet and we have conversations, select first
      if (data.conversations?.length > 0 && !activeId) {
        setActiveId(data.conversations[0].lead?.id ?? "");
      }
    } catch (err: unknown) {
      setErrorConvs(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      setLoadingConvs(false);
    }
  }, [tab, activeId]);

  // Fetch messages for active lead
  const fetchMessages = useCallback(async (leadId: string) => {
    if (!leadId) return;
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/messages?limit=50`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // Mark conversation as read
  const markRead = useCallback(async (convId: string) => {
    if (!convId) return;
    try {
      await fetch(`/api/conversations/${convId}/read`, { method: "POST" });
    } catch {
      // silent
    }
  }, []);

  // Initial load
  useEffect(() => {
    queueMicrotask(() => { fetchConversations(); fetchAllLeads(); });
  }, [fetchConversations, fetchAllLeads]);

  // Load messages when active lead changes
  useEffect(() => {
    if (activeId) {
      queueMicrotask(() => fetchMessages(activeId));
      // Mark conversation as read
      const conv = conversations.find((c) => c.lead?.id === activeId);
      if (conv && conv.unread_count > 0) {
        markRead(conv.id);
        // Optimistically update unread count locally
                queueMicrotask(() => setConversations((prev) =>
          prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
        ));
      }
    }
  }, [activeId, conversations, fetchMessages, markRead]);

  // Polling for new messages every 5 seconds when active
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!activeId) return;

    pollRef.current = setInterval(() => {
      fetchMessages(activeId);
      fetchConversations();
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeId, fetchMessages, fetchConversations]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch SendGrid sender info (for the single-send composer)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/sendgrid/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        if (d.from_email) setSenderEmail(d.from_email);
        if (d.from_name) setSenderName(d.from_name);
      })
      .catch(() => { /* keep defaults */ });
    return () => { cancelled = true; };
  }, []);

  // Fetch Sendillo numbers registered for this workspace. The chat
  // composer uses these to pick which number to send from. Workspaces
  // with 0 active numbers get a disabled send button; workspaces with
  // 1+ see a small dropdown in the chat header.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/sendillo/numbers?type=registered")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        const active = (d.numbers ?? []).filter(
          (n: { is_active: boolean; phone_number: string | null }) =>
            n.is_active && n.phone_number
        );
        setSendilloNumbers(active);
        // Auto-pick the first active number so the user doesn't have to
        // choose when there's only one.
        if (active.length > 0) setSendilloFrom(active[0].phone_number);
      })
      .catch(() => { /* keep empty list */ });
    return () => { cancelled = true; };
  }, []);

  const sendMessage = async () => {
    if (!draft.trim() || !activeId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/leads/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "sms", body: draft, from: sendilloFrom }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setDraft("");
        fetchConversations();
      } else {
        // Surface server errors so the user knows why the send didn't go
        // through (most common: no active Sendillo number registered).
        const errBody = await res.json().catch(() => ({}));
        setErrorConvs(errBody.error ?? `Send failed (${res.status})`);
        setTimeout(() => setErrorConvs(null), 5000);
      }
    } catch {
      // silent fail - keep draft
    } finally {
      setSending(false);
    }
  };

  // Build unified contact list: all leads + conversation metadata
  const contactList = useMemo(() => {
    // Build a map of lead_id -> conversation data
    const convMap = new Map<string, Conversation>();
    for (const c of conversations) {
      if (c.lead?.id) convMap.set(c.lead.id, c);
    }

    // For each lead, merge with conversation data if available
    const merged = allLeads
      .filter((lead): lead is NonNullable<Conversation["lead"]> => !!lead)
      .map((lead) => {
        const conv = convMap.get(lead.id);
        return {
          id: conv?.id ?? `no-conv-${lead.id}`,
          lead,
          channel: conv?.channel ?? "sms",
          last_message: conv?.last_message ?? null,
          last_message_at: conv?.last_message_at ?? null,
          unread_count: conv?.unread_count ?? 0,
          created_at: conv?.created_at ?? new Date().toISOString(),
          hasConversation: !!conv,
        };
      });

    // Sort: unread first, then by last_message_at (newest first), then leads with no messages last
    merged.sort((a, b) => {
      if (a.unread_count > 0 && b.unread_count === 0) return -1;
      if (b.unread_count > 0 && a.unread_count === 0) return 1;
      const aTime = a.last_message_at ?? "1970-01-01";
      const bTime = b.last_message_at ?? "1970-01-01";
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return merged;
  }, [allLeads, conversations]);

  const filteredConvs = useMemo(() => {
    if (tab === "all") return contactList;
    if (tab === "unread") return contactList.filter((c) => c.unread_count > 0);
    if (tab === "sms") return contactList.filter((c) => c.channel === "sms" || c.channel === "imessage");
    return contactList;
  }, [contactList, tab]);

  const uniqueMessages = useMemo(() => {
    const seen = new Set();
    return messages.filter((m) => {
      if (!m.id) return true;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);

  const currentContact = contactList.find((c) => c.lead?.id === activeId);
  const currentLead = currentContact?.lead;
  const initials = currentLead
    ? `${currentLead.first_name?.[0] ?? ""}${currentLead.last_name?.[0] ?? ""}`.toUpperCase()
    : "??";
  const fullName = currentLead
    ? `${currentLead.first_name} ${currentLead.last_name || ""}`.trim()
    : "Select a conversation";

  const isOptedOut = currentLead?.opted_out ?? false;
  const callsHref = currentLead?.phone
    ? `/user/calls?phone=${encodeURIComponent(normalizeDialNumber(currentLead.phone))}`
    : "/user/calls";

  const handleNewConversation = () => {
    router.push("/user/calls");
  };

  // Whether the send button should be disabled. Disabled when:
  // - No draft / no active lead (handled by button attr)
  // - Workspace has zero active Sendillo numbers registered
  const noSendilloNumbers = sendilloNumbers.length === 0;
  const sendDisabled = !draft.trim() || !currentLead || noSendilloNumbers || sending;

  return (
    <Shell role="user">
      <div className="conversations-shell" style={{ display: "flex", height: "100%", overflow: "hidden" }}>
        {/* Conversation list */}
        <div
          className={`conversations-list ${activeId ? "has-active" : ""}`}
          style={{
            width: 320,
            flexShrink: 0,
            borderRight: "1px solid rgba(37,43,63,0.7)",
            display: "flex",
            flexDirection: "column",
            background: "rgba(19,24,38,0.95)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 16px 12px",
              borderBottom: "1px solid rgba(37,43,63,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>Conversations</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button className="btn-icon p-2" title="New call" onClick={handleNewConversation}>
                <Plus size={14} />
              </button>
              <Link className="btn-icon p-2" title="Open calls dialer" href="/user/calls">
                <Phone size={14} />
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "8px 12px",
              borderBottom: "1px solid rgba(37,43,63,0.5)",
            }}
          >
            {convTabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "var(--radius-md)",
                  fontSize: 11.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "none",
                  textTransform: "capitalize",
                  background: tab === t ? "var(--surface-2)" : "transparent",
                  color: tab === t ? "var(--ink)" : "var(--ink-mute)",
                  boxShadow: tab === t ? "inset 0 0 0 1px var(--line-2)" : "none",
                  transition: "all 0.12s",
                }}
              >
                {t === "all" ? "All" : t === "unread" ? "Unread" : t === "sms" ? "SMS" : t}
              </button>
            ))}
          </div>

          {/* Items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {loadingConvs && filteredConvs.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 40, color: "var(--ink-mute)" }}>
                <Loader2 size={14} className="animate-spin" />
                <span style={{ fontSize: 12 }}>Loading...</span>
              </div>
            ) : errorConvs ? (
              <div style={{ padding: 20, color: "var(--rose)", fontSize: 12 }}>
                {errorConvs}
                <button className="btn-ghost" style={{ marginTop: 8, padding: "4px 8px", fontSize: 11 }} onClick={fetchConversations}>
                  Retry
                </button>
              </div>
            ) : filteredConvs.length === 0 ? (
              <div style={{ padding: 20, color: "var(--ink-mute)", fontSize: 12, textAlign: "center" }}>
                No contacts found
              </div>
            ) : (
              filteredConvs.map((c) => {
                const isActive = c.lead?.id === activeId;
                const convInitials = c.lead
                  ? `${c.lead.first_name?.[0] ?? ""}${c.lead.last_name?.[0] ?? ""}`.toUpperCase()
                  : "??";
                const phoneFormatted = formatPhone(c.lead?.phone ?? null);
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveId(c.lead?.id ?? "")}
                    className="conv-item"
                    style={{
                      ...(isActive ? { background: "var(--surface-2)" } : {}),
                      cursor: "pointer",
                      padding: "10px 12px",
                      borderRadius: "var(--radius-lg)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      marginBottom: 2,
                      opacity: c.hasConversation ? 1 : 0.65,
                    }}
                  >
                    <div
                      className="avatar"
                      style={{
                        width: 36,
                        height: 36,
                        background: "var(--surface-3)",
                        color: "var(--ink)",
                        fontSize: 12,
                        fontWeight: 600,
                        flexShrink: 0,
                        borderRadius: "var(--radius-lg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {convInitials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                          {c.lead ? `${c.lead.first_name} ${c.lead.last_name || ""}`.trim() : "Unknown"}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--ink-faint)", flexShrink: 0 }}>
                          {c.last_message_at ? timeAgo(c.last_message_at) : ""}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: c.unread_count > 0 ? "var(--ink)" : "var(--ink-mute)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontWeight: c.unread_count > 0 ? 500 : 400,
                        }}
                      >
                        {c.last_message ?? (c.hasConversation ? "No messages yet" : "Click to start messaging")}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        {channelBadge(c.channel)}
                        <span style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>{phoneFormatted}</span>
                        {!c.hasConversation && (
                          <span style={{ fontSize: 9, color: "var(--amber)", fontWeight: 500 }}>New</span>
                        )}
                      </div>
                    </div>
                    {c.unread_count > 0 && (
                      <span
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          background: "var(--indi-500)",
                          color: "white",
                          fontSize: 10,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat main */}
        <div className={`conversations-chat ${activeId ? "has-active" : ""}`} style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Chat header */}
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid rgba(37,43,63,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--surface)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="btn-icon p-2 conversations-back" title="Back to conversations" onClick={() => setActiveId("")}>
                <ArrowLeft size={16} />
              </button>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface-3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink)",
                }}
              >
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{fullName}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-mute)", display: "flex", alignItems: "center", gap: 6 }}>
                  {currentLead && channelBadge("sms")}
                  {formatPhone(currentLead?.phone ?? null)}
                  {isOptedOut && (
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "var(--radius-md)",
                        fontSize: 10,
                        fontWeight: 500,
                        background: "rgba(239,68,68,0.15)",
                        color: "var(--rose)",
                      }}
                    >
                      Opted out
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Sendillo number picker — only shown when multiple numbers are active */}
              {currentLead && sendilloNumbers.length > 1 && (
                <select
                  value={sendilloFrom}
                  onChange={(e) => setSendilloFrom(e.target.value)}
                  style={{
                    background: "var(--surface-3)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--ink)",
                    fontSize: 11,
                    padding: "4px 8px",
                    cursor: "pointer",
                    maxWidth: 140,
                  }}
                  title="Send from this Sendillo number"
                >
                  {sendilloNumbers.map((n) => (
                    <option key={n.id} value={n.phone_number}>
                      {n.phone_number}{n.label ? ` — ${n.label}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {currentLead && (
                <Link className="btn-icon p-2" title="Start call" href={callsHref}>
                  <Phone size={14} style={{ color: "var(--ink-mute)" }} />
                </Link>
              )}
              {currentLead && currentLead.email && (
                <button
                  className="btn-icon p-2"
                  title="Send email"
                  onClick={() => setShowEmailComposer(true)}
                >
                  <Mail size={14} style={{ color: "var(--ink-mute)" }} />
                </button>
              )}
            </div>
          </div>

          {!currentLead ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-mute)", fontSize: 13 }}>
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              {/* Messages */}
              <div
                ref={messagesRef}
                style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}
              >
                {loadingMsgs ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--ink-mute)", padding: 40 }}>
                    <Loader2 size={14} className="animate-spin" />
                    <span style={{ fontSize: 12 }}>Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ color: "var(--ink-mute)", fontSize: 13, textAlign: "center", padding: 40 }}>
                    <MessageSquare size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                    No messages yet. Send one to start the conversation.
                  </div>
                ) : (
                  uniqueMessages.map((m) => (
                    <div key={m.id} className={`conv-message ${m.direction === "outbound" ? "out" : "in"}`}>
                      <div className={`conv-bubble ${m.direction === "outbound" ? "out" : "in"}`}>{m.body}</div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: "var(--ink-faint)",
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {/* Provider pill — distinguishes Sendillo vs Twilio */}
                        {m.provider === "sendillo" && (
                          <span
                            style={{
                              padding: "1px 5px",
                              borderRadius: 4,
                              fontSize: 9,
                              fontWeight: 500,
                              background: "rgba(16,185,129,0.12)",
                              color: "var(--mint, #34d399)",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Sendillo
                          </span>
                        )}
                        {m.provider === "twilio" && (
                          <span
                            style={{
                              padding: "1px 5px",
                              borderRadius: 4,
                              fontSize: 9,
                              fontWeight: 500,
                              background: "rgba(249,115,22,0.12)",
                              color: "#fb923c",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            Twilio
                          </span>
                        )}
                        <span>{timeAgo(m.sent_at)}</span>
                        {m.direction === "outbound" && (
                          <>
                            {m.external_status === "delivered" ? (
                              <span title="Delivered" style={{ display: "inline-flex" }}>
                                <CheckCheck size={11} style={{ color: "var(--mint)" }} />
                              </span>
                            ) : m.external_status === "sent" ? (
                              <span title="Sent" style={{ display: "inline-flex" }}>
                                <CheckCheck size={11} style={{ color: "var(--ink-mute)" }} />
                              </span>
                            ) : m.external_status === "failed" ? (
                              <span style={{ color: "var(--rose)", fontSize: 10, fontWeight: 500 }} title="Failed to send">Failed</span>
                            ) : (
                              <span title="Pending" style={{ display: "inline-flex" }}>
                                <Check size={11} style={{ color: "var(--ink-mute)" }} />
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Composer */}
              <div
                style={{
                  padding: "12px 20px",
                  borderTop: "1px solid rgba(37,43,63,0.7)",
                  background: "var(--surface)",
                }}
              >
                {isOptedOut ? (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-xl)",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "var(--rose)",
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    This lead has opted out of messaging.
                  </div>
                ) : noSendilloNumbers ? (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-xl)",
                      background: "rgba(249,115,22,0.08)",
                      border: "1px solid rgba(249,115,22,0.2)",
                      color: "#fb923c",
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    No Sendillo number registered for this workspace. Ask your admin to register one in the Sendillo admin page.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "var(--surface-4)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-xl)",
                      padding: "10px 14px",
                    }}
                  >
                    <Paperclip size={15} style={{ color: "var(--ink-mute)", cursor: "pointer" }} />
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !sendDisabled && sendMessage()}
                      placeholder="Type a message..."
                      disabled={!currentLead}
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        fontSize: 13,
                        color: "var(--ink)",
                      }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sendDisabled}
                      className="btn-primary"
                      style={{ borderRadius: "var(--radius-lg)", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                    >
                      {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right rail — lead info */}
        <div
          className="conversations-rail"
          style={{
            width: 280,
            flexShrink: 0,
            borderLeft: "1px solid rgba(37,43,63,0.7)",
            padding: "20px 16px",
            overflowY: "auto",
            background: "rgba(19,24,38,0.95)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {currentLead && (
            <>
              {/* Lead summary */}
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 10 }}>
                  Lead Info
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{fullName}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)", fontFamily: "var(--font-mono)" }}>{formatPhone(currentLead.phone)}</div>
                  {currentLead.email && <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{currentLead.email}</div>}
                </div>
              </div>

              {/* Stage */}
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 10 }}>
                  Stage
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(139,92,246,0.15)",
                    color: "var(--viol-400)",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  {currentLead.pipeline_stage ?? "—"}
                </span>
              </div>

              {/* Score */}
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 10 }}>
                  Score
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color:
                      currentLead.score >= 80
                        ? "var(--mint)"
                        : currentLead.score >= 50
                        ? "var(--amber)"
                        : "var(--rose)",
                  }}
                >
                  {currentLead.score ?? 0}
                </div>
              </div>

              {/* Source */}
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)", marginBottom: 10 }}>
                  Source
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{currentLead.source ?? "—"}</div>
                <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>{currentLead.lead_type ?? "—"}</div>
              </div>

              <button className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: 13 }}>
                View Lead Profile
              </button>
            </>
          )}
        </div>
      </div>

      {/* Single-send email composer (opened from chat header) */}
      {showEmailComposer && currentLead && currentLead.email && (
        <SingleEmailComposer
          open={showEmailComposer}
          onClose={() => setShowEmailComposer(false)}
          initialLeadId={activeId}
          senderEmail={senderEmail}
          senderName={senderName}
          onSent={() => { setShowEmailComposer(false); fetchMessages(activeId); }}
        />
      )}
    </Shell>
  );
}
