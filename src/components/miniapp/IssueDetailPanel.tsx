"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatPersianDate, seasonLabel } from "@/lib/dates";
import { ApiError, apiFetch } from "@/lib/miniapp/api";
import type { IssueDetailDto, IssueResponse } from "@/lib/miniapp/dto";
import { withInitData } from "@/lib/miniapp/telegram";

import { IssueCover, PurchaseCta, StockBadge } from "./catalog";
import { Alert, Card, ErrorScreen, LoadingScreen, Muted, SectionTitle } from "./ui";

/**
 * Issue detail (REQ-011) plus the preview entry point (REQ-014).
 *
 * Only published issues resolve here: the API answers 404 for a draft slug, so
 * a guessed URL reveals nothing about unpublished content.
 */
export function IssueDetailPanel({ slug }: { slug: string }) {
  const [issue, setIssue] = useState<IssueDetailDto | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setStatus("loading");
      try {
        const data = await apiFetch<IssueResponse>(
          `/api/miniapp/issues/${encodeURIComponent(slug)}`,
          { signal: controller.signal },
        );
        if (cancelled) return;
        setIssue(data.issue);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setMessage(error instanceof ApiError ? error.message : "بارگذاری این شماره ممکن نشد.");
        setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug]);

  if (status === "loading") return <LoadingScreen message="در حال بارگذاری شماره…" />;

  if (status === "error" || !issue) {
    return (
      <ErrorScreen
        title="شماره یافت نشد"
        message={message || "این شماره در دسترس نیست."}
      />
    );
  }

  return (
    <div className="space-y-4 py-2">
      <Card>
        <div className="flex gap-3">
          <div className="w-32 shrink-0">
            <IssueCover issue={issue} priority />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">شماره {issue.issueNumber}</p>
            <h1 className="mt-0.5 text-lg font-semibold">{issue.title}</h1>
            <p className="mt-1.5 text-xs text-muted">
              تاریخ انتشار: {formatPersianDate(issue.publicationDate)}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {issue.year}
              {issue.season ? ` · ${seasonLabel(issue.season)}` : ""}
              {issue.topic ? ` · ${issue.topic}` : ""}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-base font-semibold">{issue.priceLabel}</span>
              <StockBadge inStock={issue.inStock} />
            </div>
          </div>
        </div>

        {!issue.inStock ? (
          <div className="mt-3">
            <Alert tone="info">
              این شماره در حال حاضر موجود نیست. با تأمین موجودی، امکان خرید فعال می‌شود.
            </Alert>
          </div>
        ) : null}

        <div className="mt-4">
          <PurchaseCta slug={issue.slug} inStock={issue.inStock} />
        </div>
      </Card>

      <PreviewCard key={issue.slug} issue={issue} />

      {issue.description ? (
        <Card>
          <SectionTitle>درباره این شماره</SectionTitle>
          <p className="whitespace-pre-line text-sm leading-7">{issue.description}</p>
        </Card>
      ) : null}

      {issue.tableOfContents.length > 0 ? (
        <Card>
          <SectionTitle>فهرست مطالب</SectionTitle>
          <ol className="space-y-2 text-sm">
            {issue.tableOfContents.map((entry, index) => (
              <li
                key={`${entry.title}-${index}`}
                className="flex items-baseline justify-between gap-3 border-b border-border-subtle pb-2 last:border-0 last:pb-0"
              >
                <span className="min-w-0">{entry.title}</span>
                {entry.page ? (
                  <span className="shrink-0 text-xs text-muted">صفحه {entry.page}</span>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <Link
        href="/miniapp/archive"
        className="flex min-h-11 items-center justify-center rounded-xl border border-border-subtle text-sm font-semibold"
      >
        بازگشت به آرشیو
      </Link>
    </div>
  );
}

/**
 * Preview entry (REQ-014).
 *
 * The link opens the server-built preview: only the allowed pages, each
 * watermarked. The source PDF has no public URL at all, so there is nothing
 * here for a reader to escalate to the full file.
 *
 * The init data has to ride along as a query parameter because a new tab
 * cannot carry the `Authorization` header `apiFetch` normally sets.
 */
function PreviewCard({ issue }: { issue: IssueDetailDto }) {
  // Resolved once, on mount. `withInitData` reads `window`, and this component
  // only ever mounts on the client — `MiniAppProvider` renders a loading screen
  // until the session request has resolved in the browser. The caller keys this
  // component by slug, so a different issue mounts a fresh one rather than
  // keeping a stale link.
  const [href] = useState<string | null>(() =>
    issue.preview.available && issue.preview.url ? withInitData(issue.preview.url) : null,
  );

  if (!issue.preview.available) {
    return (
      <Card>
        <SectionTitle>پیش‌نمایش</SectionTitle>
        <Muted>برای این شماره پیش‌نمایشی ثبت نشده است.</Muted>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>پیش‌نمایش</SectionTitle>
      <Muted>
        {issue.preview.pageCount} صفحه نخست این شماره به‌صورت پیش‌نمایش و همراه با واترمارک در
        دسترس است.
      </Muted>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-border-subtle text-sm font-semibold"
        >
          مشاهده پیش‌نمایش
        </a>
      ) : null}
    </Card>
  );
}
