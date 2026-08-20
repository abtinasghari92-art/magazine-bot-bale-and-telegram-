export type IssueStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type IssueSeason = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";

export type MediaAssetKind = "ISSUE_COVER" | "ISSUE_PREVIEW_PDF" | "ISSUE_DIGITAL_PDF";

/** One table-of-contents line (REQ-011). `page` is optional per DEC-017. */
export type TocEntry = {
  title: string;
  page: number | null;
};

export type MediaAssetRecord = {
  id: string;
  kind: MediaAssetKind;
  provider: string;
  bucket: string | null;
  /** Server-side only. Never serialized into a public DTO. */
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  checksum: string | null;
  originalFilename: string | null;
  width: number | null;
  height: number | null;
  pageCount: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MagazineIssueRecord = {
  id: string;
  issueNumber: number;
  title: string;
  slug: string;
  publicationDate: Date;
  description: string | null;
  tableOfContents: TocEntry[];
  /** Integer Rial. Never a float — see `docs/ARCHITECTURE.md`. */
  priceIrr: number;
  stock: number;
  status: IssueStatus;
  isCurrent: boolean;
  year: number;
  season: IssueSeason | null;
  topic: string | null;
  previewPageLimit: number | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  coverAssetId: string | null;
  previewPdfAssetId: string | null;
  digitalPdfAssetId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Fields an admin may write (REQ-048). Assets are attached separately. */
export type IssueWriteData = {
  issueNumber: number;
  title: string;
  slug: string;
  publicationDate: Date;
  description: string | null;
  tableOfContents: TocEntry[];
  priceIrr: number;
  stock: number;
  year: number;
  season: IssueSeason | null;
  topic: string | null;
  previewPageLimit: number | null;
};

export type IssueSort = "newest" | "oldest";

/** Public archive query (REQ-012 / REQ-013). Always server-validated. */
export type CatalogQuery = {
  search?: string;
  year?: number;
  season?: IssueSeason;
  topic?: string;
  limit: number;
  cursor?: string;
  sort: IssueSort;
};

export type AdminIssueQuery = CatalogQuery & {
  status?: IssueStatus;
};

export type IssuePage = {
  items: MagazineIssueRecord[];
  nextCursor: string | null;
};

export type CatalogFacets = {
  years: number[];
  seasons: IssueSeason[];
  topics: string[];
};
