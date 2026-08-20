/**
 * Money helpers.
 *
 * Prices are stored as an integer number of **Rial** (`priceIrr`). No amount is
 * ever held in a floating point number: `docs/ARCHITECTURE.md` requires integer
 * minor units end to end, and rounding drift on a price would show up on an
 * invoice later.
 *
 * Iranian shoppers read prices in Toman, which is 10 Rial. Catalog prices are
 * validated to be a multiple of 10 so the conversion is exact.
 */

export const RIAL_PER_TOMAN = 10;

export function toTomans(priceIrr: number): number {
  return Math.round(priceIrr / RIAL_PER_TOMAN);
}

/** `۱۲۵٬۰۰۰ تومان` — Persian digits and grouping for the Mini App. */
export function formatToman(priceIrr: number): string {
  return `${new Intl.NumberFormat("fa-IR").format(toTomans(priceIrr))} تومان`;
}

/** Latin-digit grouping for admin inputs, where the operator types raw numbers. */
export function formatRialPlain(priceIrr: number): string {
  return new Intl.NumberFormat("en-US").format(priceIrr);
}
