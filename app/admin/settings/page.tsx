"use client";

import { useState } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";

export default function AdminSettingsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [autoDistribute, setAutoDistribute] = useState(true);
  const [distMethod, setDistMethod] = useState("Round Robin");
  const [notifications, setNotifications] = useState({
    newLead: true,
    stageChange: true,
    callCompleted: true,
    dailySummary: true,
  });
  const [wsName, setWsName] = useState("San Diego Health Agents");
  const { addToast } = useToast();

  const handleSave = () => {
    addToast({ type: "success", title: "Settings Saved", description: "Your workspace settings have been updated" });
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <Shell role="admin">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Workspace configuration</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Workspace Name</Label>
              <Input
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Workspace ID</Label>
              <Input defaultValue="ws_sd_health_agents" disabled className="mt-1" />
            </div>
            <div>
              <Label>Timezone</Label>
              <Select className="mt-1" defaultValue="America/Los_Angeles (PT)">
                <option>America/Los_Angeles (PT)</option>
                <option>America/New_York (ET)</option>
                <option>America/Chicago (CT)</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>Auto-Distribution</p>
                <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Automatically assign new leads to agents</p>
              </div>
              <button
                onClick={() => setAutoDistribute(!autoDistribute)}
                className="w-11 h-6 rounded-full transition-colors relative"
                style={{
                  backgroundColor: autoDistribute ? "hsl(var(--primary))" : "hsl(var(--border))",
                }}
              >
                <span className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all" style={{
                  left: autoDistribute ? "1.375rem" : "0.25rem"
                }} />
              </button>
            </div>
            <div>
              <Label>Distribution Method</Label>
              <Select
                value={distMethod}
                onChange={(e) => setDistMethod(e.target.value)}
                className="mt-1"
              >
                <option>Round Robin</option>
                <option>Load Balanced</option>
                <option>Manual Only</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <p className="text-sm" style={{ color: "hsl(var(--on-surface-variant))" }}>
                  {key === "newLead" ? "New lead assigned" :
                   key === "stageChange" ? "Lead stage changed" :
                   key === "callCompleted" ? "Call completed" : "Daily summary"}
                </p>
                <button
                  onClick={() => toggleNotification(key as keyof typeof notifications)}
                  className="w-11 h-6 rounded-full transition-colors relative"
                  style={{
                    backgroundColor: value ? "hsl(var(--primary))" : "hsl(var(--border))",
                  }}
                >
                  <span className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all" style={{
                    left: value ? "1.375rem" : "0.25rem"
                  }} />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </Shell>
  );
}