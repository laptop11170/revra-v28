"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AddUserModal } from "@/components/features/modals/AddUserModal";
import { UserDetailPanel } from "@/components/features/modals/UserDetailPanel";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import { Search, Plus, Users, Shield, UserCheck } from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  workspace_name: string;
  role: string;
  status: string;
  created_at: string;
}

interface UsersResponse {
  users: User[];
  total: number;
}

const roleConfig: Record<string, { bgVar: string; colorVar: string }> = {
  "Super Admin": { bgVar: "primary", colorVar: "primary" },
  Admin: { bgVar: "info", colorVar: "info" },
  Agent: { bgVar: "success", colorVar: "success" },
  Viewer: { bgVar: "surface-container-high", colorVar: "on-surface-variant" },
};

const statConfig: Record<string, { bgVar: string; colorVar: string }> = {
  total: { bgVar: "info", colorVar: "info" },
  active: { bgVar: "success", colorVar: "success" },
  admin: { bgVar: "primary", colorVar: "primary" },
  inactive: { bgVar: "surface-container-high", colorVar: "on-surface-variant" },
};

const PAGE_SIZE = 50;

const toDetailUser = (u: User) => ({
  id: u.id,
  name: u.full_name,
  email: u.email,
  role: u.role,
  workspace: u.workspace_name,
  leads: 0,
  status: u.status,
  lastActive: new Date(u.created_at).toLocaleDateString(),
});

export default function UsersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [workspaceFilter, setWorkspaceFilter] = useState("All Workspaces");
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const { addToast } = useToast();

  const fetchUsers = useCallback(async (pageOffset: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/superadmin/users?limit=${PAGE_SIZE}&offset=${pageOffset}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const json: UsersResponse = await res.json();
      setUsers(json.users);
      setTotal(json.total);
    } catch (err) {
      addToast({ type: "error", title: "Error", description: "Failed to load users" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(offset);
  }, [offset, fetchUsers]);

  const workspaces = ["All Workspaces", ...Array.from(new Set(users.map((u) => u.workspace_name).filter(Boolean)))];

  const filtered = users.filter((u) => {
    if (search && !u.full_name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search)) return false;
    if (roleFilter !== "All Roles" && u.role !== roleFilter) return false;
    if (workspaceFilter !== "All Workspaces" && u.workspace_name !== workspaceFilter) return false;
    return true;
  });

  const handleAddUser = (data: any) => {
    const newUser = {
      id: `u${Date.now()}`,
      full_name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      role: data.role,
      workspace_name: workspaces.find((w) => w === data.workspaceId) || "San Diego Health Agents",
      status: "active",
      created_at: new Date().toISOString(),
    };
    setUsers((p) => [...p, newUser]);
    addToast({ type: "success", title: "User Added", description: `${data.firstName} ${data.lastName} added to platform` });
  };

  const handlePrev = () => setOffset((o) => Math.max(0, o - PAGE_SIZE));
  const handleNext = () => setOffset((o) => o + PAGE_SIZE);

  return (
    <Shell role="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>All Users</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{total} users on the platform</p>
          </div>
          <Button onClick={() => setShowAddUser(true)}>
            <Plus size={16} className="mr-2" />Add User
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--info)_/_0.15)" }}><Users size={20} style={{ color: "hsl(var(--info))" }} /></div>
            <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{total}</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Total Users</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--success)_/_0.15)" }}><UserCheck size={20} style={{ color: "hsl(var(--success))" }} /></div>
            <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{users.filter((u) => u.status === "active").length}</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Active</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--primary)_/_0.15)" }}><Shield size={20} style={{ color: "hsl(var(--primary))" }} /></div>
            <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{users.filter((u) => u.role === "Admin" || u.role === "Super Admin").length}</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Admins</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--surface-container-high))" }}><Users size={20} style={{ color: "hsl(var(--on-surface-variant))" }} /></div>
            <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{users.filter((u) => u.status !== "active").length}</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Inactive</p></div>
          </CardContent></Card>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface-container-low))", color: "hsl(var(--on-surface))", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none" }}
          >
            <option>All Roles</option>
            <option>Super Admin</option>
            <option>Admin</option>
            <option>Agent</option>
            <option>Viewer</option>
          </select>
          <select
            value={workspaceFilter}
            onChange={(e) => setWorkspaceFilter(e.target.value)}
            style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface-container-low))", color: "hsl(var(--on-surface))", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none" }}
          >
            {workspaces.map((w) => <option key={w}>{w}</option>)}
          </select>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 flex items-center justify-center">
              <div style={{ textAlign: "center" }}>
                <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", margin: "0 auto 16px" }} />
                <p style={{ color: "hsl(var(--muted-foreground))" }}>Loading users...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12" style={{ color: "hsl(var(--muted-foreground))" }}>No users found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => (
                    <TableRow key={user.id}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--primary)_/_0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      onClick={() => setSelectedUser(user)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: "linear-gradient(135deg, hsl(var(--info)), hsl(var(--primary))" }}>
                            {user.full_name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{user.full_name}</p>
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: `hsl(var(--${roleConfig[user.role]?.bgVar || "surface-container-high"})_/_0.15)`, color: `hsl(var(--${roleConfig[user.role]?.colorVar || "on-surface-variant"}))` }}>{user.role}</span>
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "hsl(var(--on-surface-variant))" }}>{user.workspace_name}</TableCell>
                      <TableCell>
                        <Badge variant={
                          user.status === "active" ? "success" :
                          user.status === "inactive" ? "default" : "danger"
                        }>{user.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrev} disabled={offset === 0}>Previous</Button>
                <Button variant="outline" size="sm" onClick={handleNext} disabled={offset + PAGE_SIZE >= total}>Next</Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      <AddUserModal open={showAddUser} onClose={() => setShowAddUser(false)} onSave={handleAddUser} />
      <UserDetailPanel open={!!selectedUser} onClose={() => setSelectedUser(null)} user={selectedUser ? toDetailUser(selectedUser) : null} />
    </Shell>
  );
}
