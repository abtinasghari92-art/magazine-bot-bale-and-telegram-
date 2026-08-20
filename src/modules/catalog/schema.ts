import { z } from "zod";

import { requiredTextSchema } from "@/lib/fields";
import { normalizePersianText, toEnglishDigits } from "@/lib/persian";

import { MAX_PREVIEW_PAGE_LIMIT } from "@/modules/preview";

/**
 * Catalog validation (REQ-048 / REQ-012 / REQ-013).
 *
 * Every admin write and every public query string goes through these schemas.
 * Nothing reaches Prisma unvalidated, and no free-form value is interpolated
 * into a query.
 */

export const DEFAULT_ARCHIVE_PAGE_SIZE = 12;
export const MAX_ARCHIVE_PAGE_SIZE = 24;

/** 2,000,000,000 Rial ≈ 200 million Toman — far above any magazine price. */
export const MAX_PRICE_IRR = 2_000_000_000;

export const issueSeasonSchema = z.enum(["SPRING", "SUMMER", "AUTUMN", "WINTER"]);
export const issueStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

/** Persian/Arabic digits are normalized before any number is parsed. */
const numericText = z.union([z.string(), z.number()]).transform((value) => {
  return typeof value === "number" ? String(value) : toEnglishDigits(value).trim();
});

function integerFrom(field: string, min: number, max: number) {
  return numericText
    .refine((value) => /^-?\d+$/.test(value), { message: `${field} باید عدد صحیح باشد.` })
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => value >= min && value <= max, {
      message: `${field} باید بین ${min} و ${max} باشد.`,
    });
}

const slugSchema = z
  .string({ required_error: "شناسه نشانی (slug) الزامی است." })
  .transform((value) => toEnglishDigits(value).trim().toLowerCase())
  .refine((value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value), {
    message: "شناسه نشانی فقط می‌تواند شامل حروف انگلیسی کوچک، رقم و خط تیره باشد.",
  })
  .refine((value) => value.length >= 2 && value.length <= 80, {
    message: "شناسه نشانی باید بین ۲ تا ۸۰ نویسه باشد.",
  });

const publicationDateSchema = z
  .union([z.string(), z.date()])
  .transform((value, ctx) => {
    if (value instanceof Date) return value;
    const normalized = toEnglishDigits(value).trim();
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(normalized) ? `${normalized}T00:00:00.000Z` : normalized);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "تاریخ انتشار معتبر نیست." });
      return z.NEVER;
    }
    return parsed;
  });

const tocEntrySchema = z.object({
  title: requiredTextSchema("عنوان مطلب", 200),
  page: integerFrom("شماره صفحه", 1, 10_000).nullish().transform((value) => value ?? null),
});

/**
 * The admin form sends one entry per line (`عنوان | صفحه`); the API accepts the
 * structured array. Both land on the same validated shape.
 */
const tableOfContentsSchema = z
  .union([z.string(), z.array(z.unknown()), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value;
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [title, page] = line.split("|");
        return { title: title ?? "", page: page?.trim() ? page.trim() : null };
      });
  })
  .pipe(z.array(tocEntrySchema).max(300, { message: "فهرست مطالب بیش از حد طولانی است." }));

const priceSchema = integerFrom("قیمت", 0, MAX_PRICE_IRR).refine(
  (value) => value % 10 === 0,
  { message: "قیمت باید مضربی از ۱۰ ریال باشد تا معادل تومانی آن دقیق نمایش داده شود." },
);

const optionalTopicSchema = z
  .string()
  .nullish()
  .transform((value) => {
    const trimmed = value ? normalizePersianText(value) : "";
    return trimmed.length > 0 ? trimmed : null;
  })
  .refine((value) => value === null || value.length <= 60, {
    message: "موضوع نباید بیش از ۶۰ نویسه باشد.",
  });

const optionalSeasonSchema = z
  .union([issueSeasonSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value ? value : null));

