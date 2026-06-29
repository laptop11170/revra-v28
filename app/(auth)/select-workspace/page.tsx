"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shell } from "@/components/layouts/Shell";
import { useTheme } from "@/context/theme-provider";
import { useToast } from "@/components/ui/toast";
import { Building2, Plus, ArrowRight, Loader2, Sparkles } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  plan: string;
  role: string;
}

export default function SelectWorkspacePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { addToast } = useToast();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [joining, setJoining] = useState<string | null>(null);

  // Fetch user's workspaces on mount
  useEffect(() => {
    if (!isLoaded || !user) return;

    const fetchWorkspaces = async () => {
      try {
        const res = await fetch("/api/workspaces/my");
        if (res.ok) {
          const json = await res.json();
          setWorkspaces(json.workspaces || []);
        }
      } catch {
        // fallback to empty
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [user, isLoaded]);

  // If no workspaces, show create screen
  // If workspaces exist, show selection screen
  const hasWorkspaces = workspaces.length > 0;

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      addToast({ type: "error", title: "Workspace name required" });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName.trim() }),
      });

      if (res.ok) {
        const json = await res.json();
        addToast({ type: "success", title: "Workspace created", description: `${workspaceName} is ready` });
        // Redirect to dashboard - user becomes admin of their own workspace
        const role = json.workspace?.is_superadmin ? "superadmin" : "admin";
        router.push(role === "superadmin" ? "/superadmin" : "/admin");
      } else {
        const err = await res.json();
        addToast({ type: "error", title: "Failed to create workspace", description: err.error });
      }
    } catch {
      addToast({ type: "error", title: "Failed to create workspace" });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinWorkspace = async (workspaceId: string) => {
    setJoining(workspaceId);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/join`, {
        method: "POST",
      });

      if (res.ok) {
        const json = await res.json();
        addToast({ type: "success", title: "Joined workspace", description: json.workspace?.name });
        const role = json.workspace?.role || "user";
        router.push(role === "admin" ? "/admin" : "/user");
      } else {
        addToast({ type: "error", title: "Failed to join workspace" });
      }
    } catch {
      addToast({ type: "error", title: "Failed to join workspace" });
    } finally {
      setJoining(null);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: isDark ? "hsl(var(--background))" : "#09090b",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--info)))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Sparkles size={24} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "hsl(var(--on-surface))", marginBottom: 8 }}>
            {hasWorkspaces ? "Select Workspace" : "Create Your Workspace"}
          </h1>
          <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 14 }}>
            {hasWorkspaces
              ? `You have access to ${workspaces.length} workspace${workspaces.length > 1 ? "s" : ""}`
              : "Set up your workspace to start managing your insurance leads"}
          </p>
        </div>

        {/* User info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 12,
            background: "hsl(var(--surface-container-low))",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, hsl(var(--info)), hsl(var(--primary)))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p style={{ fontWeight: 500, color: "hsl(var(--on-surface))", fontSize: 14 }}>
              {user?.firstName} {user?.lastName}
            </p>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }}>{user?.emailAddresses[0]?.emailAddress}</p>
          </div>
        </div>

        {/* Has workspaces - show selection */}
        {hasWorkspaces && (
          <div className="space-y-3">
            {workspaces.map((ws) => (
              <Card
                key={ws.id}
                style={{ cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "hsl(var(--primary))")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "hsl(var(--primary)_/_0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Building2 size={18} style={{ color: "hsl(var(--primary))" }} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: "hsl(var(--on-surface))" }}>{ws.name}</p>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <Badge variant={ws.plan === "Enterprise" ? "primary" : "default"}>
                          {ws.plan}
                        </Badge>
                        <Badge variant="default">{ws.role}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleJoinWorkspace(ws.id)}
                    disabled={joining === ws.id}
                  >
                    {joining === ws.id ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create new workspace */}
        <div
          style={{
            marginTop: hasWorkspaces ? 24 : 32,
            padding: 20,
            borderRadius: 16,
            border: "1px dashed hsl(var(--border))",
          }}
        >
          {hasWorkspaces && (
            <p style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", marginBottom: 16, fontSize: 13 }}>
              Or create a new workspace
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Input
              placeholder="Workspace name (e.g., My Insurance Agency)"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
            />
            <Button onClick={handleCreateWorkspace} disabled={creating || !workspaceName.trim()}>
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", color: "hsl(var(--muted-foreground))", marginTop: 24, fontSize: 12 }}>
          Need help? Contact your workspace admin or{" "}
          <span
            style={{ color: "hsl(var(--primary))", cursor: "pointer" }}
            onClick={() => router.push("/contact")}
          >
            contact support
          </span>
        </p>
      </div>
    </div>
  );
}