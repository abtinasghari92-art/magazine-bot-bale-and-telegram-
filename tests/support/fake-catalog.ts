import { decodeIssueCursor, encodeIssueCursor } from "@/modules/catalog";
import type { CatalogRepository, MediaAssetInput } from "@/modules/catalog";
import type {
  AdminIssueQuery,
  CatalogFacets,
  CatalogQuery,
  IssuePage,
  IssueSeason,
  IssueStatus,
  IssueWriteData,
  MagazineIssueRecord,
  MediaAssetKind,
  MediaAssetRecord,
} from "@/modules/catalog";

/**
 * In-memory `CatalogRepository`.
 *
 * It reproduces the ordering, keyset paging and status scoping of the Prisma
 * implementation so the service rules can be tested without a database. The
 * PostgreSQL integration suite covers the real queries.
 */

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

const ASSET_FIELD: Record<
  MediaAssetKind,
  "coverAssetId" | "previewPdfAssetId" | "digitalPdfAssetId"
> = {
  ISSUE_COVER: "coverAssetId",
  ISSUE_PREVIEW_PDF: "previewPdfAssetId",
  ISSUE_DIGITAL_PDF: "digitalPdfAssetId",
};

export function issueSeed(overrides: Partial<IssueWriteData> = {}): IssueWriteData {
  return {
    issueNumber: 1,
    title: "شماره آزمایشی",
    slug: "issue-1",
    publicationDate: new Date("2026-03-21T00:00:00.000Z"),
    description: null,
    tableOfContents: [],
    priceIrr: 500_000,
    stock: 10,
    year: 1405,
    season: null,
    topic: null,
    previewPageLimit: null,
    ...overrides,
  };
}

export class FakeCatalogRepository implements CatalogRepository {
  readonly issues = new Map<string, MagazineIssueRecord>();
  readonly assets = new Map<string, MediaAssetRecord>();

  private matches(issue: MagazineIssueRecord, query: CatalogQuery): boolean {
    if (query.year !== undefined && issue.year !== query.year) return false;
    if (query.season !== undefined && issue.season !== query.season) return false;
    if (query.topic !== undefined && issue.topic !== query.topic) return false;

    if (query.search) {
      const search = query.search;
      const titleHit = issue.title.toLowerCase().includes(search.toLowerCase());
      const numberHit =
        /^\d{1,7}$/.test(search) && issue.issueNumber === Number.parseInt(search, 10);
      if (!titleHit && !numberHit) return false;
    }

    return true;
  }

  private page(pool: MagazineIssueRecord[], query: CatalogQuery): IssuePage {
    const ascending = query.sort === "oldest";
    const cursor = decodeIssueCursor(query.cursor);

    const filtered = pool
      .filter((issue) => this.matches(issue, query))
      .filter((issue) => {
        if (cursor === null) return true;
        return ascending ? issue.issueNumber > cursor : issue.issueNumber < cursor;
      })
      .sort((a, b) =>
        ascending ? a.issueNumber - b.issueNumber : b.issueNumber - a.issueNumber,
      );

    const hasMore = filtered.length > query.limit;
    const items = filtered.slice(0, query.limit).map((issue) => ({ ...issue }));
    const last = items[items.length - 1];

    return {
      items,
      nextCursor: hasMore && last ? encodeIssueCursor(last.issueNumber) : null,
    };
  }

  async listPublished(query: CatalogQuery): Promise<IssuePage> {
    const published = [...this.issues.values()].filter((issue) => issue.status === "PUBLISHED");
    return this.page(published, query);
  }

  async listAll(query: AdminIssueQuery): Promise<IssuePage> {
    const pool = [...this.issues.values()].filter(
      (issue) => !query.status || issue.status === query.status,
    );
    return this.page(pool, query);
  }

  async findPublishedBySlug(slug: string): Promise<MagazineIssueRecord | null> {
    for (const issue of this.issues.values()) {
      if (issue.slug === slug && issue.status === "PUBLISHED") return { ...issue };
    }
    return null;
  }

  async findCurrentPublished(): Promise<MagazineIssueRecord | null> {
    const published = [...this.issues.values()].filter((issue) => issue.status === "PUBLISHED");
    const designated = published.find((issue) => issue.isCurrent);
    if (designated) return { ...designated };

    const latest = published.sort((a, b) => b.issueNumber - a.issueNumber)[0];
    return latest ? { ...latest } : null;
  }

