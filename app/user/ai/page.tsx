"use client";

import { useState, useRef, useEffect } from "react";
import { Shell } from "@/components/layouts/Shell";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  Bot,
  Send,
  Sparkles,
  Copy,
  Loader2,
  BrainCircuit,
  MessageSquare,
  Phone,
  Calendar,
  TrendingUp,
} from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "Which leads are stalling?",
  "Show me hot leads with Medicare coverage",
  "Who hasn't been contacted in 7+ days?",
  "Summarize my pipeline performance",
  "How many new leads this week?",
];

const CAPABILITIES = [
  { icon: BrainCircuit, label: "Lead Search", desc: "Find leads by name, stage, score, or type" },
  { icon: TrendingUp, label: "Pipeline Summary", desc: "Breakdown by stage with counts & averages" },
  { icon: MessageSquare, label: "Stalled Leads", desc: "Identify inactive leads needing attention" },
  { icon: Phone, label: "Hot Leads", desc: "High-score leads actively being worked" },
  { icon: TrendingUp, label: "Campaign Stats", desc: "SMS campaign delivery & reply rates" },
  { icon: Calendar, label: "Workspace Summary", desc: "Weekly activity & team performance" },
];

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
};

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([
  {
  id: "welcome",
  role: "ai",
  content:
  "Hi! I'm RevRa AI. Ask me anything about your leads, pipeline, appointments, or team performance.",
  },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
  setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSend = async (text: string) => {
  if (!text.trim()) return;
  setError(null);

  const userMsg: Message = { id: `user-${Date.now()}`, role: "user", content: text.trim() };
  const updatedMessages = [...messages, userMsg];
  setMessages(updatedMessages);
  setInput("");
  setIsTyping(true);

  try {
  const res = await fetch("/api/ai/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
  }),
  });

  if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  throw new Error(err.error || `Failed to get response (${res.status})`);
  }

  const data = await res.json();
  setMessages((prev) => [
  ...prev,
  { id: `ai-${Date.now()}`, role: "ai", content: data.response },
  ]);
  } catch (err) {
  const msg = err instanceof Error ? err.message : "Something went wrong";
  setError(msg);
  setMessages((prev) => [
  ...prev,
  {
  id: `ai-err-${Date.now()}`,
  role: "ai",
  content: `Sorry, I couldn't process that request. ${msg}`,
  },
  ]);
  } finally {
  setIsTyping(false);
  }
  };

  const handleCopy = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {});
  addToast({ type: "success", title: "Copied to clipboard" });
  };

  return (
  <Shell role="user">
  <div className="flex flex-col h-[calc(100vh-64px)]" style={{ maxWidth: "900px", margin: "0 auto" }}>
  {/* Header */}
  <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "hsl(var(--border))" }}>
  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "hsl(var(--surface-container-high))" }}>
  <Bot size={20} style={{ color: "hsl(var(--primary))" }} />
  </div>
  <div>
  <h1 className="text-lg font-semibold" style={{ color: "hsl(var(--on-surface))" }}>RevRa AI</h1>
  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Powered by Claude</p>
  </div>
  </div>

  {/* Messages */}
  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
  {messages.map((msg) => (
  <div
  key={msg.id}
  className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
  >
  {msg.role === "ai" && (
  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "hsl(var(--surface-container-high))" }}>
  <Bot size={16} style={{ color: "hsl(var(--primary))" }} />
  </div>
  )}
  <div className={cn("flex-1 min-w-0", msg.role === "user" ? "text-right" : "text-left")}>
  <div
  className={cn(
  "inline-block text-sm text-left px-4 py-3 rounded-lg max-w-[85%] whitespace-pre-wrap leading-relaxed",
  msg.role === "ai"
  ? "rounded-bl-md"
  : "rounded-br-md"
  )}
  style={{
  backgroundColor: msg.role === "ai" ? "hsl(var(--surface-container-high))" : "hsl(var(--primary))",
  color: msg.role === "ai" ? "hsl(var(--on-surface))" : "white",
  }}
  >
  {msg.content}
  </div>
  {msg.role === "ai" && !msg.id.startsWith("ai-err-") && (
  <div className="flex items-center gap-2 mt-1">
  <button
  onClick={() => handleCopy(msg.content)}
  className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:opacity-70"
  style={{ color: "hsl(var(--muted-foreground))" }}
  >
  <Copy size={11} />
  Copy
  </button>
  </div>
  )}
  </div>
  {msg.role === "user" && (
  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "hsl(var(--primary))" }}>
  <span className="text-white text-xs font-bold">U</span>
  </div>
  )}
  </div>
  ))}

  {isTyping && (
  <div className="flex gap-3">
  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "hsl(var(--surface-container-high))" }}>
  <Bot size={16} style={{ color: "hsl(var(--primary))" }} />
  </div>
  <div className="px-4 py-3 rounded-lg rounded-bl-md" style={{ backgroundColor: "hsl(var(--surface-container-high))" }}>
  <div className="flex gap-1">
  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: "hsl(var(--primary))", animationDelay: "0ms" }} />
  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: "hsl(var(--secondary))", animationDelay: "150ms" }} />
  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: "hsl(var(--primary))", animationDelay: "300ms" }} />
  </div>
  </div>
  </div>
  )}

  {/* Suggested questions (only when no user messages yet) */}
  {messages.length === 1 && (
  <div className="pt-4 space-y-6">
  {/* Suggested questions */}
  <div>
  <p className="text-xs font-medium mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>Try asking:</p>
  <div className="flex flex-wrap gap-2">
  {SUGGESTED_QUESTIONS.map((q) => (
  <button
  key={q}
  onClick={() => handleSend(q)}
  disabled={isTyping}
  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all hover:opacity-80 disabled:opacity-50"
  style={{
  backgroundColor: "hsl(var(--surface-container-high))",
  borderColor: "hsl(var(--border))",
  color: "hsl(var(--on-surface))",
  }}
  >
  <Sparkles size={13} style={{ color: "hsl(var(--primary))" }} />
  {q}
  </button>
  ))}
  </div>
  </div>

  {/* Capabilities grid */}
  <div>
  <p className="text-xs font-medium mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>What I can do:</p>
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
  {CAPABILITIES.map(({ icon: Icon, label, desc }) => (
  <div
  key={label}
  className="flex items-start gap-3 p-3 rounded-lg border"
  style={{
  backgroundColor: "hsl(var(--surface-container-high))",
  borderColor: "hsl(var(--border))",
  }}
  >
  <div className="mt-0.5" style={{ color: "hsl(var(--primary))" }}>
  <Icon size={16} />
  </div>
  <div>
  <p className="text-sm font-medium" style={{ color: "hsl(var(--on-surface))" }}>{label}</p>
  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{desc}</p>
  </div>
  </div>
  ))}
  </div>
  </div>
  </div>
  )}

  <div ref={messagesEndRef} />
  </div>

  {/* Error banner */}
  {error && (
  <div className="mx-6 mb-2 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: "rgba(220, 38, 38, 0.1)", color: "#dc2626" }}>
  {error}
  </div>
  )}

  {/* Input bar */}
  <div className="px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface-container))" }}>
  <div className="flex items-end gap-3">
  <textarea
  ref={inputRef}
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={(e) => {
  if (e.key === "Enter" && !e.shiftKey) {
  e.preventDefault();
  handleSend(input);
  }
  }}
  placeholder="Ask about leads, pipeline, appointments..."
  className="flex-1 text-sm rounded-lg px-4 py-3 resize-none outline-none min-h-[48px] max-h-[120px]"
  style={{
  backgroundColor: "hsl(var(--surface-container-low))",
  color: "hsl(var(--on-surface))",
  border: "1px solid hsl(var(--border))",
  }}
  rows={1}
  disabled={isTyping}
  />
  <button
  onClick={() => handleSend(input)}
  disabled={!input.trim() || isTyping}
  className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
  style={{
  backgroundColor: input.trim() && !isTyping ? "hsl(var(--primary))" : "hsl(var(--surface-container-high))",
  color: input.trim() && !isTyping ? "white" : "hsl(var(--muted-foreground))",
  }}
  >
  {isTyping ? (
  <Loader2 size={16} className="animate-spin" />
  ) : (
  <Send size={16} />
  )}
  </button>
  </div>
  <p className="text-[10px] text-center mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>
  RevRa AI may produce inaccurate information. Verify important details.
  </p>
  </div>
  </div>
  </Shell>
  );
}
