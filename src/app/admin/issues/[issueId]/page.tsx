import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { IssueForm } from "@/components/admin/IssueForm";
import { NotFoundError } from "@/lib/errors";
import { getIssueForAdmin } from "@/modules/catalog";
import { requireAdminPage } from "@/server/auth/admin-session";
import { catalogRepository } from "@/server/catalog";
import { toAdminIssueDto, type AdminIssueDto } from "@/server/presenters";

export const dynamic = "force-dynamic";

/**
 * Load the issue for the edit form, or `null` if there is no such id.
 *
 * The lookup is kept out of the component body so the `try` only wraps data
 * fetching: JSX built inside a `try` would not have its render errors caught
 * there anyway, and would swallow the wrong failures.
 */
async function loadIssue(issueId: string): Promise<AdminIssueDto | null> {
  const repository = catalogRepository();

  try {
    const issue = await getIssueForAdmin(repository, issueId);
    const previewAsset = issue.previewPdfAssetId
      ? await repository.findAssetById(issue.previewPdfAssetId)
      : null;
    return toAdminIssueDto(issue, previewAsset);
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

export default async function EditIssuePage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = await params;
  const { admin } = await requireAdminPage(`/admin/issues/${issueId}`);

  const issue = await loadIssue(issueId);
  if (!issue) notFound();

  return (
    <AdminShell adminEmail={admin.email} active="issues">
      <IssueForm issue={issue} />
    </AdminShell>
  );
}
