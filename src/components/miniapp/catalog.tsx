"use client";

import Link from "next/link";

import { formatPersianDate, seasonLabel } from "@/lib/dates";
import type { IssueSummaryDto } from "@/lib/miniapp/dto";
import { withInitData } from "@/lib/miniapp/telegram";

/** Pieces shared by the home, archive and detail screens (REQ-010 … REQ-013). */

export function IssueCover({
  issue,
  className = "",
  priority = false,
}: {
  issue: Pick<IssueSummaryDto, "cover" | "title" | "issueNumber">;
  className?: string;
  priority?: boolean;
}) {
  if (!issue.cover) {
    return (
      <div
        className={`flex aspect-[3/4] items-center justify-center rounded-xl border border-border-subtle bg-background text-center text-xs text-muted ${className}`}
      >
        <span>
          شماره {issue.issueNumber}
          <br />
          بدون تصویر جلد
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- served by an authorized API route, not a static asset
    <img
      // The cover route authorizes every request; init data rides in the query
      // string because an <img> cannot send the Authorization header.
      src={withInitData(issue.cover.url)}
      alt={`جلد ${issue.title}`}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`aspect-[3/4] w-full rounded-xl border border-border-subtle object-cover ${className}`}
    />
  );
}

/** Stock state must be visible wherever a price is (REQ-011 acceptance). */
export function StockBadge({ inStock }: { inStock: boolean }) {
  return inStock ? (
    <span className="rounded-full bg-link/10 px-2 py-0.5 text-xs font-medium text-link">
      موجود
    </span>
  ) : (
    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
      ناموجود
    </span>
  );
}

export function IssueMeta({ issue }: { issue: IssueSummaryDto }) {
  const parts = [
    formatPersianDate(issue.publicationDate),
    issue.season ? seasonLabel(issue.season) : null,
    issue.topic,
  ].filter(Boolean);

  return <p className="text-xs text-muted">{parts.join(" · ")}</p>;
}

/** Grid tile used by the archive (REQ-012). */
export function IssueGridCard({ issue }: { issue: IssueSummaryDto }) {
  return (
    <Link
      href={`/miniapp/issues/${issue.slug}`}
      className="block rounded-2xl bg-surface p-2 transition-opacity active:opacity-70"
    >
      <IssueCover issue={issue} />
      <div className="px-1 pb-1 pt-2">
        <p className="text-xs text-muted">شماره {issue.issueNumber}</p>
        <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold">{issue.title}</h3>
        <div className="mt-1.5 flex items-center justify-between gap-1">
          <span className="text-xs font-medium">{issue.priceLabel}</span>
          <StockBadge inStock={issue.inStock} />
        </div>
      </div>
    </Link>
  );
}

/**
 * Quick-purchase entry point (REQ-010).
 *
 * Day 3 has no Cart: this navigates to a route that states plainly that
 * checkout arrives on Day 4. It deliberately does not pretend to buy anything.
 */
export function PurchaseCta({
  slug,
  inStock,
  className = "",
}: {
  slug: string;
  inStock: boolean;
  className?: string;
}) {
  if (!inStock) {
    return (
      <div
        className={`flex min-h-11 items-center justify-center rounded-xl border border-border-subtle text-sm font-semibold text-muted ${className}`}
        aria-disabled="true"
      >
        فعلاً ناموجود
      </div>
    );
  }

  return (
    <Link
      href={`/miniapp/purchase/${slug}`}
      className={`flex min-h-11 items-center justify-center rounded-xl bg-button px-4 text-sm font-semibold text-button-text ${className}`}
    >
      خرید این شماره
    </Link>
  );
}
