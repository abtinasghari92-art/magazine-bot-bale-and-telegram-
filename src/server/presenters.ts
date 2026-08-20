import "server-only";

import { formatToman } from "@/lib/money";
import type { AddressRecord } from "@/modules/address/types";
import type {
  IssueSeason,
  IssueStatus,
  MagazineIssueRecord,
  MediaAssetRecord,
  TocEntry,
} from "@/modules/catalog";
import type { ProfileSummary } from "@/modules/profile";

export type AddressDto = {
  id: string;
  label: string | null;
  recipientName: string;
  recipientMobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toAddressDto(address: AddressRecord): AddressDto {
  return {
    id: address.id,
    label: address.label,
    recipientName: address.recipientName,
    recipientMobile: address.recipientMobile,
    province: address.province,
    city: address.city,
    addressLine: address.addressLine,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
    createdAt: address.createdAt.toISOString(),
    updatedAt: address.updatedAt.toISOString(),
  };
}

export type ProfileDto = ProfileSummary;

/* ------------------------------------------------------------------ catalog */

/**
 * Catalog DTOs (REQ-010 … REQ-013).
 *
 * These functions are the only place a `MagazineIssueRecord` becomes something
 * a browser can see. Object storage keys, asset ids and internal timestamps are
 * dropped here rather than filtered in a component, so a new page cannot leak
 * them by rendering the raw record.
 */

export type IssueMediaDto = {
  /** Server route that authorizes and streams the file. Never an object key. */
  url: string;
  width: number | null;
  height: number | null;
};

export type IssuePreviewDto = {
  available: boolean;
  /** Pages the reader may open — already clamped by the configured limit. */
  pageCount: number;
  url: string | null;
};

export type IssueSummaryDto = {
  slug: string;
  issueNumber: number;
  title: string;
  publicationDate: string;
  priceIrr: number;
  priceLabel: string;
  stock: number;
  inStock: boolean;
  isCurrent: boolean;
  year: number;
  season: IssueSeason | null;
  topic: string | null;
  cover: IssueMediaDto | null;
};

export type IssueDetailDto = IssueSummaryDto & {
  description: string | null;
  tableOfContents: TocEntry[];
  preview: IssuePreviewDto;
};

export function issueCoverUrl(slug: string): string {
  return `/api/miniapp/issues/${encodeURIComponent(slug)}/cover`;
}

export function issuePreviewUrl(slug: string): string {
  return `/api/miniapp/issues/${encodeURIComponent(slug)}/preview`;
}

export function toIssueSummaryDto(
  issue: MagazineIssueRecord,
  cover?: MediaAssetRecord | null,
): IssueSummaryDto {
  return {
    slug: issue.slug,
    issueNumber: issue.issueNumber,
    title: issue.title,
    publicationDate: issue.publicationDate.toISOString(),
    priceIrr: issue.priceIrr,
    priceLabel: formatToman(issue.priceIrr),
    stock: issue.stock,
    inStock: issue.stock > 0,
    isCurrent: issue.isCurrent,
    year: issue.year,
    season: issue.season,
    topic: issue.topic,
    cover: issue.coverAssetId
      ? {
          url: issueCoverUrl(issue.slug),
          width: cover?.width ?? null,
          height: cover?.height ?? null,
        }
      : null,
  };
}

export function toIssueDetailDto(
  issue: MagazineIssueRecord,
  options: {
    cover?: MediaAssetRecord | null;
    previewPageCount: number;
  },
): IssueDetailDto {
  const previewAvailable = Boolean(issue.previewPdfAssetId) && options.previewPageCount > 0;
  return {
    ...toIssueSummaryDto(issue, options.cover),
    description: issue.description,
    tableOfContents: issue.tableOfContents,
    preview: {
      available: previewAvailable,
      pageCount: previewAvailable ? options.previewPageCount : 0,
      url: previewAvailable ? issuePreviewUrl(issue.slug) : null,
    },
  };
}

/**
 * Admin view of an issue (REQ-048). Adds the workflow fields an operator needs
 * and flags which assets exist — still without exposing any object key.
 */
export type AdminIssueDto = {
  id: string;
  issueNumber: number;
  title: string;
  slug: string;
  publicationDate: string;
  description: string | null;
  tableOfContents: TocEntry[];
  priceIrr: number;
  stock: number;
  status: IssueStatus;
  isCurrent: boolean;
  year: number;
  season: IssueSeason | null;
  topic: string | null;
  previewPageLimit: number | null;
  publishedAt: string | null;
  archivedAt: string | null;
  hasCover: boolean;
  hasPreviewPdf: boolean;
  previewPageCount: number | null;
  createdAt: string;
  updatedAt: string;
};

export function toAdminIssueDto(
  issue: MagazineIssueRecord,
  previewAsset?: MediaAssetRecord | null,
): AdminIssueDto {
  return {
    id: issue.id,
    issueNumber: issue.issueNumber,
    title: issue.title,
    slug: issue.slug,
    publicationDate: issue.publicationDate.toISOString(),
    description: issue.description,
    tableOfContents: issue.tableOfContents,
    priceIrr: issue.priceIrr,
    stock: issue.stock,
    status: issue.status,
    isCurrent: issue.isCurrent,
    year: issue.year,
    season: issue.season,
    topic: issue.topic,
    previewPageLimit: issue.previewPageLimit,
    publishedAt: issue.publishedAt?.toISOString() ?? null,
    archivedAt: issue.archivedAt?.toISOString() ?? null,
    hasCover: Boolean(issue.coverAssetId),
    hasPreviewPdf: Boolean(issue.previewPdfAssetId),
    previewPageCount: previewAsset?.pageCount ?? null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}
