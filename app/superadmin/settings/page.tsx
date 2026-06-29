"use client";

import { useState } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import { Copy, RefreshCw, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [webhookSecret, setWebhookSecret] = useState("whsec_••••••••••••••••••••••••••••••••••");
  const [showSecret, setShowSecret] = useState(false);
  const { addToast } = useToast();

  const handleSave = () => {
    addToast({ type: "success", title: "Settings Saved", description: "Platform settings have been updated" });
  };

  const handleRegenerateSecret = () => {
    setWebhookSecret(`whsec_${Math.random().toString(36).slice(2, 50)}`);
    setShowSecret(true);
    addToast({ type: "success", title: "Secret Regenerated", description: "Webhook secret has been regenerated" });
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(webhookSecret).catch(() => {});
    addToast({ type: "success", title: "Copied to Clipboard" });
  };

  return (
    <Shell role="superadmin">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Settings</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Platform configuration and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platform Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Platform Name</Label>
                <Input defaultValue="RevRa" className="mt-1" />
              </div>
              <div>
                <Label>Default Plan</Label>
                <Select className="mt-1" defaultValue="Starter">
                  <option>Starter</option>
                  <option>Growth</option>
                  <option>Scale</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Platform Logo URL</Label>
              <Input placeholder="https://..." className="mt-1" />
            </div>
            <div>
              <Label>Support Email</Label>
              <Input type="email" defaultValue="support@revra.com" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trial & Billing Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Trial Period (days)</Label>
                <Input type="number" defaultValue="14" className="mt-1" />
              </div>
              <div>
                <Label>Grace Period (days)</Label>
                <Input type="number" defaultValue="7" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Default Currency</Label>
              <Select className="mt-1" defaultValue="USD">
                <option>USD</option>
                <option>CAD</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API & Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>API Rate Limit (req/min)</Label>
              <Input type="number" defaultValue="500" className="mt-1" />
            </div>
            <div>
              <Label>Webhook Secret</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="password"
                  value={showSecret ? webhookSecret : webhookSecret}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button variant="ghost" size="sm" onClick={() => setShowSecret(!showSecret)}>
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopySecret}>
                  <Copy size={14} />
                </Button>
              </div>
              <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Used to verify webhook signatures from RevRa</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handleRegenerateSecret}>
                <RefreshCw size={14} className="mr-1" />Regenerate Secret
              </Button>
            </div>
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
