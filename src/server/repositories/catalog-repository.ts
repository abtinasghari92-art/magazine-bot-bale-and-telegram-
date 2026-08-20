import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

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
  TocEntry,
} from "@/modules/catalog";

type IssueRow = Prisma.MagazineIssueGetPayload<Record<string, never>>;
type AssetRow = Prisma.MediaAssetGetPayload<Record<string, never>>;

/** Column each asset kind hangs off. Keeps the mapping in exactly one place. */
const ASSET_FIELD: Record<MediaAssetKind, "coverAssetId" | "previewPdfAssetId" | "digitalPdfAssetId"> =
  {
    ISSUE_COVER: "coverAssetId",
    ISSUE_PREVIEW_PDF: "previewPdfAssetId",
    ISSUE_DIGITAL_PDF: "digitalPdfAssetId",
  };

/** Stored JSON is validated on the way out; a bad row degrades to an empty list. */
function toTocEntries(value: Prisma.JsonValue | null): TocEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: TocEntry[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.title !== "string" || record.title.trim().length === 0) continue;
    const page = typeof record.page === "number" && Number.isInteger(record.page) ? record.page : null;
    entries.push({ title: record.title, page });
  }
  return entries;
}

function toIssue(row: IssueRow): MagazineIssueRecord {
  return {
    id: row.id,
    issueNumber: row.issueNumber,
    title: row.title,
    slug: row.slug,
    publicationDate: row.publicationDate,
    description: row.description,
    tableOfContents: toTocEntries(row.tableOfContents),
    priceIrr: row.priceIrr,
    stock: row.stock,
    status: row.status as IssueStatus,
    isCurrent: row.isCurrent,
    year: row.year,
    season: (row.season as IssueSeason | null) ?? null,
    topic: row.topic,
    previewPageLimit: row.previewPageLimit,
    publishedAt: row.publishedAt,
    archivedAt: row.archivedAt,
    coverAssetId: row.coverAssetId,
    previewPdfAssetId: row.previewPdfAssetId,
    digitalPdfAssetId: row.digitalPdfAssetId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toAsset(row: AssetRow): MediaAssetRecord {
  return {
    id: row.id,
    kind: row.kind as MediaAssetKind,
    provider: row.provider,
    bucket: row.bucket,
    objectKey: row.objectKey,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    checksum: row.checksum,
    originalFilename: row.originalFilename,
    width: row.width,
    height: row.height,
    pageCount: row.pageCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toWriteData(data: Partial<IssueWriteData>): Prisma.MagazineIssueUpdateInput {
  const update: Prisma.MagazineIssueUpdateInput = {};
  if (data.issueNumber !== undefined) update.issueNumber = data.issueNumber;
  if (data.title !== undefined) update.title = data.title;
  if (data.slug !== undefined) update.slug = data.slug;
  if (data.publicationDate !== undefined) update.publicationDate = data.publicationDate;
  if (data.description !== undefined) update.description = data.description;
  if (data.tableOfContents !== undefined) {
    update.tableOfContents = data.tableOfContents as unknown as Prisma.InputJsonValue;
  }
  if (data.priceIrr !== undefined) update.priceIrr = data.priceIrr;
  if (data.stock !== undefined) update.stock = data.stock;
  if (data.year !== undefined) update.year = data.year;
  if (data.season !== undefined) update.season = data.season;
  if (data.topic !== undefined) update.topic = data.topic;
  if (data.previewPageLimit !== undefined) update.previewPageLimit = data.previewPageLimit;
  return update;
}

/**
 * Search and filter clause (REQ-012 / REQ-013).
 *
 * All of it is expressed through Prisma's typed query builder — no string is
 * ever concatenated into SQL. A numeric query also matches the issue number
 * exactly, which is the fastest lookup we have.
 */
function buildFilters(query: CatalogQuery): Prisma.MagazineIssueWhereInput[] {
  const filters: Prisma.MagazineIssueWhereInput[] = [];

  if (query.year !== undefined) filters.push({ year: query.year });
  if (query.season !== undefined) filters.push({ season: query.season });
  if (query.topic !== undefined) filters.push({ topic: query.topic });

  if (query.search) {
    const search = query.search;
    const or: Prisma.MagazineIssueWhereInput[] = [
      { title: { contains: search, mode: "insensitive" } },
    ];
    if (/^\d{1,7}$/.test(search)) {
      or.push({ issueNumber: Number.parseInt(search, 10) });
    }
    filters.push({ OR: or });
  }

  const cursorValue = decodeIssueCursor(query.cursor);
  if (cursorValue !== null) {
    filters.push(
      query.sort === "oldest"
        ? { issueNumber: { gt: cursorValue } }
        : { issueNumber: { lt: cursorValue } },
    );
  }

  return filters;
}

/** PostgreSQL implementation of the catalog port (REQ-048). */
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async page(
    where: Prisma.MagazineIssueWhereInput,
    query: CatalogQuery,
  ): Promise<IssuePage> {
    const rows = await this.prisma.magazineIssue.findMany({
      where,
      orderBy: { issueNumber: query.sort === "oldest" ? "asc" : "desc" },
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const items = (hasMore ? rows.slice(0, query.limit) : rows).map(toIssue);
    const last = items[items.length - 1];

    return {
      items,
      nextCursor: hasMore && last ? encodeIssueCursor(last.issueNumber) : null,
    };
  }

  async listPublished(query: CatalogQuery): Promise<IssuePage> {
    return this.page({ AND: [{ status: "PUBLISHED" }, ...buildFilters(query)] }, query);
  }

  async listAll(query: AdminIssueQuery): Promise<IssuePage> {
    const filters = buildFilters(query);
    if (query.status) filters.push({ status: query.status });
    return this.page(filters.length > 0 ? { AND: filters } : {}, query);
  }

  async findPublishedBySlug(slug: string): Promise<MagazineIssueRecord | null> {
    const row = await this.prisma.magazineIssue.findFirst({
      where: { slug, status: "PUBLISHED" },
    });
    return row ? toIssue(row) : null;
  }

  async findCurrentPublished(): Promise<MagazineIssueRecord | null> {
    const designated = await this.prisma.magazineIssue.findFirst({
      where: { isCurrent: true, status: "PUBLISHED" },
    });
    if (designated) return toIssue(designated);

    const latest = await this.prisma.magazineIssue.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { issueNumber: "desc" },
    });
    return latest ? toIssue(latest) : null;
  }

  async publishedFacets(): Promise<CatalogFacets> {
    const where = { status: "PUBLISHED" as const };

    const [years, seasons, topics] = await Promise.all([
      this.prisma.magazineIssue.groupBy({
        by: ["year"],
        where,
        orderBy: { year: "desc" },
      }),
      this.prisma.magazineIssue.groupBy({
        by: ["season"],
        where: { ...where, season: { not: null } },
      }),
      this.prisma.magazineIssue.groupBy({
        by: ["topic"],
        where: { ...where, topic: { not: null } },
        orderBy: { topic: "asc" },
      }),
    ]);

    const seasonOrder: IssueSeason[] = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];
    const presentSeasons = new Set(
      seasons.map((row) => row.season).filter((season): season is IssueSeason => season !== null),
    );

    return {
      years: years.map((row) => row.year),
      seasons: seasonOrder.filter((season) => presentSeasons.has(season)),
      topics: topics
        .map((row) => row.topic)
        .filter((topic): topic is string => typeof topic === "string" && topic.length > 0),
    };
  }

  async findById(issueId: string): Promise<MagazineIssueRecord | null> {
    const row = await this.prisma.magazineIssue.findUnique({ where: { id: issueId } });
    return row ? toIssue(row) : null;
  }

  async findByIssueNumber(issueNumber: number): Promise<MagazineIssueRecord | null> {
    const row = await this.prisma.magazineIssue.findUnique({ where: { issueNumber } });
    return row ? toIssue(row) : null;
  }

  async findBySlug(slug: string): Promise<MagazineIssueRecord | null> {
    const row = await this.prisma.magazineIssue.findUnique({ where: { slug } });
    return row ? toIssue(row) : null;
  }

  async create(data: IssueWriteData): Promise<MagazineIssueRecord> {
    const row = await this.prisma.magazineIssue.create({
      data: {
        issueNumber: data.issueNumber,
        title: data.title,
        slug: data.slug,
        publicationDate: data.publicationDate,
        description: data.description,
        tableOfContents: data.tableOfContents as unknown as Prisma.InputJsonValue,
        priceIrr: data.priceIrr,
        stock: data.stock,
        year: data.year,
        season: data.season,
        topic: data.topic,
        previewPageLimit: data.previewPageLimit,
      },
    });
    return toIssue(row);
  }

  async update(issueId: string, data: Partial<IssueWriteData>): Promise<MagazineIssueRecord> {
    const row = await this.prisma.magazineIssue.update({
      where: { id: issueId },
      data: toWriteData(data),
    });
    return toIssue(row);
  }

  async setStatus(
    issueId: string,
    status: IssueStatus,
    timestamps: { publishedAt?: Date | null; archivedAt?: Date | null },
  ): Promise<MagazineIssueRecord> {
    const row = await this.prisma.magazineIssue.update({
      where: { id: issueId },
      data: {
        status,
        ...(timestamps.publishedAt !== undefined ? { publishedAt: timestamps.publishedAt } : {}),
        ...(timestamps.archivedAt !== undefined ? { archivedAt: timestamps.archivedAt } : {}),
        ...(status === "PUBLISHED" ? {} : { isCurrent: false }),
      },
    });
    return toIssue(row);
  }

  /**
   * Exactly one current issue (REQ-010).
   *
   * The advisory lock matters: two concurrent "make this current" calls could
   * otherwise both clear an empty set and then both set their own flag. The
   * lock is transaction-scoped and released on commit or rollback.
   */
  async setCurrent(issueId: string | null): Promise<MagazineIssueRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('magazine_issue_current'))`;
      await tx.magazineIssue.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      if (!issueId) return null;
      const row = await tx.magazineIssue.update({
        where: { id: issueId },
        data: { isCurrent: true },
      });
      return toIssue(row);
    });
  }

  async createAsset(input: MediaAssetInput): Promise<MediaAssetRecord> {
    const row = await this.prisma.mediaAsset.create({
      data: {
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
      },
    });
    return toAsset(row);
  }

  async findAssetById(assetId: string): Promise<MediaAssetRecord | null> {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    return row ? toAsset(row) : null;
  }

  async attachAsset(
    issueId: string,
    kind: MediaAssetKind,
    assetId: string | null,
  ): Promise<{ issue: MagazineIssueRecord; replacedAssetId: string | null }> {
    const field = ASSET_FIELD[kind];

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.magazineIssue.findUnique({ where: { id: issueId } });
      const replacedAssetId = existing ? existing[field] : null;

      const row = await tx.magazineIssue.update({
        where: { id: issueId },
        data: { [field]: assetId } as Prisma.MagazineIssueUpdateInput,
      });

      return { issue: toIssue(row), replacedAssetId };
    });
  }

  async deleteAsset(assetId: string): Promise<void> {
    await this.prisma.mediaAsset.deleteMany({ where: { id: assetId } });
  }
}
