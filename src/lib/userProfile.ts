import { supabase } from "./supabase";
import { isSupabaseConfigured } from "../constants/config";

export type UserProfile = {
  userId: string;
  topicWeights: Record<string, number>;
  difficultyPreference: "easy" | "medium" | "hard";
  skillLevels: Record<string, number>;
  engagementPattern: Record<string, unknown>;
  experimentGroup: string;
};

export type InteractionRow = {
  clip_id: string;
  interaction_type: string;
  value: Record<string, unknown> | null;
  created_at: string;
};

export type ClipWithTopics = {
  clipId: string;
  topics: string[];
  difficulty: string;
};

export type OnboardingData = {
  topics?: string[];
  difficultyPreference?: "easy" | "medium" | "hard";
};

const DIFFICULTY_TO_NUM: Record<string, number> = {
  Easy: 0.33,
  Medium: 0.66,
  Hard: 1.0,
};

const NUM_TO_DIFFICULTY: Record<number, "easy" | "medium" | "hard"> = {
  0.33: "easy",
  0.66: "medium",
  1.0: "hard",
};

/**
 * Fetch user profile from Supabase.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !userId) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    topicWeights: (data.topic_weights as Record<string, number>) ?? {},
    difficultyPreference: normalizeDifficulty(data.difficulty_preference),
    skillLevels: (data.skill_levels as Record<string, number>) ?? {},
    engagementPattern: (data.engagement_pattern as Record<string, unknown>) ?? {},
    experimentGroup: data.experiment_group ?? "control",
  };
}

function normalizeDifficulty(
  v: string | null | undefined,
): "easy" | "medium" | "hard" {
  if (!v) return "medium";
  const lower = v.toLowerCase();
  if (lower === "easy" || lower === "medium" || lower === "hard") return lower;
  return "medium";
}

/**
 * Aggregate last 30 days of interactions and compute watch time distribution per topic.
 * Updates topic_weights in user_profiles.
 */
export async function updateTopicWeights(
  userId: string,
  interactions: InteractionRow[],
): Promise<Record<string, number>> {
  if (!isSupabaseConfigured || !userId || interactions.length === 0) {
    return {};
  }

  const clipIds = [...new Set(interactions.map((i) => i.clip_id))];
  const clipTopics = await fetchClipTopics(clipIds);
  const clipMap = new Map(clipTopics.map((c) => [c.clipId, c]));

  const topicWatchMs: Record<string, number> = {};
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const i of interactions) {
    if (new Date(i.created_at).getTime() < cutoff) continue;

    const clip = clipMap.get(i.clip_id);
    if (!clip || clip.topics.length === 0) continue;

    let watchMs = 0;
    if (i.interaction_type === "watch" && i.value) {
      const v = i.value as { duration_ms?: number; total_duration_ms?: number };
      watchMs = v.duration_ms ?? v.total_duration_ms ?? 0;
    } else if (i.interaction_type === "skip" && i.value) {
      const v = i.value as { watch_duration_ms?: number };
      watchMs = v.watch_duration_ms ?? 0;
    }

    const share = 1 / clip.topics.length;
    for (const topic of clip.topics) {
      topicWatchMs[topic] = (topicWatchMs[topic] ?? 0) + watchMs * share;
    }
  }

  const total = Object.values(topicWatchMs).reduce((a, b) => a + b, 0);
  const topicWeights: Record<string, number> = {};
  if (total > 0) {
    for (const [topic, ms] of Object.entries(topicWatchMs)) {
      topicWeights[topic] = Math.min(1, ms / total);
    }
  }

  await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        topic_weights: topicWeights,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  return topicWeights;
}

