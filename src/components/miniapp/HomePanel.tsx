"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ApiError, apiFetch } from "@/lib/miniapp/api";
import type { HomeResponse, IssueDetailDto } from "@/lib/miniapp/dto";

import { IssueCover, IssueMeta, PurchaseCta, StockBadge } from "./catalog";
import { useMiniApp } from "./MiniAppProvider";
import { Alert, Card, Muted, SectionTitle, Spinner } from "./ui";

/**
 * Mini App home (REQ-010).
 *
 * Shows the issue an admin designated as current, falling back to the newest
 * published one. The purchase CTA is an entry point only — Cart and checkout
 * are Day 4, and nothing here simulates a completed purchase.
 */
export function HomePanel() {
  const { session } = useMiniApp();
  const [issue, setIssue] = useState<IssueDetailDto | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const data = await apiFetch<HomeResponse>("/api/miniapp/catalog/home", {
          signal: controller.signal,
        });
        if (cancelled) return;
        setIssue(data.currentIssue);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setMessage(error instanceof ApiError ? error.message : "بارگذاری صفحه اصلی ممکن نشد.");
        setStatus("error");
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const displayName =
    [session.profile.firstName, session.profile.lastName].filter(Boolean).join(" ") ||
    session.profile.telegram?.firstName ||
    "کاربر گرامی";

  return (
    <div className="space-y-4 py-2">
      <Card>
        <p className="text-sm text-muted">{session.isNewUser ? "خوش آمدید" : "خوش برگشتید"}</p>
        <p className="mt-1 text-lg font-semibold">{displayName}</p>
      </Card>

      {status === "loading" ? (
        <Card>
          <div className="flex items-center justify-center gap-2 py-8 text-muted">
            <Spinner small />
            <span className="text-sm">در حال بارگذاری شماره جاری…</span>
          </div>
        </Card>
      ) : status === "error" ? (
        <Card>
          <Alert>{message}</Alert>
        </Card>
      ) : issue ? (
        <CurrentIssueCard issue={issue} />
      ) : (
        <Card>
          <SectionTitle>شماره جاری</SectionTitle>
          <Muted>هنوز شماره‌ای منتشر نشده است. به‌زودی اولین شماره در همین صفحه قرار می‌گیرد.</Muted>
        </Card>
      )}

      <Card>
        <SectionTitle>آرشیو مجله</SectionTitle>
        <Muted>همه شماره‌های منتشرشده را ببینید و بر اساس سال، فصل و موضوع فیلتر کنید.</Muted>
        <Link
          href="/miniapp/archive"
          className="mt-3 flex min-h-11 items-center justify-center rounded-xl border border-border-subtle text-sm font-semibold"
        >
          رفتن به آرشیو
        </Link>
      </Card>
    </div>
  );
}

function CurrentIssueCard({ issue }: { issue: IssueDetailDto }) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <SectionTitle>شماره جاری</SectionTitle>
        <StockBadge inStock={issue.inStock} />
      </div>

      <div className="flex gap-3">
        <div className="w-28 shrink-0">
          <IssueCover issue={issue} priority />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">شماره {issue.issueNumber}</p>
          <h3 className="mt-0.5 text-base font-semibold">{issue.title}</h3>
          <div className="mt-1">
            <IssueMeta issue={issue} />
          </div>
          <p className="mt-2 text-sm font-semibold">{issue.priceLabel}</p>
        </div>
      </div>

      {issue.description ? (
        <p className="mt-3 line-clamp-3 text-sm text-muted">{issue.description}</p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <PurchaseCta slug={issue.slug} inStock={issue.inStock} />
        <Link
          href={`/miniapp/issues/${issue.slug}`}
          className="flex min-h-11 items-center justify-center rounded-xl border border-border-subtle px-4 text-sm font-semibold"
        >
          جزئیات شماره
        </Link>
      </div>
    </Card>
  );
}
