"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { adminFetch, AdminApiError } from "@/lib/admin/api";
import type { AdminIssueDto, AdminIssueResponse } from "@/lib/admin/dto";
import { toDateInputValue } from "@/lib/dates";
import { formatToman } from "@/lib/money";

import { IssueAssetsPanel } from "./IssueAssetsPanel";
import {
  AdminAlert,
  AdminButton,
  AdminCard,
  AdminField,
  AdminHeading,
  AdminInput,
  AdminSelect,
  AdminTextArea,
} from "./ui";

/**
 * Create / edit form for one issue (REQ-048).
 *
 * Field-level messages come from the server's Zod issues rather than a second
 * copy of the rules in the browser, so validation cannot drift between the two.
 */

type FormState = {
  issueNumber: string;
  title: string;
  slug: string;
  publicationDate: string;
  description: string;
  tableOfContents: string;
  priceIrr: string;
  stock: string;
  year: string;
  season: string;
  topic: string;
  previewPageLimit: string;
};

function tocToText(entries: AdminIssueDto["tableOfContents"]): string {
  return entries.map((entry) => (entry.page ? `${entry.title} | ${entry.page}` : entry.title)).join("\n");
}

function initialState(issue: AdminIssueDto | null): FormState {
  if (!issue) {
    return {
      issueNumber: "",
      title: "",
      slug: "",
      publicationDate: toDateInputValue(new Date()),
      description: "",
      tableOfContents: "",
      priceIrr: "",
      stock: "0",
      year: String(new Date().getFullYear()),
      season: "",
      topic: "",
      previewPageLimit: "",
    };
  }

  return {
    issueNumber: String(issue.issueNumber),
    title: issue.title,
    slug: issue.slug,
    publicationDate: toDateInputValue(issue.publicationDate),
    description: issue.description ?? "",
    tableOfContents: tocToText(issue.tableOfContents),
    priceIrr: String(issue.priceIrr),
    stock: String(issue.stock),
    year: String(issue.year),
    season: issue.season ?? "",
    topic: issue.topic ?? "",
    previewPageLimit: issue.previewPageLimit === null ? "" : String(issue.previewPageLimit),
  };
}

