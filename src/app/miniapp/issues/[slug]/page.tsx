import { IssueDetailPanel } from "@/components/miniapp/IssueDetailPanel";

export const dynamic = "force-dynamic";

/**
 * Issue detail (REQ-011).
 *
 * The slug is only passed through; the API decides whether it resolves. An
 * unpublished slug returns 404 there, so nothing here needs to guard it.
 */
export default async function IssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <IssueDetailPanel slug={slug} />;
}