export const issueWriteSchema = z
  .object({
    issueNumber: integerFrom("شماره مجله", 1, 100_000),
    title: requiredTextSchema("عنوان", 200),
    slug: slugSchema,
    publicationDate: publicationDateSchema,
    description: z
      .string()
      .nullish()
      .transform((value) => {
        const trimmed = value?.trim();
        return trimmed && trimmed.length > 0 ? trimmed : null;
      })
      .refine((value) => value === null || value.length <= 5_000, {
        message: "توضیحات نباید بیش از ۵۰۰۰ نویسه باشد.",
      }),
    tableOfContents: tableOfContentsSchema,
    priceIrr: priceSchema,
    stock: integerFrom("موجودی", 0, 1_000_000),
    /** DEC-017 leaves the calendar open; the admin types the year they publish under. */
    year: integerFrom("سال", 1_000, 2_200),
    season: optionalSeasonSchema,
    topic: optionalTopicSchema,
    previewPageLimit: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .transform((value) => (value === "" || value === null || value === undefined ? null : value))
      .pipe(integerFrom("تعداد صفحات پیش‌نمایش", 1, MAX_PREVIEW_PAGE_LIMIT).nullable()),
  })
  .strict();

export type IssueWriteInput = z.input<typeof issueWriteSchema>;

/** Every field optional; only the keys present are written. */
export const issueUpdateSchema = issueWriteSchema.partial().strict();

export const setCurrentSchema = z.object({ isCurrent: z.boolean() }).strict();
export const setPublishedSchema = z.object({ published: z.boolean() }).strict();

const searchSchema = z
  .string()
  .nullish()
  .transform((value) => {
    const normalized = value ? normalizePersianText(value) : "";
    return normalized.length > 0 ? normalized.slice(0, 80) : undefined;
  });

const optionalYearFilter = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => (value === "" || value === null || value === undefined ? undefined : value))
  .pipe(integerFrom("سال", 1_000, 2_200).optional());

const optionalSeasonFilter = z
  .union([issueSeasonSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value ? value : undefined));

const optionalTopicFilter = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    const trimmed = value ? normalizePersianText(value) : "";
    return trimmed.length > 0 ? trimmed.slice(0, 60) : undefined;
  });

/**
 * A URL spells the search term `q`; the domain type calls it `search`. Renaming
 * before parsing lets both spellings arrive and keeps the object schema
 * extendable for the admin variant below.
 */
function withSearchAlias(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (record.q === undefined || record.search !== undefined) return value;
  const { q, ...rest } = record;
  return { ...rest, search: q };
}

const catalogQueryObject = z
  .object({
    search: searchSchema,
    year: optionalYearFilter,
    season: optionalSeasonFilter,
    topic: optionalTopicFilter,
    limit: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .transform((value) =>
        value === "" || value === null || value === undefined ? DEFAULT_ARCHIVE_PAGE_SIZE : value,
      )
      .pipe(integerFrom("تعداد", 1, MAX_ARCHIVE_PAGE_SIZE)),
    cursor: z
      .string()
      .max(128)
      .nullish()
      .transform((value) => (value?.trim() ? value.trim() : undefined)),
    sort: z
      .union([z.literal("newest"), z.literal("oldest"), z.literal(""), z.null(), z.undefined()])
      .transform((value) => (value === "oldest" ? "oldest" : "newest")),
  })
  .strip();

/** Public archive query. The limit is capped server-side (REQ-004). */
export const catalogQuerySchema = z.preprocess(withSearchAlias, catalogQueryObject);

const adminIssueQueryObject = catalogQueryObject.extend({
  status: z
    .union([issueStatusSchema, z.literal(""), z.literal("ALL"), z.null(), z.undefined()])
    .transform((value) => (value && value !== "ALL" ? value : undefined)),
});

/** Admin listing query: the public one plus an optional status filter. */
export const adminIssueQuerySchema = z.preprocess(withSearchAlias, adminIssueQueryObject);
