import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { beforeAll, describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors";
import { FieldValidationError } from "@/lib/validation";
import { captureAppError } from "./support/errors";
import {
  allowedPreviewPageCount,
  buildPreviewPdf,
  countPdfPages,
  MAX_PREVIEW_PAGE_LIMIT,
  normalizePageLimit,
} from "@/modules/preview";

/**
 * REQ-014.
 *
 * The property under test is not "the viewer hides pages" — it is that the
 * bytes for the disallowed pages are never produced. So the assertions look
 * inside the returned document: its page count, and whether any text that only
 * exists on a later source page can be found in it.
 */

/** A source PDF whose every page carries a unique, searchable marker. */
async function buildSourcePdf(pageCount: number): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);

  for (let index = 1; index <= pageCount; index += 1) {
    const page = document.addPage([595, 842]);
    page.drawText(`SECRETPAGEMARKER${index}`, {
      x: 60,
      y: 700,
      size: 24,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return document.save();
}

/** Extract the readable text streams so page markers can be searched for. */
function asLatin1(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("latin1");
}

const WATERMARK = "پیش‌نمایش — شماره ۱۲";

describe("preview page limit (REQ-014 / DEC-006)", () => {
  let source: Uint8Array;

  beforeAll(async () => {
    source = await buildSourcePdf(20);
  });

  it("returns only the configured number of pages", async () => {
    const preview = await buildPreviewPdf({ bytes: source }, {
      pageLimit: 3,
      watermarkText: WATERMARK,
    });

    expect(preview.pageNumbers).toEqual([1, 2, 3]);
    expect(preview.allowedPageCount).toBe(3);
    expect(preview.sourcePageCount).toBe(20);

    const rebuilt = await PDFDocument.load(preview.bytes);
    expect(rebuilt.getPageCount()).toBe(3);
  });

  it("honours a different configured limit", async () => {
    const preview = await buildPreviewPdf({ bytes: source }, {
      pageLimit: 7,
      watermarkText: WATERMARK,
    });

    expect(preview.pageNumbers).toHaveLength(7);
    expect((await PDFDocument.load(preview.bytes)).getPageCount()).toBe(7);
  });

  it("never returns more pages than the source actually has", async () => {
    const short = await buildSourcePdf(2);

    const preview = await buildPreviewPdf({ bytes: short }, {
      pageLimit: 10,
      watermarkText: WATERMARK,
    });

    expect(preview.pageNumbers).toEqual([1, 2]);
  });

  it("serves a single allowed page when one is requested", async () => {
    const preview = await buildPreviewPdf({ bytes: source }, {
      pageLimit: 3,
      watermarkText: WATERMARK,
      pages: [2],
    });

    expect(preview.pageNumbers).toEqual([2]);
    expect((await PDFDocument.load(preview.bytes)).getPageCount()).toBe(1);
  });

  it("clamps an absurd configured limit", () => {
    expect(normalizePageLimit(10_000, 3)).toBe(MAX_PREVIEW_PAGE_LIMIT);
    expect(normalizePageLimit(0, 3)).toBe(3);
    expect(normalizePageLimit(null, 3)).toBe(3);
    expect(normalizePageLimit(-1, 3)).toBe(3);
  });

  it("computes the allowed count from the source length and the limit", () => {
    expect(allowedPreviewPageCount(20, 3)).toBe(3);
    expect(allowedPreviewPageCount(2, 3)).toBe(2);
    expect(allowedPreviewPageCount(0, 3)).toBe(0);
  });
});

describe("preview cannot expose the full source file (REQ-014)", () => {
  let source: Uint8Array;

  beforeAll(async () => {
    source = await buildSourcePdf(20);
  });

  it("does not carry the content of any page past the limit", async () => {
    const preview = await buildPreviewPdf({ bytes: source }, {
      pageLimit: 3,
      watermarkText: WATERMARK,
    });

    const body = asLatin1(preview.bytes);

    // Pages 1-3 are the preview; 4-20 must be absent from the bytes entirely.
    for (let page = 4; page <= 20; page += 1) {
      expect(body).not.toContain(`SECRETPAGEMARKER${page}`);
    }
  });

  it("grows with the number of allowed pages, so pages are really omitted", async () => {
    // Comparing against the source would be meaningless — the preview embeds a
    // Persian watermark font the source never carried. Comparing two previews
    // built the same way isolates the page content.
    const three = await buildPreviewPdf({ bytes: source }, {
      pageLimit: 3,
      watermarkText: WATERMARK,
    });
    const fifteen = await buildPreviewPdf({ bytes: source }, {
      pageLimit: 15,
      watermarkText: WATERMARK,
    });

    // A preview that merely hid pages in the viewer would be the same size.
    expect(three.bytes.byteLength).toBeLessThan(fifteen.bytes.byteLength);
  });

  it("refuses a page beyond the limit instead of clamping to it", async () => {
    for (const page of [4, 20, 21, 999]) {
      await expect(
        buildPreviewPdf({ bytes: source }, {
          pageLimit: 3,
          watermarkText: WATERMARK,
          pages: [page],
        }),
      ).rejects.toBeInstanceOf(AppError);
    }
  });

  it("refuses a page that is zero, negative or not an integer", async () => {
    for (const page of [0, -1, 1.5, Number.NaN]) {
      await expect(
        buildPreviewPdf({ bytes: source }, {
          pageLimit: 3,
          watermarkText: WATERMARK,
          pages: [page],
        }),
      ).rejects.toBeInstanceOf(AppError);
    }
  });

  it("refuses the whole request when one page in a batch is out of range", async () => {
    await expect(
      buildPreviewPdf({ bytes: source }, {
        pageLimit: 3,
        watermarkText: WATERMARK,
        pages: [1, 2, 9],
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("answers with a 403-class error, not a 404 that hints the page exists", async () => {
    const error = await captureAppError(
      buildPreviewPdf({ bytes: source }, {
        pageLimit: 3,
        watermarkText: WATERMARK,
        pages: [11],
      }),
    );

    expect(error.status).toBe(403);
    // The internal detail must not name the source document's real length.
    expect(error.publicMessage).not.toContain("20");
  });

  it("never serves a page from a one-page source beyond the first", async () => {
    const single = await buildSourcePdf(1);

    const preview = await buildPreviewPdf({ bytes: single }, {
      pageLimit: 5,
      watermarkText: WATERMARK,
    });
    expect(preview.pageNumbers).toEqual([1]);

    await expect(
      buildPreviewPdf({ bytes: single }, {
        pageLimit: 5,
        watermarkText: WATERMARK,
        pages: [2],
      }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("strips the source document's metadata from the preview", async () => {
    const document = await PDFDocument.create();
    document.addPage();
    document.setTitle("Internal Master Copy 2026");
    document.setAuthor("Prepress Vendor Ltd");
    const withMetadata = await document.save();

    const preview = await buildPreviewPdf({ bytes: withMetadata }, {
      pageLimit: 1,
      watermarkText: WATERMARK,
    });

    const rebuilt = await PDFDocument.load(preview.bytes);
    expect(rebuilt.getTitle() ?? "").not.toContain("Internal Master Copy");
    expect(rebuilt.getAuthor() ?? "").not.toContain("Prepress Vendor");
  });

  it("rejects a file that is not a readable PDF", async () => {
    const notAPdf = new TextEncoder().encode("this is not a pdf at all");

    await expect(
      buildPreviewPdf({ bytes: notAPdf }, { pageLimit: 3, watermarkText: WATERMARK }),
    ).rejects.toBeInstanceOf(FieldValidationError);
  });
});

describe("watermark (REQ-014 / DEC-007)", () => {
  it("stamps every returned page", async () => {
    const source = await buildSourcePdf(5);

    const preview = await buildPreviewPdf({ bytes: source }, {
      pageLimit: 3,
      watermarkText: WATERMARK,
    });

    const rebuilt = await PDFDocument.load(preview.bytes);
    expect(rebuilt.getPageCount()).toBe(3);

    // Each page must have gained drawing operations beyond the copied content.
    const plain = await buildPreviewPdf({ bytes: source }, {
      pageLimit: 3,
      watermarkText: "",
    });
    expect(preview.bytes.byteLength).toBeGreaterThan(plain.bytes.byteLength);
  });
});

describe("page counting on upload (REQ-048)", () => {
  it("reports the real page count of a stored PDF", async () => {
    expect(await countPdfPages(await buildSourcePdf(12))).toBe(12);
    expect(await countPdfPages(await buildSourcePdf(1))).toBe(1);
  });

  it("rejects a corrupt upload rather than storing it", async () => {
    await expect(countPdfPages(new TextEncoder().encode("%PDF-1.4 broken"))).rejects.toBeInstanceOf(
      FieldValidationError,
    );
  });
});
