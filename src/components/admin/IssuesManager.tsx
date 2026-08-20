"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { adminFetch, AdminApiError } from "@/lib/admin/api";
import type {
  AdminIssueDto,
  AdminIssueListResponse,
  AdminIssueResponse,
} from "@/lib/admin/dto";
import { formatPersianDate, seasonLabel } from "@/lib/dates";
import { formatToman } from "@/lib/money";

import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminInput,
  AdminSelect,
  StatusBadge,
} from "./ui";

/**
 * Issue list and workflow actions (REQ-048).
 *
 * Every action here is a request the server re-authorizes; the buttons only
 * decide what to *ask* for. Hiding a button is presentation, never protection.
 */
export function IssuesManager() {
  const [items, setItems] = useState<AdminIssueDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (status !== "ALL") params.set("status", status);
      if (cursor) params.set("cursor", cursor);

      const data = await adminFetch<AdminIssueListResponse>(
        `/api/admin/issues?${params.toString()}`,
      );
      return data;
    },
    [search, status],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await load();
      setItems(data.items);
      setNextCursor(data.nextCursor);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : "بارگذاری فهرست ممکن نشد.");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    // Debounced so typing in the search box does not fire a request per keystroke.
    const timer = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(timer);
  }, [refresh]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await load(nextCursor);
      setItems((current) => [...current, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : "بارگذاری ادامه ممکن نشد.");
    } finally {
      setLoadingMore(false);
    }
  }

  /** Run one workflow action, then reconcile the row it returned. */
  async function act(issueId: string, path: string, body?: unknown) {
    setBusyId(issueId);
    setError(null);
    try {
      const data = await adminFetch<AdminIssueResponse>(
        `/api/admin/issues/${issueId}${path}`,
        { method: "POST", body: body ?? {} },
      );
      // Setting a current issue clears the flag on every other row, so the
      // whole list is reloaded rather than patched in place.
      await refresh();
      return data.issue;
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : "انجام این عملیات ممکن نشد.");
      return null;
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <label htmlFor="search" className="mb-1.5 block text-sm font-medium">
              جست‌وجو
            </label>
            <AdminInput
              id="search"
              value={search}
              placeholder="عنوان یا شماره مجله"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="w-44">
            <label htmlFor="status" className="mb-1.5 block text-sm font-medium">
              وضعیت
            </label>
            <AdminSelect
              id="status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="ALL">همه</option>
              <option value="DRAFT">پیش‌نویس</option>
              <option value="PUBLISHED">منتشرشده</option>
              <option value="ARCHIVED">بایگانی</option>
            </AdminSelect>
          </div>
          <Link
            href="/admin/issues/new"
            className="inline-flex min-h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white"
          >
            شماره جدید
          </Link>
        </div>
      </AdminCard>

      {error ? <AdminAlert>{error}</AdminAlert> : null}

      <AdminCard>
        {loading ? (
          <p className="py-8 text-center text-sm text-zinc-500">در حال بارگذاری…</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">شماره‌ای یافت نشد.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {items.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                busy={busyId === issue.id}
                onPublish={(published) => act(issue.id, "/publish", { published })}
                onSetCurrent={() => act(issue.id, "/current", { isCurrent: true })}
                onArchive={() => act(issue.id, "/archive")}
                onRestore={() => act(issue.id, "/restore")}
              />
            ))}
          </ul>
        )}

        {nextCursor ? (
          <div className="mt-4 flex justify-center">
            <AdminButton variant="secondary" loading={loadingMore} onClick={loadMore}>
              نمایش بیشتر
            </AdminButton>
          </div>
        ) : null}
      </AdminCard>
    </div>
  );
}

function IssueRow({
  issue,
  busy,
  onPublish,
  onSetCurrent,
  onArchive,
  onRestore,
}: {
  issue: AdminIssueDto;
  busy: boolean;
  onPublish: (published: boolean) => void;
  onSetCurrent: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/issues/${issue.id}`} className="font-medium hover:underline">
            شماره {issue.issueNumber} — {issue.title}
          </Link>
          <StatusBadge status={issue.status} isCurrent={issue.isCurrent} />
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {formatPersianDate(issue.publicationDate)} · {issue.year}
          {issue.season ? ` · ${seasonLabel(issue.season)}` : ""}
          {issue.topic ? ` · ${issue.topic}` : ""}
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          {formatToman(issue.priceIrr)} ·{" "}
          {issue.stock > 0 ? `موجودی ${issue.stock}` : (
            <span className="font-medium text-red-600">ناموجود</span>
          )}
          {issue.hasCover ? " · جلد ✓" : " · بدون جلد"}
          {issue.hasPreviewPdf ? " · پیش‌نمایش ✓" : " · بدون پیش‌نمایش"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {issue.status === "ARCHIVED" ? (
          <AdminButton variant="secondary" loading={busy} onClick={onRestore}>
            بازگردانی
          </AdminButton>
        ) : (
          <>
            <AdminButton
              variant="secondary"
              loading={busy}
              onClick={() => onPublish(issue.status !== "PUBLISHED")}
            >
              {issue.status === "PUBLISHED" ? "لغو انتشار" : "انتشار"}
            </AdminButton>
            {issue.status === "PUBLISHED" && !issue.isCurrent ? (
              <AdminButton variant="secondary" loading={busy} onClick={onSetCurrent}>
                تعیین به‌عنوان جاری
              </AdminButton>
            ) : null}
            <AdminButton variant="danger" loading={busy} onClick={onArchive}>
              بایگانی
            </AdminButton>
          </>
        )}
      </div>
    </li>
  );
}
