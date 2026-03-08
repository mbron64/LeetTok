import { supabase } from "./supabase";
import { isSupabaseConfigured } from "../constants/config";
import { fetchUserProfile } from "./userProfile";

export const MetricTypes = {
  skip_rate: "skip_rate",
  save_rate: "save_rate",
  share_rate: "share_rate",
  session_duration: "session_duration",
  clips_watched: "clips_watched",
  madleets_attempt_rate: "madleets_attempt_rate",
  return_rate: "return_rate",
} as const;

export type MetricType = (typeof MetricTypes)[keyof typeof MetricTypes];

/**
 * Track feed metric for A/B testing and analytics.
 */
export async function trackFeedMetric(
  userId: string,
  metricType: MetricType | string,
  value: Record<string, unknown> | number | string | boolean,
  experimentGroup?: string,
): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  const group = experimentGroup ?? (await getExperimentGroup(userId));

  await supabase.from("feed_metrics").insert({
    user_id: userId,
    experiment_group: group,
    metric_type: metricType,
    value: typeof value === "object" && value !== null ? value : { value },
  });
}

/**
 * Assign experiment group: random 50/50 split, stored in user_profiles.
 */
export async function assignExperimentGroup(userId: string): Promise<string> {
  if (!isSupabaseConfigured || !userId) return "control";

  const profile = await fetchUserProfile(userId);
  if (profile?.experimentGroup && profile.experimentGroup !== "control") {
    return profile.experimentGroup;
  }

  const group = Math.random() < 0.5 ? "control" : "treatment";

  await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        experiment_group: group,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  return group;
}

async function getExperimentGroup(userId: string): Promise<string> {
  const profile = await fetchUserProfile(userId);
  if (profile?.experimentGroup) return profile.experimentGroup;
  return assignExperimentGroup(userId);
}
