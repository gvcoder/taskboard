import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getAdminStats, getAdminUsers } from "@/actions/admin";
import { AdminClient } from "@/components/AdminClient";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/boards");
  }

  const [statsRes, usersRes] = await Promise.all([getAdminStats(), getAdminUsers()]);

  if (!statsRes.success || !usersRes.success) {
    const errorMessage =
      (!statsRes.success ? statsRes.error : null) ||
      (!usersRes.success ? usersRes.error : null) ||
      "Failed to load admin console.";

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-lg shadow-md border text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Admin Error</h1>
          <p className="text-sm text-gray-600 mb-4">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <AdminClient
      stats={statsRes.data}
      initialUsers={usersRes.data}
      currentUserId={session.user.id}
    />
  );
}