export function IssueForm({ issue }: { issue: AdminIssueDto | null }) {
  const router = useRouter();
  const isEdit = issue !== null;

  const [form, setForm] = useState<FormState>(() => initialState(issue));
  const [error, setError] = useState<AdminApiError | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);

    const payload = {
      issueNumber: form.issueNumber,
      title: form.title,
      slug: form.slug,
      publicationDate: form.publicationDate,
      description: form.description,
      tableOfContents: form.tableOfContents,
      priceIrr: form.priceIrr,
      stock: form.stock,
      year: form.year,
      season: form.season,
      topic: form.topic,
      previewPageLimit: form.previewPageLimit,
    };

    try {
      const data = await adminFetch<AdminIssueResponse>(
        isEdit ? `/api/admin/issues/${issue.id}` : "/api/admin/issues",
        { method: isEdit ? "PATCH" : "POST", body: payload },
      );

      if (!isEdit) {
        router.replace(`/admin/issues/${data.issue.id}`);
        router.refresh();
        return;
      }

      setForm(initialState(data.issue));
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof AdminApiError ? caught : new AdminApiError(0, "error", "ذخیره ممکن نشد."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const priceNumber = Number.parseInt(form.priceIrr, 10);
  const priceHint = Number.isFinite(priceNumber)
    ? `معادل ${formatToman(priceNumber)}`
    : "مبلغ به ریال و مضربی از ۱۰ باشد.";

  return (
    <div className="space-y-4">
      <AdminCard>
        <AdminHeading>{isEdit ? "ویرایش شماره" : "ثبت شماره جدید"}</AdminHeading>

        {error ? <AdminAlert>{error.message}</AdminAlert> : null}
        {saved ? <AdminAlert tone="success">تغییرات ذخیره شد.</AdminAlert> : null}

        <form onSubmit={onSubmit} noValidate>
          <div className="grid gap-x-4 md:grid-cols-2">
            <AdminField
              label="شماره مجله"
              htmlFor="issueNumber"
              required
              error={error?.issueFor("issueNumber")}
            >
              <AdminInput
                id="issueNumber"
                inputMode="numeric"
                value={form.issueNumber}
                onChange={(event) => set("issueNumber", event.target.value)}
              />
            </AdminField>

            <AdminField label="عنوان" htmlFor="title" required error={error?.issueFor("title")}>
              <AdminInput
                id="title"
                value={form.title}
                onChange={(event) => set("title", event.target.value)}
              />
            </AdminField>

            <AdminField
              label="شناسه نشانی (slug)"
              htmlFor="slug"
              required
              hint="در نشانی عمومی استفاده می‌شود: حروف انگلیسی کوچک، رقم و خط تیره."
              error={error?.issueFor("slug")}
            >
              <AdminInput
                id="slug"
                dir="ltr"
                value={form.slug}
                onChange={(event) => set("slug", event.target.value)}
              />
            </AdminField>

            <AdminField
              label="تاریخ انتشار"
              htmlFor="publicationDate"
              required
              error={error?.issueFor("publicationDate")}
            >
              <AdminInput
                id="publicationDate"
                type="date"
                dir="ltr"
                value={form.publicationDate}
                onChange={(event) => set("publicationDate", event.target.value)}
              />
            </AdminField>

            <AdminField
              label="قیمت (ریال)"
              htmlFor="priceIrr"
              required
              hint={priceHint}
              error={error?.issueFor("priceIrr")}
            >
              <AdminInput
                id="priceIrr"
                inputMode="numeric"
                dir="ltr"
                value={form.priceIrr}
                onChange={(event) => set("priceIrr", event.target.value)}
              />
            </AdminField>

            <AdminField
              label="موجودی"
              htmlFor="stock"
              required
              hint="موجودی صفر یعنی شماره در مینی‌اپ «ناموجود» نمایش داده می‌شود."
              error={error?.issueFor("stock")}
            >
              <AdminInput
                id="stock"
                inputMode="numeric"
                dir="ltr"
                value={form.stock}
                onChange={(event) => set("stock", event.target.value)}
              />
            </AdminField>

            <AdminField label="سال" htmlFor="year" required error={error?.issueFor("year")}>
              <AdminInput
                id="year"
                inputMode="numeric"
                dir="ltr"
                value={form.year}
                onChange={(event) => set("year", event.target.value)}
              />
            </AdminField>

            <AdminField label="فصل" htmlFor="season" error={error?.issueFor("season")}>
              <AdminSelect
                id="season"
                value={form.season}
                onChange={(event) => set("season", event.target.value)}
              >
                <option value="">—</option>
                <option value="SPRING">بهار</option>
                <option value="SUMMER">تابستان</option>
                <option value="AUTUMN">پاییز</option>
                <option value="WINTER">زمستان</option>
              </AdminSelect>
            </AdminField>

            <AdminField label="موضوع" htmlFor="topic" error={error?.issueFor("topic")}>
              <AdminInput
                id="topic"
                value={form.topic}
                onChange={(event) => set("topic", event.target.value)}
              />
            </AdminField>

            <AdminField
              label="تعداد صفحات پیش‌نمایش"
              htmlFor="previewPageLimit"
              hint="خالی بگذارید تا مقدار پیش‌فرض سامانه اعمال شود."
              error={error?.issueFor("previewPageLimit")}
            >
              <AdminInput
                id="previewPageLimit"
                inputMode="numeric"
                dir="ltr"
                value={form.previewPageLimit}
                onChange={(event) => set("previewPageLimit", event.target.value)}
              />
            </AdminField>
          </div>

          <AdminField label="توضیحات" htmlFor="description" error={error?.issueFor("description")}>
            <AdminTextArea
              id="description"
              rows={5}
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </AdminField>

          <AdminField
            label="فهرست مطالب"
            htmlFor="tableOfContents"
            hint="هر مطلب در یک خط. برای افزودن شماره صفحه: «عنوان مطلب | ۱۲»"
            error={error?.issueFor("tableOfContents")}
          >
            <AdminTextArea
              id="tableOfContents"
              rows={6}
              value={form.tableOfContents}
              onChange={(event) => set("tableOfContents", event.target.value)}
            />
          </AdminField>

          <div className="flex gap-2">
            <AdminButton type="submit" loading={submitting}>
              {isEdit ? "ذخیره تغییرات" : "ثبت شماره"}
            </AdminButton>
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => router.push("/admin/issues")}
            >
              بازگشت به فهرست
            </AdminButton>
          </div>
        </form>
      </AdminCard>

      {isEdit ? (
        <IssueAssetsPanel issue={issue} onChanged={() => router.refresh()} />
      ) : (
        <AdminCard>
          <AdminHeading>تصویر جلد و پیش‌نمایش</AdminHeading>
          <p className="text-sm text-zinc-500">
            پس از ثبت شماره، امکان بارگذاری تصویر جلد و فایل پیش‌نمایش در همین صفحه فعال می‌شود.
          </p>
        </AdminCard>
      )}
    </div>
  );
}
