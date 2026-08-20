import { AdminShell } from "@/components/admin/AdminShell";
import { IssuesManager } from "@/components/admin/IssuesManager";
import { requireAdminPage } from "@/server/auth/admin-session";

export const dynamic = "force-dynamic";

/** Magazine management (REQ-048). The session is checked before anything renders. */
export default async function AdminIssuesPage() {
  const { admin } = await requireAdminPage("/admin/issues");

  return (
    <AdminShell adminEmail={admin.email} active="issues">
      <IssuesManager />
    </AdminShell>
  );
}
