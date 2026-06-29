"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { MetroPane, Discussion, MemberDetail } from "@/components/ui/metro-pane";
import { InviteMemberModal } from "@/components/features/communications/InviteMemberModal";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import { Plus, Search, MoreHorizontal, Mail, RefreshCw } from "lucide-react";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  leads_count: number;
  created_at: string;
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
      <RefreshCw size={24} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
    </div>
  );
}

const roleConfig: Record<string, { bgVar: string; colorVar: string }> = {
  Admin: { bgVar: "primary", colorVar: "primary" },
  Agent: { bgVar: "success", colorVar: "success" },
  Viewer: { bgVar: "surface-container-high", colorVar: "on-surface-variant" },
};

export default function AdminTeamPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [showInvite, setShowInvite] = useState(false);
  const { addToast } = useToast();

  // Metro pane state
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [paneTab, setPaneTab] = useState("details");
  const [messages, setMessages] = useState<Record<string, Array<{ id: string; sender: "agent" | "teammate"; senderName: string; avatarInitials: string; avatarColor: string; content: string; timestamp: string }>>>({});

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/team");
      if (!res.ok) throw new Error("Failed to load team data");
      const json = await res.json();
      setMembers(json.members || []);
    } catch (err) {
      addToast({ type: "error", title: "Error", description: "Failed to load team data" });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleOpenMember = (member: TeamMember) => {
    setSelectedMember(member);
    setPaneTab("details");
  };

  const handleClosePane = () => {
    setSelectedMember(null);
  };

  const handleSendMessage = (memberId: string, content: string) => {
    const newMessage = {
      id: `m${Date.now()}`,
      sender: "agent" as const,
      senderName: "You",
      avatarInitials: "YO",
      avatarColor: "bg-purple-100 text-purple-700",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };
    setMessages((prev) => ({
      ...prev,
      [memberId]: [...(prev[memberId] || []), newMessage],
    }));
  };

  const filtered = members.filter((m) => {
    if (search && !m.full_name.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search)) return false;
    if (roleFilter !== "All Roles" && m.role !== roleFilter) return false;
    if (statusFilter !== "All Status" && m.status !== statusFilter.toLowerCase()) return false;
    return true;
  });

  const handleInvite = async (data: { email: string; firstName: string; lastName: string; role: string }) => {
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          role: data.role,
        }),
      });
      if (!res.ok) throw new Error("Failed to invite member");
      const newMember = await res.json();
      setMembers((p) => [...p, newMember]);
      addToast({ type: "success", title: "Invitation Sent", description: `Invite sent to ${data.email}` });
    } catch (err) {
      addToast({ type: "error", title: "Error", description: "Failed to send invitation" });
    }
  };

  // Helper to convert API member to metro pane member format
  const toMetroMember = (m: TeamMember) => ({
    id: m.id,
    name: m.full_name,
    email: m.email,
    role: m.role as "Admin" | "Agent" | "Viewer",
    status: (m.status === "active" || m.status === "idle" || m.status === "inactive") ? m.status as "active" | "idle" | "inactive" : "active",
    lastActive: "Recently",
    leads: m.leads_count,
  });

  return (
    <Shell role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Team</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{members.length} members</p>
          </div>
          <Button onClick={() => setShowInvite(true)}>
            <Plus size={16} className="mr-2" />Invite Member
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
            <Input placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option>All Roles</option>
            <option>Admin</option>
            <option>Agent</option>
            <option>Viewer</option>
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </Select>
        </div>

        <Card>
          {loading ? (
            <LoadingSpinner />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12" style={{ color: "hsl(var(--muted-foreground))" }}>No members found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((member) => (
                    <TableRow key={member.id}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--primary)_/_0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      onClick={() => handleOpenMember(member)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: "linear-gradient(135deg, hsl(var(--info)), hsl(var(--primary))" }}>
                            {member.full_name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{member.full_name}</p>
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{member.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: `hsl(var(--${roleConfig[member.role]?.bgVar || "surface-container-high"})_/_0.15)`, color: `hsl(var(--${roleConfig[member.role]?.colorVar || "on-surface-variant"}))` }}>{member.role}</span>
                      </TableCell>
                      <TableCell>{member.leads_count}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === "active" ? "success" : "default"}>{member.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {new Date(member.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" title="Send email"><Mail size={14} /></Button>
                          <Button variant="ghost" size="sm" title="More"><MoreHorizontal size={14} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <InviteMemberModal open={showInvite} onClose={() => setShowInvite(false)} onInvite={handleInvite} />

      {/* Metro Pane */}
      {selectedMember && (
        <MetroPane
          open={true}
          onClose={handleClosePane}
          title={selectedMember.full_name}
          subtitle={selectedMember.email}
          avatar={
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "linear-gradient(135deg, hsl(var(--info)), hsl(var(--primary))" }}>
              {selectedMember.full_name.split(" ").map((n) => n[0]).join("")}
            </div>
          }
          tabs={[
            { id: "details", label: "Details" },
            { id: "discussion", label: "Discussion" },
          ]}
          activeTab={paneTab}
          onTabChange={setPaneTab}
        >
          {paneTab === "details" ? (
            <MemberDetail member={toMetroMember(selectedMember)} />
          ) : (
            <Discussion
              messages={messages[selectedMember.id] || []}
              onSendMessage={(content) => handleSendMessage(selectedMember.id, content)}
            />
          )}
        </MetroPane>
      )}
    </Shell>
  );
}