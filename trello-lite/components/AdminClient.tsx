"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Users,
  LayoutDashboard,
  FileText,
  CheckSquare,
  Shield,
  ShieldAlert,
  LogOut,
  Trash2,
  Search,
  ArrowLeft,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "./ui/toast";
import {
  updateUserRole,
  deleteUserByAdmin,
  type AdminStats,
  type AdminUserItem,
} from "@/actions/admin";

interface AdminClientProps {
  stats: AdminStats;
  initialUsers: AdminUserItem[];
  currentUserId: string;
}

export function AdminClient({ stats, initialUsers, currentUserId }: AdminClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUserItem[]>(initialUsers);
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleToggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    const res = await updateUserRole({ userId, role: newRole });
    if (!res.success) {
      toast(res.error, "destructive");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    toast(`User role updated to ${newRole}`);
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`Are you sure you want to delete user ${email}? This will delete all their boards and tasks!`)) {
      return;
    }
    const res = await deleteUserByAdmin(userId);
    if (!res.success) {
      toast(res.error, "destructive");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    toast(`User ${email} deleted successfully`);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Navbar */}
      <header className="bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-1.5 rounded-lg">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Admin Console</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-gray-800 border-gray-300 hover:bg-gray-100 bg-white"
            onClick={() => router.push("/boards")}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Boards
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white hover:bg-slate-800"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="bg-indigo-100 text-indigo-600 p-3 rounded-xl">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Total Boards</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBoards}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Total Cards</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCards}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="bg-purple-100 text-purple-600 p-3 rounded-xl">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Subtasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSubtasks}</p>
            </div>
          </div>
        </div>

        {/* User Management Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">User Directory</h2>
              <p className="text-sm text-gray-500">Manage user permissions and monitor board creation</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search user email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">User Account</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Boards Owned</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === currentUserId;
                    const isAdmin = u.role === "ADMIN";

                    return (
                      <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-medium text-gray-900">{u.email}</div>
                          {u.name && <div className="text-xs text-gray-500">{u.name}</div>}
                        </td>

                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isAdmin
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}
                          >
                            {isAdmin ? <Shield className="h-3 w-3" /> : null}
                            {u.role}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {u.boardCount} {u.boardCount === 1 ? "board" : "boards"}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-gray-500 text-xs">
                          {new Date(u.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleRole(u.id, u.role)}
                              disabled={isSelf && isAdmin}
                              title={isSelf ? "Cannot change your own role" : "Toggle Role"}
                            >
                              {isAdmin ? "Demote to User" : "Make Admin"}
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              disabled={isSelf}
                              title={isSelf ? "Cannot delete yourself" : "Delete User"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
