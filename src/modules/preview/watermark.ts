import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { getWatermarkFontBytes } from "./generated/persian-font";
import { shapePersianText } from "./shaping";

/**
 * Visible watermark for preview pages (REQ-014).
 *
 * **DEC-007 is unsigned.** The diagonal Persian overlay below is the
 * contractor's development default so the feature can ship and be tested; the
 * wording, opacity and placement change the moment the client supplies theirs.
 */

const WATERMARK_ANGLE_DEGREES = 32;
const WATERMARK_OPACITY = 0.18;
const FOOTER_OPACITY = 0.55;

export async function embedWatermarkFont(document: PDFDocument): Promise<PDFFont> {
  document.registerFontkit(fontkit);
  return document.embedFont(getWatermarkFontBytes(), { subset: false });
}

/**
 * Tile the watermark diagonally across one page, then repeat it once along the
 * bottom edge so a cropped screenshot still carries it.
 */
export function drawWatermark(page: PDFPage, font: PDFFont, text: string): void {
  const shaped = shapePersianText(text);
  if (!shaped) return;

  const { width, height } = page.getSize();
  const size = Math.max(14, Math.min(46, width / 11));
  const textWidth = font.widthOfTextAtSize(shaped, size);
  const stepX = textWidth + size * 3;
  const stepY = size * 5;
  const grey = rgb(0.42, 0.42, 0.46);

  let row = 0;
  for (let y = -height * 0.2; y < height * 1.2; y += stepY) {
    // Offset every other row so the tiles do not line up into readable gaps.
    const offset = row % 2 === 0 ? 0 : stepX / 2;
    for (let x = -width * 0.3 + offset; x < width * 1.1; x += stepX) {
      page.drawText(shaped, {
        x,
        y,
        size,
        font,
        color: grey,
        opacity: WATERMARK_OPACITY,
        rotate: degrees(WATERMARK_ANGLE_DEGREES),
      });
    }
    row += 1;
  }

  const footerSize = Math.max(9, Math.min(16, width / 34));
  const footerWidth = font.widthOfTextAtSize(shaped, footerSize);
  page.drawText(shaped, {
    x: Math.max(8, (width - footerWidth) / 2),
    y: Math.max(8, footerSize * 0.9),
    size: footerSize,
    font,
    color: grey,
    opacity: FOOTER_OPACITY,
  });
}
