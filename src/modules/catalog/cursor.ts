/**
 * Keyset cursor for the archive (REQ-004 / REQ-013).
 *
 * Issue numbers are unique and indexed together with status, so one integer is
 * a complete, stable cursor: no OFFSET scan, and inserting an issue mid-listing
 * cannot make a reader skip or repeat a row.
 */

export function encodeIssueCursor(issueNumber: number): string {
  return Buffer.from(`i${issueNumber}`, "utf8").toString("base64url");
}

/** Returns `null` for anything that is not a cursor this server issued. */
export function decodeIssueCursor(cursor: string | undefined): number | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const match = /^i(\d{1,7})$/.exec(decoded);
    if (!match) return null;
    const value = Number.parseInt(match[1]!, 10);
    return Number.isSafeInteger(value) ? value : null;
  } catch {
    return null;
  }
}
