"use client";

import { useRef, useState } from "react";

import { adminFetch, AdminApiError } from "@/lib/admin/api";
import type { AdminIssueDto, AdminIssueResponse } from "@/lib/admin/dto";

import { AdminAlert, AdminButton, AdminCard, AdminHeading } from "./ui";

/**
 * Cover and preview-PDF management for one issue (REQ-048 / REQ-014).
 *
 * The form posts bytes to `PUT /api/admin/issues/:id/assets/:kind`. It never
 * names an object key — the server generates one — so nothing the operator's
 * browser sends can address another issue's stored files.
 */
export function IssueAssetsPanel({
  issue,
  onChanged,
}: {
  issue: AdminIssueDto;
  onChanged: () => void;
}) {
  const [current, setCurrent] = useState(issue);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Bumped after every upload so the <img> refetches instead of showing cache.
  const [coverVersion, setCoverVersion] = useState(0);

  async function upload(kind: "cover" | "preview", file: File) {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      const data = await adminFetch<AdminIssueResponse & { pageCount: number | null }>(
        `/api/admin/issues/${issue.id}/assets/${kind}`,
        { method: "PUT", file },
      );
      setCurrent(data.issue);
      setCoverVersion((value) => value + 1);
      setNotice(
        kind === "preview" && data.pageCount
          ? `فایل بارگذاری شد. تعداد کل صفحات فایل: ${data.pageCount}`
          : "فایل بارگذاری شد.",
      );
      onChanged();
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : "بارگذاری فایل ممکن نشد.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(kind: "cover" | "preview") {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      const data = await adminFetch<AdminIssueResponse>(
        `/api/admin/issues/${issue.id}/assets/${kind}`,
        { method: "DELETE" },
      );
      setCurrent(data.issue);
      setCoverVersion((value) => value + 1);
      setNotice("فایل حذف شد.");
      onChanged();
    } catch (caught) {
      setError(caught instanceof AdminApiError ? caught.message : "حذف فایل ممکن نشد.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminCard>
      <AdminHeading>تصویر جلد و پیش‌نمایش</AdminHeading>

      {error ? <AdminAlert>{error}</AdminAlert> : null}
      {notice ? <AdminAlert tone="success">{notice}</AdminAlert> : null}

      <div className="grid gap-6 md:grid-cols-2">
        <AssetSlot
          title="تصویر جلد"
          hint="قالب‌های JPEG، PNG یا WebP."
          accept="image/jpeg,image/png,image/webp"
          present={current.hasCover}
          busy={busy === "cover"}
          onUpload={(file) => upload("cover", file)}
          onRemove={() => remove("cover")}
        >
          {current.hasCover ? (
            // eslint-disable-next-line @next/next/no-img-element -- authorized server route, not an optimizable static asset
            <img
              src={`/api/admin/issues/${issue.id}/cover?v=${coverVersion}`}
              alt="تصویر جلد فعلی"
              className="mb-3 h-40 w-auto rounded-lg border border-zinc-200 object-cover"
            />
          ) : null}
        </AssetSlot>

        <AssetSlot
          title="فایل پیش‌نمایش (PDF)"
          hint="فقط تعداد صفحات مجاز و با واترمارک به کاربر نمایش داده می‌شود؛ فایل کامل هرگز ارسال نمی‌شود."
          accept="application/pdf"
          present={current.hasPreviewPdf}
          busy={busy === "preview"}
          onUpload={(file) => upload("preview", file)}
          onRemove={() => remove("preview")}
        >
          {current.hasPreviewPdf ? (
            <p className="mb-3 text-sm text-zinc-600">
              {current.previewPageCount
                ? `فایل ثبت‌شده: ${current.previewPageCount} صفحه`
                : "فایل ثبت شده است."}
              {" · "}
              <a
                href={`/api/admin/issues/${issue.id}/preview`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline"
              >
                مشاهده پیش‌نمایش
              </a>
            </p>
          ) : null}
        </AssetSlot>
      </div>
    </AdminCard>
  );
}

function AssetSlot({
  title,
  hint,
  accept,
  present,
  busy,
  onUpload,
  onRemove,
  children,
}: {
  title: string;
  hint: string;
  accept: string;
  present: boolean;
  busy: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <p className="mb-3 text-xs text-zinc-500">{hint}</p>

      {children}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onUpload(file);
          // Reset so re-picking the same filename fires `change` again.
          event.target.value = "";
        }}
      />

      <div className="flex gap-2">
        <AdminButton
          type="button"
          variant="secondary"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          {present ? "جایگزینی فایل" : "بارگذاری فایل"}
        </AdminButton>
        {present ? (
          <AdminButton type="button" variant="danger" loading={busy} onClick={onRemove}>
            حذف
          </AdminButton>
        ) : null}
      </div>
    </div>
  );
}
