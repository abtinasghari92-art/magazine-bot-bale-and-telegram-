import type {
  AdminIssueQuery,
  CatalogFacets,
  CatalogQuery,
  IssuePage,
  IssueStatus,
  IssueWriteData,
  MagazineIssueRecord,
  MediaAssetKind,
  MediaAssetRecord,
} from "./types";

export type MediaAssetInput = {
  kind: MediaAssetKind;
  provider: string;
  bucket: string | null;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  checksum: string | null;
  originalFilename: string | null;
  width?: number | null;
  height?: number | null;
  pageCount?: number | null;
};

/**
 * Persistence port for the magazine catalog (REQ-048).
 *
 * Public reads and admin reads are separate methods on purpose: a public method
 * can never be handed a status filter that would expose a draft.
 */
export interface CatalogRepository {
  /** Published issues only. */
  listPublished(query: CatalogQuery): Promise<IssuePage>;

  /** Published issue by slug, or `null`. Drafts are invisible here. */
  findPublishedBySlug(slug: string): Promise<MagazineIssueRecord | null>;

  /** The designated current issue, else the highest published issue number. */
  findCurrentPublished(): Promise<MagazineIssueRecord | null>;

  /** Distinct year / season / topic values across published issues. */
  publishedFacets(): Promise<CatalogFacets>;

  /** Admin listing: any status. */
  listAll(query: AdminIssueQuery): Promise<IssuePage>;

  findById(issueId: string): Promise<MagazineIssueRecord | null>;

  findByIssueNumber(issueNumber: number): Promise<MagazineIssueRecord | null>;

  findBySlug(slug: string): Promise<MagazineIssueRecord | null>;

  create(data: IssueWriteData): Promise<MagazineIssueRecord>;

  update(issueId: string, data: Partial<IssueWriteData>): Promise<MagazineIssueRecord>;

  setStatus(
    issueId: string,
    status: IssueStatus,
    timestamps: { publishedAt?: Date | null; archivedAt?: Date | null },
  ): Promise<MagazineIssueRecord>;

  /** Clear `isCurrent` on every issue, then set it on one. Both inside one lock. */
  setCurrent(issueId: string | null): Promise<MagazineIssueRecord | null>;

  createAsset(input: MediaAssetInput): Promise<MediaAssetRecord>;

  findAssetById(assetId: string): Promise<MediaAssetRecord | null>;

  /** Attach an asset to an issue and return the previously attached asset id. */
  attachAsset(
    issueId: string,
    kind: MediaAssetKind,
    assetId: string | null,
  ): Promise<{ issue: MagazineIssueRecord; replacedAssetId: string | null }>;

  deleteAsset(assetId: string): Promise<void>;
}
