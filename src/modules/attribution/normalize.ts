import { z } from "zod";

import { parseWithSchema } from "@/lib/validation";
import {
  MESSENGER_CHANNELS,
  type AnalyticsEventDraft,
  type AttributionDraft,
  type AttributionInput,
  type MessengerChannel,
} from "@/modules/attribution/types";

const optionalText = z
  .string()
  .trim()
  .max(512)
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) return null;
    return value.length > 0 ? value : null;
  });

const attributionSchema = z.object({
  channel: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value): MessengerChannel | null => {
      if (!value) return null;
      const upper = value.toUpperCase();
      return (MESSENGER_CHANNELS as readonly string[]).includes(upper)
        ? (upper as MessengerChannel)
        : null;
    }),
  messengerUserId: optionalText,
  source: optionalText,
  startParam: optionalText,
  sessionId: optionalText,
  userId: optionalText,
});

function emptyToNull(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeAttribution(input: AttributionInput): AttributionDraft {
  const parsed = parseWithSchema(attributionSchema, {
    channel: input.channel ?? null,
    messengerUserId: emptyToNull(input.messengerUserId),
    source: emptyToNull(input.source),
    startParam: emptyToNull(input.startParam),
    sessionId: emptyToNull(input.sessionId),
    userId: emptyToNull(input.userId),
  });

  const channel: MessengerChannel | null =
    parsed.channel === "TELEGRAM" || parsed.channel === "BALE" ? parsed.channel : null;

  return {
    channel,
    messengerUserId: parsed.messengerUserId ?? null,
    source: parsed.source ?? null,
    startParam: parsed.startParam ?? null,
    sessionId: parsed.sessionId ?? null,
    userId: parsed.userId ?? null,
  };
}

export function toAnalyticsEventDraft(
  name: string,
  input: AttributionInput,
  occurredAt = new Date(),
): AnalyticsEventDraft {
  return {
    name: name.trim() || "unknown",
    occurredAt,
    ...normalizeAttribution(input),
  };
}

export function toEntrySessionCreate(input: AttributionInput) {
  const draft = normalizeAttribution(input);
  return {
    channel: draft.channel,
    messengerUserId: draft.messengerUserId,
    source: draft.source,
    startParam: draft.startParam,
    userId: draft.userId,
  };
}