  async publishedFacets(): Promise<CatalogFacets> {
    const published = [...this.issues.values()].filter((issue) => issue.status === "PUBLISHED");
    const order: IssueSeason[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];
    const seasons = new Set(
      published.map((issue) => issue.season).filter((s): s is IssueSeason => s !== null),
    );

    return {
      years: [...new Set(published.map((issue) => issue.year))].sort((a, b) => b - a),
      seasons: order.filter((season) => seasons.has(season)),
      topics: [
        ...new Set(published.map((issue) => issue.topic).filter((t): t is string => t !== null)),
      ].sort(),
    };
  }

  async findById(issueId: string): Promise<MagazineIssueRecord | null> {
    const issue = this.issues.get(issueId);
    return issue ? { ...issue } : null;
  }

  async findByIssueNumber(issueNumber: number): Promise<MagazineIssueRecord | null> {
    for (const issue of this.issues.values()) {
      if (issue.issueNumber === issueNumber) return { ...issue };
    }
    return null;
  }

  async findBySlug(slug: string): Promise<MagazineIssueRecord | null> {
    for (const issue of this.issues.values()) {
      if (issue.slug === slug) return { ...issue };
    }
    return null;
  }

  async create(data: IssueWriteData): Promise<MagazineIssueRecord> {
    const now = new Date();
    const issue: MagazineIssueRecord = {
      id: nextId("issue"),
      ...data,
      status: "DRAFT",
      isCurrent: false,
      publishedAt: null,
      archivedAt: null,
      coverAssetId: null,
      previewPdfAssetId: null,
      digitalPdfAssetId: null,
      createdAt: now,
      updatedAt: now,
    };
    this.issues.set(issue.id, issue);
    return { ...issue };
  }

  async update(issueId: string, data: Partial<IssueWriteData>): Promise<MagazineIssueRecord> {
    const existing = this.issues.get(issueId);
    if (!existing) throw new Error(`no issue ${issueId}`);
    const updated = { ...existing, ...data, updatedAt: new Date() };
    this.issues.set(issueId, updated);
    return { ...updated };
  }

  async setStatus(
    issueId: string,
    status: IssueStatus,
    timestamps: { publishedAt?: Date | null; archivedAt?: Date | null },
  ): Promise<MagazineIssueRecord> {
    const existing = this.issues.get(issueId);
    if (!existing) throw new Error(`no issue ${issueId}`);

    const updated: MagazineIssueRecord = {
      ...existing,
      status,
      updatedAt: new Date(),
      ...(timestamps.publishedAt !== undefined ? { publishedAt: timestamps.publishedAt } : {}),
      ...(timestamps.archivedAt !== undefined ? { archivedAt: timestamps.archivedAt } : {}),
    };
    this.issues.set(issueId, updated);
    return { ...updated };
  }

  /** Mirrors the transactional "clear everywhere, then set one" of the real one. */
  async setCurrent(issueId: string | null): Promise<MagazineIssueRecord | null> {
    for (const [id, issue] of this.issues) {
      if (issue.isCurrent) this.issues.set(id, { ...issue, isCurrent: false });
    }
    if (!issueId) return null;

    const target = this.issues.get(issueId);
    if (!target) throw new Error(`no issue ${issueId}`);
    const updated = { ...target, isCurrent: true, updatedAt: new Date() };
    this.issues.set(issueId, updated);
    return { ...updated };
  }

  async createAsset(input: MediaAssetInput): Promise<MediaAssetRecord> {
    const now = new Date();
    const asset: MediaAssetRecord = {
      id: nextId("asset"),
      kind: input.kind,
      provider: input.provider,
      bucket: input.bucket,
      objectKey: input.objectKey,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      checksum: input.checksum,
      originalFilename: input.originalFilename,
      width: input.width ?? null,
      height: input.height ?? null,
      pageCount: input.pageCount ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.assets.set(asset.id, asset);
    return { ...asset };
  }

  async findAssetById(assetId: string): Promise<MediaAssetRecord | null> {
    const asset = this.assets.get(assetId);
    return asset ? { ...asset } : null;
  }

  async attachAsset(
    issueId: string,
    kind: MediaAssetKind,
    assetId: string | null,
  ): Promise<{ issue: MagazineIssueRecord; replacedAssetId: string | null }> {
    const existing = this.issues.get(issueId);
    if (!existing) throw new Error(`no issue ${issueId}`);

    const field = ASSET_FIELD[kind];
    const replacedAssetId = existing[field];
    const updated = { ...existing, [field]: assetId, updatedAt: new Date() };
    this.issues.set(issueId, updated);

    return { issue: { ...updated }, replacedAssetId };
  }

  async deleteAsset(assetId: string): Promise<void> {
    this.assets.delete(assetId);
  }
}
