import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminCard, AdminHeading, StatusBadge } from "@/components/admin/ui";
import { formatPersianDate } from "@/lib/dates";
import { formatToman } from "@/lib/money";
import { getCurrentIssue, listIssuesForAdmin, parseAdminIssueQuery } from "@/modules/catalog";
import { requireAdminPage } from "@/server/auth/admin-session";
import { catalogRepository } from "@/server/catalog";

export const dynamic = "force-dynamic";

/** Admin home (REQ-048): what is live right now, and what still needs work. */
export default async function AdminDashboardPage() {
  const { admin } = await requireAdminPage("/admin");

  const repository = catalogRepository();
  const [current, recent] = await Promise.all([
    getCurrentIssue(repository),
    listIssuesForAdmin(repository, parseAdminIssueQuery({ limit: 5 })),
  ]);

  const drafts = recent.items.filter((issue) => issue.status === "DRAFT").length;

  return (
    <AdminShell adminEmail={admin.email} active="dashboard">
      <div className="grid gap-4 md:grid-cols-2">
        <AdminCard>
          <AdminHeading>شماره جاری</AdminHeading>
          {current ? (
            <div className="space-y-2 text-sm">
              <p className="text-base font-semibold">{current.title}</p>
              <p className="text-zinc-600">شماره {current.issueNumber}</p>
              <p className="text-zinc-600">{formatToman(current.priceIrr)}</p>
              <p className="text-zinc-600">
                موجودی: {current.stock > 0 ? current.stock : "ناموجود"}
              </p>
              <StatusBadge status={current.status} isCurrent={current.isCurrent} />
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              هنوز شماره‌ای به‌عنوان شماره جاری تعیین نشده است. تا زمانی که شماره منتشرشده‌ای وجود
              نداشته باشد، صفحه اصلی مینی‌اپ خالی می‌ماند.
            </p>
          )}
        </AdminCard>

        <AdminCard>
          <AdminHeading>وضعیت کوتاه</AdminHeading>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-600">پیش‌نویس در ۵ مورد اخیر</dt>
              <dd className="font-semibold">{drafts}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600">شماره جاری تعیین شده</dt>
              <dd className="font-semibold">{current ? "بله" : "خیر"}</dd>
            </div>
          </dl>
          <Link
            href="/admin/issues"
            className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            مدیریت شماره‌ها
          </Link>
        </AdminCard>
      </div>

      <AdminCard className="mt-4">
        <AdminHeading>آخرین شماره‌ها</AdminHeading>
        {recent.items.length === 0 ? (
          <p className="text-sm text-zinc-500">هنوز شماره‌ای ثبت نشده است.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {recent.items.map((issue) => (
              <li key={issue.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <Link
                    href={`/admin/issues/${issue.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    شماره {issue.issueNumber} — {issue.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatPersianDate(issue.publicationDate)}
                  </p>
                </div>
                <StatusBadge status={issue.status} isCurrent={issue.isCurrent} />
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </AdminShell>
  );
}
