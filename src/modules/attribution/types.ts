export const MESSENGER_CHANNELS = ["TELEGRAM", "BALE"] as const;

export type MessengerChannel = (typeof MESSENGER_CHANNELS)[number];

export type AttributionInput = {
  channel?: string | null;
  messengerUserId?: string | null;
  source?: string | null;
  startParam?: string | null;
  sessionId?: string | null;
  userId?: string | null;
};

export type AttributionDraft = {
  channel: MessengerChannel | null;
  messengerUserId: string | null;
  source: string | null;
  startParam: string | null;
  sessionId: string | null;
  userId: string | null;
};

export type AnalyticsEventDraft = AttributionDraft & {
  name: string;
  occurredAt: Date;
};
