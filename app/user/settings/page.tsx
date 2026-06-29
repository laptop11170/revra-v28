"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Shell } from "@/components/layouts/Shell";
import { User, Bell, Lock, Globe } from "lucide-react";

export default function SettingsPage() {
 const { user } = useUser();
 const [activeSection, setActiveSection] = useState("profile");
 const [appRole, setAppRole] = useState("agent");

 useEffect(() => {
 let mounted = true;

 fetch("/api/workspaces/my")
 .then((res) => res.json())
 .then((data) => {
 const role = data.workspaces?.[0]?.role;
 if (mounted && role) setAppRole(role);
 })
 .catch(() => {});

 return () => {
 mounted = false;
 };
 }, []);

 const roleLabel = appRole === "superadmin" ? "Super Admin" : appRole === "admin" ? "Workspace Admin" : "Agent";
 const fullName = user?.fullName || "";
 const [firstName = "", ...lastNameParts] = fullName.split(" ");
 const lastName = lastNameParts.join(" ");
 const primaryEmail = user?.primaryEmailAddress?.emailAddress || "";
 const initials = `${user?.firstName?.[0] || firstName[0] || "U"}${user?.lastName?.[0] || lastName[0] || ""}`.toUpperCase();

 const sections = [
 { id: "profile", label: "Profile", icon: User },
 { id: "notifications", label: "Notifications", icon: Bell },
 { id: "security", label: "Security", icon: Lock },
 { id: "calendar", label: "Calendar", icon: Globe },
 ];

  return (
 <Shell role="user">
 <div style={{ padding: "32px 40px" }}>
 {/* Header */}
 <div style={{ marginBottom: 32 }}>
 <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}>
 Settings
 </h1>
 <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
 Manage your profile and preferences.
 </p>
 </div>

 <div style={{ display: "flex", gap: 0 }}>
 {/* Left nav */}
 <div
 style={{
 width: 200,
 flexShrink: 0,
 borderRight: "1px solid rgba(37,43,63,0.7)",
 paddingRight: 20,
 marginRight: 32,
 }}
 >
 {sections.map((s) => {
 const Icon = s.icon;
 return (
 <button
 key={s.id}
 onClick={() => setActiveSection(s.id)}
 style={{
 display: "flex",
 alignItems: "center",
 gap: 10,
 width: "100%",
 padding: "9px 12px",
 borderRadius: "var(--radius-lg)",
 marginBottom: 2,
 border: "none",
 background: activeSection === s.id ? "var(--surface-2)" : "transparent",
 color: activeSection === s.id ? "var(--ink)" : "var(--ink-mute)",
 fontSize: 13,
 fontWeight: activeSection === s.id ? 500 : 400,
 cursor: "pointer",
 boxShadow: activeSection === s.id ? "inset 0 0 0 1px var(--line)" : "none",
 textAlign: "left",
 transition: "all 0.12s",
 }}
 >
 <Icon size={15} />
 {s.label}
 </button>
 );
 })}
 </div>

 {/* Content */}
 <div style={{ flex: 1, maxWidth: 560 }}>
 {activeSection === "profile" && (
 <div>
 <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 20 }}>Profile</h3>

 {/* Avatar (display only — Clerk handles editing via the user button) */}
 <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
 <div
 style={{
 width: 56,
 height: 56,
 borderRadius: 999,
 background: "linear-gradient(135deg, var(--indi-500), var(--viol-500))",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 color: "white",
 fontWeight: 700,
 fontSize: 18,
 }}
 >
 {initials}
 </div>
 </div>

 <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
 <div>
 <label className="input-label">First Name</label>
 <input className="input" value={user?.firstName || firstName} readOnly />
 </div>
 <div>
 <label className="input-label">Last Name</label>
 <input className="input" value={user?.lastName || lastName} readOnly />
 </div>
 </div>
 <div>
 <label className="input-label">Email</label>
 <input className="input" type="email" value={primaryEmail} readOnly />
 </div>
 <div>
 <label className="input-label">Role</label>
 <input className="input" value={roleLabel} readOnly />
 </div>
 <div>
 <label className="input-label">Phone</label>
 <input className="input" defaultValue="(555) 000-0000" />
 </div>
 <div>
 <label className="input-label">Timezone</label>
 <select className="input" style={{ appearance: "none", cursor: "pointer" }}>
 <option>America/Los_Angeles (PT)</option>
 <option>America/New_York (ET)</option>
 <option>America/Chicago (CT)</option>
 <option>America/Denver (MT)</option>
 </select>
 </div>
 </div>

 <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
 <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>Cancel</button>
 <button className="btn-primary" style={{ padding: "8px 20px", fontSize: 13 }}>Save Changes</button>
 </div>
 </div>
 )}

 {activeSection === "notifications" && (
 <div>
 <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 20 }}>Notifications</h3>
 <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
 {[
 { label: "Email Notifications", desc: "Receive email for new lead assignments", checked: true },
 { label: "SMS Notifications", desc: "Receive SMS for urgent follow-ups", checked: true },
 { label: "Calendar Reminders", desc: "Get reminded before scheduled meetings", checked: false },
 { label: "Team Messages", desc: "Notifications for team chat messages", checked: false },
 ].map((item, i) => (
 <div
 key={item.label}
 style={{
 display: "flex",
 alignItems: "center",
 justifyContent: "space-between",
  padding: "14px 0",
 borderBottom: i < 3 ? "1px solid var(--line-3)" : "none",
 }}
 >
 <div>
 <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{item.label}</div>
 <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>{item.desc}</div>
 </div>
 <label style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
 <input
 type="checkbox"
 defaultChecked={item.checked}
 style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
 />
 <div
 style={{
 width: 36,
 height: 20,
 borderRadius: 999,
 background: item.checked ? "var(--indi-500)" : "var(--line)",
 position: "relative",
 transition: "background 0.2s",
 }}
 >
 <div
 style={{
 width: 14,
 height: 14,
 borderRadius: 999,
 background: "white",
 position: "absolute",
 top: 3,
 left: item.checked ? 19 : 3,
 transition: "left 0.2s",
 boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
 }}
 />
 </div>
 </label>
 </div>
 ))}
 </div>
 </div>
 )}

 {activeSection === "security" && (
 <div>
 <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 20 }}>Security</h3>
 <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
 <div className="card" style={{ padding: 16 }}>
 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
 <div>
 <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Password</div>
 <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>Last changed 30 days ago</div>
 </div>
 <button className="btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }}>Change</button>
 </div>
 </div>
 <div className="card" style={{ padding: 16 }}>
 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
 <div>
 <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Two-Factor Auth</div>
 <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>Add an extra layer of security</div>
 </div>
 <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>Enable</button>
 </div>
 </div>
 </div>
 </div>
 )}

 {activeSection === "calendar" && (
 <div>
 <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 20 }}>Calendar</h3>
 <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
 <div>
 <label className="input-label">Default Calendar</label>
 <select className="input" style={{ appearance: "none", cursor: "pointer" }}>
 <option>Google Calendar</option>
 <option>Outlook</option>
 <option>Apple Calendar</option>
 </select>
 </div>
 <div>
 <label className="input-label">Default Meeting Duration</label>
 <select className="input" style={{ appearance: "none", cursor: "pointer" }}>
 <option>30 minutes</option>
 <option>45 minutes</option>
 <option>60 minutes</option>
 </select>
 </div>
 <div>
 <label className="input-label">Buffer Time Between Meetings</label>
 <select className="input" style={{ appearance: "none", cursor: "pointer" }}>
 <option>No buffer</option>
 <option>5 minutes</option>
 <option>10 minutes</option>
 <option>15 minutes</option>
 </select>
 </div>
 </div>
 <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
 <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>Cancel</button>
 <button className="btn-primary" style={{ padding: "8px 20px", fontSize: 13 }}>Save Changes</button>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </Shell>
 );
}
