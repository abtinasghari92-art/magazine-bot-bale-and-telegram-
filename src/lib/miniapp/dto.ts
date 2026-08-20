export type ProfileDto = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneVerified: boolean;
  isComplete: boolean;
  telegram: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    languageCode: string | null;
  } | null;
};

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

export type SessionDto = {
  isNewUser: boolean;
  profile: ProfileDto;
  addresses: AddressDto[];
  settings: { phoneVerificationRequired: boolean };
};

/* ------------------------------------------------------------------ catalog */

export type TocEntry = { title: string; page: number | null };

export type IssueSeason = "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";

export type IssueMediaDto = {
  url: string;
  width: number | null;
  height: number | null;
};

export type IssuePreviewDto = {
  available: boolean;
  /** Pages the reader may open — already clamped server-side (REQ-014). */
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

export type CatalogFacetsDto = {
  years: number[];
  seasons: IssueSeason[];
  topics: string[];
};

export type HomeResponse = { currentIssue: IssueDetailDto | null };

export type ArchiveResponse = {
  items: IssueSummaryDto[];
  nextCursor: string | null;
  facets: CatalogFacetsDto | null;
};

export type IssueResponse = { issue: IssueDetailDto };
