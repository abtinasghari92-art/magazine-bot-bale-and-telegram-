import { describe, expect, it } from "vitest";

import { ConflictError, NotFoundError } from "@/lib/errors";
import { ValidationError } from "@/lib/validation";
import {
  archiveIssue,
  createIssue,
  getArchiveFacets,
  getCurrentIssue,
  getPublishedIssue,
  isPurchasable,
  listArchive,
  listIssuesForAdmin,
  parseAdminIssueQuery,
  parseCatalogQuery,
  previewPageLimitFor,
  restoreIssue,
  setCurrentIssue,
  setIssuePublished,
  updateIssue,
  MAX_ARCHIVE_PAGE_SIZE,
  type MagazineIssueRecord,
} from "@/modules/catalog";

import { FakeCatalogRepository, issueSeed } from "./support/fake-catalog";

/** Create an issue and publish it in one step. */
async function publishedIssue(
  repository: FakeCatalogRepository,
  overrides: Parameters<typeof issueSeed>[0] = {},
): Promise<MagazineIssueRecord> {
  const issue = await createIssue(repository, issueSeed(overrides));
  return setIssuePublished(repository, issue.id, true);
}

describe("current issue (REQ-010)", () => {
  it("keeps exactly one issue designated as current", async () => {
    const repository = new FakeCatalogRepository();
    const first = await publishedIssue(repository, { issueNumber: 1, slug: "issue-1" });
    const second = await publishedIssue(repository, { issueNumber: 2, slug: "issue-2" });
    const third = await publishedIssue(repository, { issueNumber: 3, slug: "issue-3" });

    await setCurrentIssue(repository, first.id);
    await setCurrentIssue(repository, second.id);
    await setCurrentIssue(repository, third.id);

    const current = [...repository.issues.values()].filter((issue) => issue.isCurrent);
    expect(current).toHaveLength(1);
    expect(current[0]?.id).toBe(third.id);
  });

  it("refuses to make an unpublished issue current", async () => {
    const repository = new FakeCatalogRepository();
    const draft = await createIssue(repository, issueSeed());

    await expect(setCurrentIssue(repository, draft.id)).rejects.toBeInstanceOf(ConflictError);
    expect(repository.issues.get(draft.id)?.isCurrent).toBe(false);
  });

  it("releases the current flag when the issue is unpublished", async () => {
    const repository = new FakeCatalogRepository();
    const issue = await publishedIssue(repository);
    await setCurrentIssue(repository, issue.id);

    await setIssuePublished(repository, issue.id, false);

    expect(repository.issues.get(issue.id)?.isCurrent).toBe(false);
    // Home must not fall back to hidden content either.
    expect(await getCurrentIssue(repository)).toBeNull();
  });

  it("releases the current flag when the issue is archived", async () => {
    const repository = new FakeCatalogRepository();
    const issue = await publishedIssue(repository);
    await setCurrentIssue(repository, issue.id);

    await archiveIssue(repository, issue.id);

    expect(repository.issues.get(issue.id)?.isCurrent).toBe(false);
  });

  it("falls back to the newest published issue when none is designated", async () => {
    const repository = new FakeCatalogRepository();
    await publishedIssue(repository, { issueNumber: 4, slug: "issue-4" });
    await publishedIssue(repository, { issueNumber: 9, slug: "issue-9" });
    await publishedIssue(repository, { issueNumber: 7, slug: "issue-7" });

    expect((await getCurrentIssue(repository))?.issueNumber).toBe(9);
  });

  it("never returns a draft as the home issue", async () => {
    const repository = new FakeCatalogRepository();
    await createIssue(repository, issueSeed({ issueNumber: 12, slug: "issue-12" }));

    expect(await getCurrentIssue(repository)).toBeNull();
  });
});

