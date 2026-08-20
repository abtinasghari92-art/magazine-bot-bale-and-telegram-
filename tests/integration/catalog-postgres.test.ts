import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  archiveIssue,
  createIssue,
  getArchiveFacets,
  getCurrentIssue,
  getPublishedIssue,
  listArchive,
  listIssuesForAdmin,
  parseAdminIssueQuery,
  parseCatalogQuery,
  setCurrentIssue,
  setIssuePublished,
  type MagazineIssueRecord,
} from "@/modules/catalog";
import { PrismaCatalogRepository } from "@/server/repositories/catalog-repository";

/**
 * The catalog rules against real PostgreSQL, so the Prisma queries themselves
 * are covered: `mode: "insensitive"` search, the keyset cursor, the `groupBy`
 * facets, and the advisory-locked transaction behind the current issue.
 *
 *   TEST_DATABASE_URL=postgresql://... npm test
 *
 * Point it at a throwaway database — the suite writes and deletes rows.
 */
const DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!DATABASE_URL)("catalog against PostgreSQL", () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: DATABASE_URL ?? "" } },
  });
  const repository = new PrismaCatalogRepository(prisma);

  // Issue numbers unique to this run so parallel runs do not collide. The
  // schema caps an issue number at 100_000, and this suite adds offsets up to
  // +203, so the base has to leave that much headroom.
  const base = 10_000 + Math.floor(Math.random() * 89_000);
  const slugPrefix = `it-${base}`;
  const createdIssueIds: string[] = [];

  function seed(overrides: Record<string, unknown> = {}) {
    return {
      issueNumber: base,
      title: "شماره یکپارچه",
      slug: `${slugPrefix}-a`,
      publicationDate: "2026-03-21",
      description: null,
      tableOfContents: [],
      priceIrr: 500_000,
      stock: 5,
      year: 1405,
      season: null,
      topic: null,
      previewPageLimit: null,
      ...overrides,
    };
  }

  async function makeIssue(overrides: Record<string, unknown> = {}) {
    const issue = await createIssue(repository, seed(overrides));
    createdIssueIds.push(issue.id);
    return issue;
  }

  async function makePublished(overrides: Record<string, unknown> = {}) {
    const issue = await makeIssue(overrides);
    return setIssuePublished(repository, issue.id, true);
  }

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    if (createdIssueIds.length > 0) {
      await prisma.magazineIssue.deleteMany({ where: { id: { in: createdIssueIds } } });
    }
    await prisma.$disconnect();
  });

  it("enforces a unique issue number at the database level", async () => {
    await makeIssue({ issueNumber: base + 1, slug: `${slugPrefix}-dup1` });

    await expect(
      createIssue(repository, seed({ issueNumber: base + 1, slug: `${slugPrefix}-dup2` })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("enforces a unique slug at the database level", async () => {
    await makeIssue({ issueNumber: base + 2, slug: `${slugPrefix}-uniq` });

    await expect(
      createIssue(repository, seed({ issueNumber: base + 3, slug: `${slugPrefix}-uniq` })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("keeps exactly one current issue across repeated designations", async () => {
    const first = await makePublished({ issueNumber: base + 10, slug: `${slugPrefix}-c1` });
    const second = await makePublished({ issueNumber: base + 11, slug: `${slugPrefix}-c2` });

    await setCurrentIssue(repository, first.id);
    await setCurrentIssue(repository, second.id);

    const currentCount = await prisma.magazineIssue.count({ where: { isCurrent: true } });
    expect(currentCount).toBe(1);

    const current = await getCurrentIssue(repository);
    expect(current?.id).toBe(second.id);
  });

  it("serializes concurrent current-issue designations", async () => {
    const a = await makePublished({ issueNumber: base + 20, slug: `${slugPrefix}-r1` });
    const b = await makePublished({ issueNumber: base + 21, slug: `${slugPrefix}-r2` });
    const c = await makePublished({ issueNumber: base + 22, slug: `${slugPrefix}-r3` });

    // The advisory lock must hold even when three requests race.
    await Promise.all([
      setCurrentIssue(repository, a.id),
      setCurrentIssue(repository, b.id),
      setCurrentIssue(repository, c.id),
    ]);

    expect(await prisma.magazineIssue.count({ where: { isCurrent: true } })).toBe(1);
  });

  it("hides an unpublished issue from the public slug lookup", async () => {
    await makeIssue({ issueNumber: base + 30, slug: `${slugPrefix}-draft` });

    await expect(getPublishedIssue(repository, `${slugPrefix}-draft`)).rejects.toBeInstanceOf(
      NotFoundError,
    );

    // The admin listing still sees it.
    const adminPage = await listIssuesForAdmin(
      repository,
      parseAdminIssueQuery({ q: String(base + 30) }),
    );
    expect(adminPage.items.map((i) => i.slug)).toContain(`${slugPrefix}-draft`);
  });

  it("hides an archived issue from the public slug lookup", async () => {
    const issue = await makePublished({ issueNumber: base + 31, slug: `${slugPrefix}-arch` });
    await archiveIssue(repository, issue.id);

    await expect(getPublishedIssue(repository, `${slugPrefix}-arch`)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    // Archiving must not destroy the row.
    expect(await prisma.magazineIssue.findUnique({ where: { id: issue.id } })).not.toBeNull();
  });

  describe("search, filters and paging", () => {
    let seeded: MagazineIssueRecord[] = [];

    beforeAll(async () => {
      seeded = [
        await makePublished({
          issueNumber: base + 100,
          slug: `${slugPrefix}-s1`,
          title: "فناوری و آینده",
          year: 1404,
          season: "SPRING",
          topic: "فناوری",
        }),
        await makePublished({
          issueNumber: base + 101,
          slug: `${slugPrefix}-s2`,
          title: "هنر معاصر ایران",
          year: 1404,
          season: "SUMMER",
          topic: "هنر",
        }),
        await makePublished({
          issueNumber: base + 102,
          slug: `${slugPrefix}-s3`,
          title: "فناوری در صنعت",
          year: 1405,
          season: "AUTUMN",
          topic: "فناوری",
        }),
        await makePublished({
          issueNumber: base + 103,
          slug: `${slugPrefix}-s4`,
          title: "Design Weekly",
          year: 1405,
          season: "WINTER",
          topic: "هنر",
        }),
      ];
    });

    /** Restrict assertions to this run's rows, since the table is shared. */
    function ours(items: MagazineIssueRecord[]): number[] {
      const ids = new Set(seeded.map((issue) => issue.id));
      return items.filter((issue) => ids.has(issue.id)).map((issue) => issue.issueNumber);
    }

    it("searches by a word in the title", async () => {
      const page = await listArchive(repository, parseCatalogQuery({ q: "فناوری", limit: "24" }));
      expect(ours(page.items).sort()).toEqual([base + 100, base + 102]);
    });

    it("searches case-insensitively", async () => {
      const page = await listArchive(repository, parseCatalogQuery({ q: "design", limit: "24" }));
      expect(ours(page.items)).toEqual([base + 103]);
    });

    it("searches by exact issue number", async () => {
      const page = await listArchive(repository, parseCatalogQuery({ q: String(base + 102) }));
      expect(ours(page.items)).toEqual([base + 102]);
    });

    it("filters by year", async () => {
      const page = await listArchive(repository, parseCatalogQuery({ year: "1404", limit: "24" }));
      expect(ours(page.items).sort()).toEqual([base + 100, base + 101]);
    });

    it("filters by season", async () => {
      const page = await listArchive(
        repository,
        parseCatalogQuery({ season: "AUTUMN", limit: "24" }),
      );
      expect(ours(page.items)).toEqual([base + 102]);
    });

    it("filters by topic", async () => {
      const page = await listArchive(repository, parseCatalogQuery({ topic: "هنر", limit: "24" }));
      expect(ours(page.items).sort()).toEqual([base + 101, base + 103]);
    });

    it("combines search with every filter", async () => {
      const page = await listArchive(
        repository,
        parseCatalogQuery({
          q: "فناوری",
          year: "1405",
          season: "AUTUMN",
          topic: "فناوری",
          limit: "24",
        }),
      );
      expect(ours(page.items)).toEqual([base + 102]);
    });

    it("returns nothing when combined filters cannot all match", async () => {
      const page = await listArchive(
        repository,
        parseCatalogQuery({ year: "1404", season: "WINTER", topic: "فناوری", limit: "24" }),
      );
      expect(ours(page.items)).toEqual([]);
    });

    it("pages with a cursor without repeating a row", async () => {
      const seen: number[] = [];
      let cursor: string | undefined;
      let guard = 0;

      do {
        const page = await listArchive(
          repository,
          parseCatalogQuery({ topic: "فناوری", limit: "1", cursor }),
        );
        seen.push(...ours(page.items));
        cursor = page.nextCursor ?? undefined;
        guard += 1;
      } while (cursor && guard < 20);

      const mine = seen.filter((n) => n === base + 100 || n === base + 102);
      expect(mine).toHaveLength(2);
      expect(new Set(mine).size).toBe(2);
    });

    it("offers facets built from published rows only", async () => {
      const facets = await getArchiveFacets(repository);

      expect(facets.years).toContain(1404);
      expect(facets.years).toContain(1405);
      expect(facets.topics).toContain("فناوری");
      // Seasons come back in calendar order, not insertion order.
      const order = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];
      const positions = facets.seasons.map((s) => order.indexOf(s));
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    });
  });

  it("stores the price as an exact integer number of Rial", async () => {
    const issue = await makeIssue({
      issueNumber: base + 200,
      slug: `${slugPrefix}-price`,
      priceIrr: 1_234_560,
    });

    const row = await prisma.magazineIssue.findUnique({ where: { id: issue.id } });
    expect(row?.priceIrr).toBe(1_234_560);
    expect(Number.isInteger(row?.priceIrr)).toBe(true);
  });

  it("round-trips a table of contents through JSON", async () => {
    const issue = await makeIssue({
      issueNumber: base + 201,
      slug: `${slugPrefix}-toc`,
      tableOfContents: "سرمقاله | 3\nپرونده ماه",
    });

    const reloaded = await repository.findById(issue.id);
    expect(reloaded?.tableOfContents).toEqual([
      { title: "سرمقاله", page: 3 },
      { title: "پرونده ماه", page: null },
    ]);
  });

  it("keeps a zero-stock issue publicly visible", async () => {
    await makePublished({
      issueNumber: base + 202,
      slug: `${slugPrefix}-oos`,
      stock: 0,
    });

    const issue = await getPublishedIssue(repository, `${slugPrefix}-oos`);
    expect(issue.stock).toBe(0);
  });
});
