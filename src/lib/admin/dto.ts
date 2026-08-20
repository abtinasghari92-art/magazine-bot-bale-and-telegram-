/** Browser-side mirror of the admin DTOs in `src/server/presenters.ts`. */

export type TocEntry = { title: string; page: number | null };

export type IssueStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type IssueSeason = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";

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

export type AdminIssueListResponse = {
  items: AdminIssueDto[];
  nextCursor: string | null;
};

export type AdminIssueResponse = { issue: AdminIssueDto };
