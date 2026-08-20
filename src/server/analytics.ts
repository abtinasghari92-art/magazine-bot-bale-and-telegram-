import "server-only";

import type { Prisma } from "@prisma/client";

import { logger } from "@/lib/logger";
import { toAnalyticsEventDraft, type AttributionInput } from "@/modules/attribution";
import { getPrisma } from "@/server/db";

/**
 * Catalog analytics (REQ-003 foundation).
 *
 * Day 3 only *records* events; the reports that read them are REQ-051 … REQ-053
 * on Day 9. Recording is best-effort by design: a failed insert is logged and
 * swallowed, because losing an analytics row must never cost a reader their
 * page.
 */

export const CATALOG_EVENT = {
  viewHome: "view_home",
  viewIssue: "view_issue",
  searchArchive: "search_archive",
  filterArchive: "filter_archive",
  openPreview: "open_preview",
} as const;

export type CatalogEventName = (typeof CATALOG_EVENT)[keyof typeof CATALOG_EVENT];

/** Metadata is a small, fixed set of non-personal values only. */
export type AnalyticsMetadata = Record<string, string | number | boolean | null>;

export async function recordAnalyticsEvent(
  name: CatalogEventName,
  attribution: AttributionInput,
  metadata?: AnalyticsMetadata,
): Promise<void> {
  const draft = toAnalyticsEventDraft(name, attribution);
  await getPrisma().analyticsEvent.create({
    data: {
      name: draft.name,
      channel: draft.channel,
      messengerUserId: draft.messengerUserId,
      source: draft.source,
      startParam: draft.startParam,
      sessionId: draft.sessionId,
      userId: draft.userId,
      occurredAt: draft.occurredAt,
      ...(metadata ? { metadata: metadata as Prisma.InputJsonValue } : {}),
    },
  });
}

/**
 * Fire-and-forget variant for request handlers.
 *
 * Returns immediately. The promise is deliberately not awaited and its
 * rejection is absorbed here, so an analytics outage cannot turn a working
 * catalog response into a 500.
 */
export function recordAnalyticsEventSafely(
  name: CatalogEventName,
  attribution: AttributionInput,
  metadata?: AnalyticsMetadata,
): void {
  void recordAnalyticsEvent(name, attribution, metadata).catch((error: unknown) => {
    logger.warn("Analytics event was not recorded", {
      event: name,
      reason: error instanceof Error ? error.name : "unknown",
    });
  });
}
