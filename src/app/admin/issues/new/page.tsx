import { AdminShell } from "@/components/admin/AdminShell";
import { IssueForm } from "@/components/admin/IssueForm";
import { requireAdminPage } from "@/server/auth/admin-session";

export const dynamic = "force-dynamic";

export default async function NewIssuePage() {
  const { admin } = await requireAdminPage("/admin/issues/new");

  return (
    <AdminShell adminEmail={admin.email} active="issues">
      <IssueForm issue={null} />
    </AdminShell>
  );
}
