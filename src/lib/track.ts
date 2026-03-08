import { AppState, AppStateStatus } from "react-native";
import { supabase } from "./supabase";
import { isSupabaseConfigured } from "../constants/config";

export type InteractionType =
  | "watch"
  | "like"
  | "save"
  | "share"
  | "skip"
  | "madleets_attempt"
  | "search"
  | "tap_problem"
  | "tutor_opened"
  | "tutor_message_sent"
  | "code_editor_opened"
  | "code_submitted";

type QueuedEvent = {
  userId: string;
  clipId: string;
  type: InteractionType;
  value?: Record<string, unknown>;
};

const eventQueue: QueuedEvent[] = [];
const FLUSH_INTERVAL_MS = 5000;

let flushIntervalId: ReturnType<typeof setInterval> | null = null;

function startAutoFlush() {
  if (flushIntervalId) return;
  flushIntervalId = setInterval(flushEvents, FLUSH_INTERVAL_MS);
}

function stopAutoFlush() {
  if (flushIntervalId) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }
}

export function trackEvent(
  userId: string,
  clipId: string,
  type: InteractionType,
  value?: Record<string, unknown>,
): void {
  if (!isSupabaseConfigured || !userId) return;

  eventQueue.push({ userId, clipId, type, value });
  startAutoFlush();
}

export async function flushEvents(): Promise<void> {
  if (!isSupabaseConfigured || eventQueue.length === 0) return;

  const batch = eventQueue.splice(0, eventQueue.length);

  const rows = batch.map((e) => ({
    user_id: e.userId,
    clip_id: e.clipId,
    interaction_type: e.type,
    value: e.value ?? null,
  }));

  const { error } = await supabase.from("interactions").insert(rows);

  if (error) {
    eventQueue.unshift(...batch);
  }
}

export async function trackImpression(userId: string, clipId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  await supabase.from("impressions").insert({
    user_id: userId,
    clip_id: clipId,
  });
}

function handleAppStateChange(nextState: AppStateStatus) {
  if (nextState === "background" || nextState === "inactive") {
    flushEvents();
  }
}

let appStateSubscription: { remove: () => void } | null = null;

export function initTracking(): void {
  if (!isSupabaseConfigured) return;

  appStateSubscription = AppState.addEventListener("change", handleAppStateChange);
}

export function cleanupTracking(): void {
  stopAutoFlush();
  appStateSubscription?.remove();
  appStateSubscription = null;
}