describe("public access to unpublished issues (REQ-011)", () => {
  it("hides a draft issue behind the same 404 a missing slug gets", async () => {
    const repository = new FakeCatalogRepository();
    await createIssue(repository, issueSeed({ slug: "secret-issue" }));

    await expect(getPublishedIssue(repository, "secret-issue")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(getPublishedIssue(repository, "does-not-exist")).rejects.toBeInstanceOf(
      NotFoundError,
    );

    // Identical public message: guessing a slug must not confirm it exists.
    const draftError = await getPublishedIssue(repository, "secret-issue").catch((e) => e);
    const missingError = await getPublishedIssue(repository, "does-not-exist").catch((e) => e);
    expect(draftError.publicMessage).toBe(missingError.publicMessage);
  });

  it("hides an archived issue from the public lookup", async () => {
    const repository = new FakeCatalogRepository();
    const issue = await publishedIssue(repository, { slug: "retired" });
    await archiveIssue(repository, issue.id);

    await expect(getPublishedIssue(repository, "retired")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("keeps drafts and archived issues out of the archive listing", async () => {
    const repository = new FakeCatalogRepository();
    await publishedIssue(repository, { issueNumber: 1, slug: "issue-1" });
    await createIssue(repository, issueSeed({ issueNumber: 2, slug: "issue-2" }));
    const retired = await publishedIssue(repository, { issueNumber: 3, slug: "issue-3" });
    await archiveIssue(repository, retired.id);

    const page = await listArchive(repository, parseCatalogQuery({}));

    expect(page.items.map((issue) => issue.issueNumber)).toEqual([1]);
  });

  it("serves an issue again once it is restored and republished", async () => {
    const repository = new FakeCatalogRepository();
    const issue = await publishedIssue(repository, { slug: "comeback" });
    await archiveIssue(repository, issue.id);
    await restoreIssue(repository, issue.id);

    await expect(getPublishedIssue(repository, "comeback")).rejects.toBeInstanceOf(NotFoundError);

    await setIssuePublished(repository, issue.id, true);
    expect((await getPublishedIssue(repository, "comeback")).slug).toBe("comeback");
  });
});

describe("archive pagination (REQ-012)", () => {
  async function seedIssues(repository: FakeCatalogRepository, count: number) {
    for (let number = 1; number <= count; number += 1) {
      await publishedIssue(repository, {
        issueNumber: number,
        slug: `issue-${number}`,
        title: `شماره ${number}`,
      });
    }
  }

  it("pages through the catalog with a cursor and no repeats or gaps", async () => {
    const repository = new FakeCatalogRepository();
    await seedIssues(repository, 25);

    const seen: number[] = [];
    let cursor: string | undefined;
    let pages = 0;

    do {
      const page = await listArchive(repository, parseCatalogQuery({ limit: "10", cursor }));
      seen.push(...page.items.map((issue) => issue.issueNumber));
      cursor = page.nextCursor ?? undefined;
      pages += 1;
      expect(page.items.length).toBeLessThanOrEqual(10);
    } while (cursor && pages < 10);

    expect(pages).toBe(3);
    expect(seen).toHaveLength(25);
    expect(new Set(seen).size).toBe(25);
    // Newest first by default.
    expect(seen[0]).toBe(25);
    expect(seen.at(-1)).toBe(1);
  });

  it("does not return the whole catalog on the first request", async () => {
    const repository = new FakeCatalogRepository();
    await seedIssues(repository, 40);

    const page = await listArchive(repository, parseCatalogQuery({}));

    expect(page.items.length).toBe(12);
    expect(page.nextCursor).not.toBeNull();
  });

  it("caps an oversized limit instead of honouring it", async () => {
    const repository = new FakeCatalogRepository();
    await seedIssues(repository, 40);

    // A caller asking for 1000 rows must not get them.
    expect(() => parseCatalogQuery({ limit: "1000" })).toThrow(ValidationError);
    const page = await listArchive(
      repository,
      parseCatalogQuery({ limit: String(MAX_ARCHIVE_PAGE_SIZE) }),
    );
    expect(page.items.length).toBe(MAX_ARCHIVE_PAGE_SIZE);
  });

  it("ignores a cursor it did not issue", async () => {
    const repository = new FakeCatalogRepository();
    await seedIssues(repository, 5);

    const page = await listArchive(
      repository,
      parseCatalogQuery({ cursor: "not-a-real-cursor" }),
    );

    expect(page.items).toHaveLength(5);
  });

  it("supports oldest-first paging", async () => {
    const repository = new FakeCatalogRepository();
    await seedIssues(repository, 5);

    const page = await listArchive(repository, parseCatalogQuery({ sort: "oldest", limit: "3" }));

    expect(page.items.map((issue) => issue.issueNumber)).toEqual([1, 2, 3]);
  });
});

describe("archive search and filters (REQ-012 / REQ-013)", () => {
  async function seedCatalog(repository: FakeCatalogRepository) {
    await publishedIssue(repository, {
      issueNumber: 101,
      slug: "spring-tech",
      title: "فناوری و آینده",
      year: 1404,
      season: "SPRING",
      topic: "فناوری",
    });
    await publishedIssue(repository, {
      issueNumber: 102,
      slug: "summer-art",
      title: "هنر معاصر ایران",
      year: 1404,
      season: "SUMMER",
      topic: "هنر",
    });
    await publishedIssue(repository, {
      issueNumber: 103,
      slug: "autumn-tech",
      title: "فناوری در صنعت",
      year: 1405,
      season: "AUTUMN",
      topic: "فناوری",
    });
    await publishedIssue(repository, {
      issueNumber: 104,
      slug: "winter-art",
      title: "هنر و جامعه",
      year: 1405,
      season: "WINTER",
      topic: "هنر",
    });
  }

  it("finds issues by a word in the title", async () => {
    const repository = new FakeCatalogRepository();
    await seedCatalog(repository);

    const page = await listArchive(repository, parseCatalogQuery({ q: "فناوری" }));

    expect(page.items.map((issue) => issue.issueNumber).sort()).toEqual([101, 103]);
  });

  it("finds an issue by its issue number", async () => {
    const repository = new FakeCatalogRepository();
    await seedCatalog(repository);

    const page = await listArchive(repository, parseCatalogQuery({ q: "103" }));

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.issueNumber).toBe(103);
  });

  it("accepts Persian digits in an issue-number search", async () => {
    const repository = new FakeCatalogRepository();
    await seedCatalog(repository);

    const page = await listArchive(repository, parseCatalogQuery({ q: "۱۰۴" }));

    expect(page.items[0]?.issueNumber).toBe(104);
  });

  it("filters by year", async () => {
    const repository = new FakeCatalogRepository();
    await seedCatalog(repository);

    const page = await listArchive(repository, parseCatalogQuery({ year: "1405" }));

    expect(page.items.map((issue) => issue.issueNumber).sort()).toEqual([103, 104]);
  });

  it("filters by season", async () => {
    const repository = new FakeCatalogRepository();
    await seedCatalog(repository);

    const page = await listArchive(repository, parseCatalogQuery({ season: "SUMMER" }));

    expect(page.items.map((issue) => issue.issueNumber)).toEqual([102]);
  });

  it("filters by topic", async () => {
    const repository = new FakeCatalogRepository();
    await seedCatalog(repository);

    const page = await listArchive(repository, parseCatalogQuery({ topic: "هنر" }));

    expect(page.items.map((issue) => issue.issueNumber).sort()).toEqual([102, 104]);
  });

  it("combines search and every filter with AND semantics", async () => {
    const repository = new FakeCatalogRepository();
    await seedCatalog(repository);

    const page = await listArchive(
      repository,
      parseCatalogQuery({ q: "فناوری", year: "1405", season: "AUTUMN", topic: "فناوری" }),
    );

    expect(page.items.map((issue) => issue.issueNumber)).toEqual([103]);
  });

  it("returns nothing when combined filters cannot all match", async () => {
    const repository = new FakeCatalogRepository();
    await seedCatalog(repository);

    const page = await listArchive(
      repository,
      parseCatalogQuery({ year: "1404", season: "WINTER" }),
    );

    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it("offers facets drawn only from published issues", async () => {
    const repository = new FakeCatalogRepository();
    await seedCatalog(repository);
    await createIssue(
      repository,
      issueSeed({ issueNumber: 900, slug: "hidden", year: 1399, topic: "محرمانه" }),
    );

    const facets = await getArchiveFacets(repository);

    expect(facets.years).toEqual([1405, 1404]);
    expect(facets.years).not.toContain(1399);
    expect(facets.topics).not.toContain("محرمانه");
    expect(facets.seasons).toEqual(["SPRING", "SUMMER", "AUTUMN", "WINTER"]);
  });
});

describe("stock (REQ-011)", () => {
  it("marks a zero-stock issue as not purchasable but still visible", async () => {
    const repository = new FakeCatalogRepository();
    const issue = await publishedIssue(repository, { slug: "sold-out", stock: 0 });

    expect(issue.stock).toBe(0);
    expect(isPurchasable(issue)).toBe(false);

    // Out of stock is a display state, not a reason to hide the issue.
    const found = await getPublishedIssue(repository, "sold-out");
    expect(found.slug).toBe("sold-out");

    const page = await listArchive(repository, parseCatalogQuery({}));
    expect(page.items.map((i) => i.slug)).toContain("sold-out");
  });

  it("treats a published, in-stock issue as purchasable", async () => {
    const repository = new FakeCatalogRepository();
    const issue = await publishedIssue(repository, { stock: 3 });

    expect(isPurchasable(issue)).toBe(true);
  });

  it("never treats an unpublished issue as purchasable, whatever its stock", async () => {
    const repository = new FakeCatalogRepository();
    const draft = await createIssue(repository, issueSeed({ stock: 99 }));

    expect(isPurchasable(draft)).toBe(false);
  });
});

describe("catalog input validation (REQ-048)", () => {
  it("rejects a price that is not an integer number of Rial", async () => {
    const repository = new FakeCatalogRepository();

    await expect(
      createIssue(repository, issueSeed({ priceIrr: 1234.56 as unknown as number })),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a price that is not a whole number of Toman", async () => {
    const repository = new FakeCatalogRepository();

    // 505 Rial cannot be shown exactly in Toman.
    await expect(createIssue(repository, issueSeed({ priceIrr: 505 }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects a negative price and a negative stock", async () => {
    const repository = new FakeCatalogRepository();

    await expect(createIssue(repository, issueSeed({ priceIrr: -10 }))).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(createIssue(repository, issueSeed({ stock: -1 }))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("rejects a slug that is not URL-safe", async () => {
    const repository = new FakeCatalogRepository();

    for (const slug of ["Bad Slug", "شماره-یک", "a", "-leading", "trailing-", "a--b"]) {
      await expect(createIssue(repository, issueSeed({ slug }))).rejects.toBeInstanceOf(
        ValidationError,
      );
    }
  });

  it("rejects an unparseable publication date", async () => {
    const repository = new FakeCatalogRepository();

    await expect(
      createIssue(repository, issueSeed({ publicationDate: "not-a-date" as unknown as Date })),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an unknown field rather than silently dropping it", async () => {
    const repository = new FakeCatalogRepository();

    await expect(
      createIssue(repository, { ...issueSeed(), isCurrent: true, status: "PUBLISHED" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses a duplicate issue number", async () => {
    const repository = new FakeCatalogRepository();
    await createIssue(repository, issueSeed({ issueNumber: 7, slug: "seven" }));

    await expect(
      createIssue(repository, issueSeed({ issueNumber: 7, slug: "seven-again" })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("refuses a duplicate slug", async () => {
    const repository = new FakeCatalogRepository();
    await createIssue(repository, issueSeed({ issueNumber: 1, slug: "same" }));

    await expect(
      createIssue(repository, issueSeed({ issueNumber: 2, slug: "same" })),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("lets an issue keep its own number and slug when edited", async () => {
    const repository = new FakeCatalogRepository();
    const issue = await createIssue(repository, issueSeed({ issueNumber: 5, slug: "five" }));

    const updated = await updateIssue(repository, issue.id, {
      issueNumber: 5,
      slug: "five",
      title: "عنوان تازه",
    });

    expect(updated.title).toBe("عنوان تازه");
  });

  it("normalizes a slug to lower case", async () => {
    const repository = new FakeCatalogRepository();
    const issue = await createIssue(repository, issueSeed({ slug: "MiXeD-Case" }));

    expect(issue.slug).toBe("mixed-case");
  });

  it("parses the admin table-of-contents text format", async () => {
    const repository = new FakeCatalogRepository();
    const issue = await createIssue(
      repository,
      issueSeed({
        tableOfContents: "سرمقاله | 3\nگفت‌وگوی ویژه\nپرونده ماه | ۲۴" as unknown as [],
      }),
    );

    expect(issue.tableOfContents).toEqual([
      { title: "سرمقاله", page: 3 },
      { title: "گفت‌وگوی ویژه", page: null },
      { title: "پرونده ماه", page: 24 },
    ]);
  });

  it("rejects a query string filter that is out of range", () => {
    expect(() => parseCatalogQuery({ year: "99999" })).toThrow(ValidationError);
    expect(() => parseCatalogQuery({ season: "MONSOON" })).toThrow(ValidationError);
    expect(() => parseCatalogQuery({ limit: "0" })).toThrow(ValidationError);
  });

  it("ignores an unknown query parameter instead of failing the request", () => {
    const query = parseCatalogQuery({ q: "test", utm_source: "telegram" });
    expect(query.search).toBe("test");
  });
});

describe("admin listing (REQ-048)", () => {
  it("shows drafts and archived issues to an admin", async () => {
    const repository = new FakeCatalogRepository();
    await publishedIssue(repository, { issueNumber: 1, slug: "one" });
    await createIssue(repository, issueSeed({ issueNumber: 2, slug: "two" }));

    const page = await listIssuesForAdmin(repository, parseAdminIssueQuery({}));

    expect(page.items.map((issue) => issue.issueNumber).sort()).toEqual([1, 2]);
  });

  it("filters the admin listing by status", async () => {
    const repository = new FakeCatalogRepository();
    await publishedIssue(repository, { issueNumber: 1, slug: "one" });
    await createIssue(repository, issueSeed({ issueNumber: 2, slug: "two" }));

    const page = await listIssuesForAdmin(repository, parseAdminIssueQuery({ status: "DRAFT" }));

    expect(page.items.map((issue) => issue.issueNumber)).toEqual([2]);
  });

  it("archives rather than deletes, so the row survives for later orders", async () => {
    const repository = new FakeCatalogRepository();
    const issue = await publishedIssue(repository);

    await archiveIssue(repository, issue.id);

    expect(repository.issues.has(issue.id)).toBe(true);
    expect(repository.issues.get(issue.id)?.status).toBe("ARCHIVED");
    expect(repository.issues.get(issue.id)?.archivedAt).toBeInstanceOf(Date);
  });
});

describe("preview page limit resolution (REQ-014 / DEC-006)", () => {
  it("uses the global default when an issue sets no override", () => {
    expect(previewPageLimitFor({ previewPageLimit: null }, 3)).toBe(3);
  });

  it("lets a per-issue override win", () => {
    expect(previewPageLimitFor({ previewPageLimit: 7 }, 3)).toBe(7);
  });

  it("ignores a nonsensical override", () => {
    expect(previewPageLimitFor({ previewPageLimit: 0 }, 3)).toBe(3);
    expect(previewPageLimitFor({ previewPageLimit: -5 }, 3)).toBe(3);
  });
});
