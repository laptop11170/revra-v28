"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getInitials } from "@/lib/constants";
import { useTheme } from "@/context/theme-provider";
import {
  Hash,
  Send,
  Users,
  Plus,
  Search,
  Phone,
  MoreHorizontal,
  X,
  Loader2,
} from "lucide-react";

type ApiChannel = {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  last_message: string | null;
  last_message_at: string | null;
};
type ApiChatMessage = {
  id: string;
  channel_id: string;
  author_name: string;
  content: string;
  created_at: string;
};
type ApiTeamMember = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  last_active_at: string;
  leads_count: number;
};

// New channel modal
function NewChannelModal({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave?: (data: { name: string; description: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave?.({ name: name.trim().replace(/\s+/g, "-").toLowerCase(), description });
    setName(""); setDescription("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="md" title="Create New Channel">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Channel Name</label>
          <div className="flex items-center gap-2">
            <Hash size={18} style={{ color: "hsl(var(--muted-foreground))" }} />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. medicare-tips"
              className="flex-1"
            />
          </div>
          <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Lowercase letters, numbers, and hyphens only</p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this channel about?"
            className="w-full h-20 p-3 rounded-lg text-sm resize-none focus:outline-none"
            style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface-container-low))", color: "hsl(var(--on-surface))" }}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!name.trim()}>Create Channel</Button>
      </div>
    </Modal>
  );
}

const statusColors: Record<string, string> = {
  active: "bg-[hsl(var(--success))]",
  idle: "bg-[hsl(var(--warning))]",
  offline: "bg-[hsl(var(--muted-foreground))]",
};

export default function TeamPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [channels, setChannels] = useState<ApiChannel[]>([]);
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<ApiTeamMember[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ApiChannel | null>(null);
  const [activeTab, setActiveTab] = useState<"channels" | "dms">("channels");
  const [search, setSearch] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/channels");
      const data = await res.json();
      setChannels(data.channels || []);
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    }
  }, []);

  const fetchTeamMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      setTeamMembers(data.members || []);
    } catch (err) {
      console.error("Failed to fetch team members:", err);
    }
  }, []);

  const fetchMessages = useCallback(async (channelId: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchChannels(), fetchTeamMembers()]);
      setLoading(false);
    };
    init();
  }, [fetchChannels, fetchTeamMembers]);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
    }
  }, [selectedChannel, fetchMessages]);

  const currentMessages = messages.filter((msg) => msg.channel_id === selectedChannel?.id);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;
    try {
      const res = await fetch(`/api/channels/${selectedChannel.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (res.ok) {
        fetchMessages(selectedChannel.id);
        fetchChannels();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
    setNewMessage("");
  };

  const handleCreateChannel = async (data: { name: string; description: string }) => {
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, description: data.description }),
      });
      if (res.ok) {
        const newChannel = await res.json();
        await fetchChannels();
        setSelectedChannel(newChannel);
      }
    } catch (err) {
      console.error("Failed to create channel:", err);
    }
  };

  return (
    <Shell role="user">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Team</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              {channels.length} channels · {teamMembers.length} members
            </p>
          </div>
          <Button onClick={() => setShowNewChannel(true)}>
            <Plus size={16} className="mr-2" />New Channel
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <Card className="lg:col-span-1">
            <CardContent className="p-4">
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {(["channels", "dms"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize"
                    style={
                      activeTab === tab
                        ? { backgroundColor: "hsl(var(--primary)_/_0.12)", color: "hsl(var(--primary))" }
                        : { color: "hsl(var(--muted-foreground))" }
                    }
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Channels */}
              {activeTab === "channels" && (
                <div className="space-y-1">
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={16} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
                    </div>
                  ) : channels.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: "hsl(var(--muted-foreground))" }}>No channels yet</p>
                  ) : (
                    channels.map((channel) => (
                      <div
                        key={channel.id}
                        onClick={() => setSelectedChannel(channel)}
                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
                        style={
                          selectedChannel?.id === channel.id
                            ? { backgroundColor: "hsl(var(--primary)_/_0.08)" }
                            : { backgroundColor: "hsl(var(--surface-container-low))" }
                        }
                        onMouseEnter={(e) => { if (selectedChannel?.id !== channel.id) e.currentTarget.style.backgroundColor = "hsl(var(--surface-container))"; }}
                        onMouseLeave={(e) => { if (selectedChannel?.id !== channel.id) e.currentTarget.style.backgroundColor = "hsl(var(--surface-container-low))"; }}
                      >
                        <Hash size={16} className="flex-shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
                        <span className="text-sm font-medium flex-1 truncate" style={{ color: "hsl(var(--on-surface))" }}>{channel.name}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* DMs */}
              {activeTab === "dms" && (
                <div className="space-y-1">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer"
                      style={{ backgroundColor: "hsl(var(--surface-container-low))" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--surface-container))")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--surface-container-low))")}
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                          {getInitials(member.full_name)}
                        </div>
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                          style={{ borderColor: "hsl(var(--surface))", backgroundColor: statusColors[member.status] }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: "hsl(var(--on-surface))" }}>{member.full_name}</p>
                        <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Team Members section */}
              <div className="mt-6 pt-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>Team Members</p>
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-[10px]">
                          {getInitials(member.full_name)}
                        </div>
                        <div
                          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
                          style={{ backgroundColor: statusColors[member.status] }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--on-surface))" }}>{member.full_name}</p>
                      </div>
                      <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{member.last_active_at}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-3">
            <CardContent className="p-4 flex flex-col" style={{ height: "560px" }}>
              {/* Channel Header */}
              <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                <div className="flex items-center gap-2">
                  <Hash size={18} style={{ color: "hsl(var(--muted-foreground))" }} />
                  <span className="font-semibold" style={{ color: "hsl(var(--on-surface))" }}>{selectedChannel?.name ?? ""}</span>
                  <Badge>{selectedChannel?.member_count ?? 0} members</Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Users size={16} className="mr-1" />Members
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal size={16} />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
                  </div>
                ) : currentMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full" style={{ color: "hsl(var(--muted-foreground))" }}>
                    <Hash size={32} className="mb-2" />
                    <p className="text-sm">No messages in #{selectedChannel?.name} yet</p>
                    <p className="text-xs mt-1">Be the first to send a message</p>
                  </div>
                ) : (
                  currentMessages.map((msg) => (
                    <div key={msg.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mt-1">
                        {getInitials(msg.author_name)}
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold text-sm" style={{ color: "hsl(var(--on-surface))" }}>{msg.author_name}</span>
                          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{msg.created_at}</span>
                        </div>
                        <p className="text-sm mt-0.5" style={{ color: "hsl(var(--on-surface-variant))" }}>{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="pt-4 flex gap-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                <Input
                  placeholder={`Message #${selectedChannel?.name ?? ""}`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Channel Modal */}
      <NewChannelModal
        open={showNewChannel}
        onClose={() => setShowNewChannel(false)}
        onSave={handleCreateChannel}
      />
    </Shell>
  );
}