async function fetchClipTopics(clipIds: string[]): Promise<ClipWithTopics[]> {
  if (clipIds.length === 0) return [];

  const { data: clips } = await supabase
    .from("clips")
    .select("id, problem_id")
    .in("id", clipIds);

  if (!clips?.length) return [];

  const problemIds = [...new Set(clips.map((c) => c.problem_id).filter(Boolean))];
  const { data: problems } = await supabase
    .from("problems")
    .select("id, topics, difficulty")
    .in("id", problemIds);

  const problemMap = new Map(
    (problems ?? []).map((p) => [p.id, { topics: p.topics ?? [], difficulty: p.difficulty ?? "Medium" }]),
  );

  return clips.map((c) => {
    const p = problemMap.get(c.problem_id);
    return {
      clipId: c.id,
      topics: p?.topics ?? [],
      difficulty: p?.difficulty ?? "Medium",
    };
  });
}

/**
 * Update skill level using EMA.
 * target = clipDifficulty if correct, clipDifficulty * 0.5 if wrong.
 */
export function updateSkillLevel(
  currentSkill: number,
  correct: boolean,
  clipDifficulty: string,
): number {
  const diffNum = DIFFICULTY_TO_NUM[clipDifficulty] ?? 0.66;
  const target = correct ? diffNum : diffNum * 0.5;
  return currentSkill + 0.1 * (target - currentSkill);
}

/**
 * Infer difficulty preference from completion rates by difficulty.
 */
export async function updateDifficultyPreference(
  interactions: InteractionRow[],
): Promise<"easy" | "medium" | "hard"> {
  const clipIds = [...new Set(interactions.map((i) => i.clip_id))];
  const clipTopics = await fetchClipTopics(clipIds);
  const clipMap = new Map(clipTopics.map((c) => [c.clipId, c]));
  const byDiff: Record<string, { completed: number; total: number }> = {};

  for (const i of interactions) {
    if (i.interaction_type !== "watch" && i.interaction_type !== "skip") continue;

    const clip = clipMap.get(i.clip_id);
    if (!clip) continue;

    const diff = clip.difficulty;
    if (!byDiff[diff]) byDiff[diff] = { completed: 0, total: 0 };
    byDiff[diff].total += 1;

    if (i.interaction_type === "watch" && i.value) {
      const v = i.value as { completed?: boolean };
      if (v.completed) byDiff[diff].completed += 1;
    }
  }

  let bestDiff = "Medium";
  let bestRate = 0;

  for (const [diff, { completed, total }] of Object.entries(byDiff)) {
    if (total < 3) continue;
    const rate = completed / total;
    if (rate > bestRate) {
      bestRate = rate;
      bestDiff = diff;
    }
  }

  const lower = bestDiff.toLowerCase();
  if (lower === "easy" || lower === "medium" || lower === "hard") return lower;
  return "medium";
}

/**
 * Cold start: build profile from onboarding selections.
 */
export async function buildProfileFromOnboarding(
  userId: string,
  onboardingData: OnboardingData,
): Promise<UserProfile> {
  if (!isSupabaseConfigured || !userId) {
    return defaultProfile(userId);
  }

  const topicWeights: Record<string, number> = {};
  const topics = onboardingData.topics ?? [];
  const weight = topics.length > 0 ? 1 / topics.length : 0;
  for (const t of topics) {
    topicWeights[t] = weight;
  }

  const difficultyPreference = onboardingData.difficultyPreference ?? "medium";

  await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      topic_weights: topicWeights,
      difficulty_preference: difficultyPreference,
      skill_levels: {},
      engagement_pattern: {},
      experiment_group: "control",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return {
    userId,
    topicWeights,
    difficultyPreference,
    skillLevels: {},
    engagementPattern: {},
    experimentGroup: "control",
  };
}

function defaultProfile(userId: string): UserProfile {
  return {
    userId,
    topicWeights: {},
    difficultyPreference: "medium",
    skillLevels: {},
    engagementPattern: {},
    experimentGroup: "control",
  };
}

/**
 * Gradual transition from global to personalized score.
 * personalizedScore * min(count/10, 1) + globalScore * max(1 - count/10, 0)
 */
export function coldStartBlend(
  personalizedScore: number,
  globalScore: number,
  interactionCount: number,
): number {
  const t = Math.min(interactionCount / 10, 1);
  return personalizedScore * t + globalScore * Math.max(1 - t, 0);
}
