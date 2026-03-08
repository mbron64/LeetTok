import { supabase } from "./supabase";
import { isSupabaseConfigured } from "../constants/config";
import {
  clipScore,
  type ClipStats,
} from "./scoring";
import { cosineSimilarity } from "./embeddings";
import type { UserProfile } from "./userProfile";
import type { Clip, Difficulty } from "../types";
import { getReviewDueItems } from "./spaced-repetition";

export type FeedContext = {
  userId: string;
  userProfile: UserProfile | null;
  page: number;
  pageSize: number;
};

export type FeedClip = Clip & {
  impressionCount: number;
  createdAt: Date;
  embedding?: number[] | null;
};

const CANDIDATE_LIMIT = 200;
const PAGE_SIZE_DEFAULT = 20;

/**
 * Maps difficulty string to numeric value for scoring.
 * easy=0.3, medium=0.5, hard=0.8
 */
export function difficultyToNumber(difficulty: string): number {
  const map: Record<string, number> = {
    easy: 0.3,
    Easy: 0.3,
    medium: 0.5,
    Medium: 0.5,
    hard: 0.8,
    Hard: 0.8,
  };
  return map[difficulty] ?? 0.5;
}

/**
 * Exploration bonus: decays from 1.0 to 0.0 as impressions go from 0 to 100.
 */
export function explorationBonus(impressionCount: number): number {
  if (impressionCount >= 100) return 0;
  return 1 - impressionCount / 100;
}

/**
 * Fetch unseen clips (not in user's impressions from last 7 days).
 * Returns ~200 candidates with stats.
 */
export async function generateCandidates(
  userId: string,
  limit: number = CANDIDATE_LIMIT,
): Promise<FeedClip[]> {
  if (!isSupabaseConfigured || !userId) return [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: seenClipIds } = await supabase
    .from("impressions")
    .select("clip_id")
    .eq("user_id", userId)
    .gte("shown_at", sevenDaysAgo);

  const excludedIds = [...new Set((seenClipIds ?? []).map((r) => r.clip_id))];

  let query = supabase
    .from("clips")
    .select(
      `
      id,
      title,
      video_url,
      creator,
      hook,
      likes_count,
      bookmarks_count,
      created_at,
      embedding,
      problems!inner(number, difficulty, topics)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  if (excludedIds.length > 0) {
    query = query.not("id", "in", `(${excludedIds.join(",")})`);
  }

  const { data: clipsData, error } = await query;

  if (error || !clipsData?.length) return [];

  const clipIds = clipsData.map((c) => c.id);

  const { data: impressionCounts } = await supabase
    .from("impressions")
    .select("clip_id")
    .in("clip_id", clipIds);

  const countMap = new Map<string, number>();
  for (const row of impressionCounts ?? []) {
    countMap.set(row.clip_id, (countMap.get(row.clip_id) ?? 0) + 1);
  }

  const result: FeedClip[] = clipsData.slice(0, limit).map((row: any) => {
    const problem = row.problems ?? {};
    return {
      id: row.id,
      title: row.title,
      problemNumber: problem.number ?? 0,
      difficulty: (problem.difficulty ?? "Medium") as Difficulty,
      topics: Array.isArray(problem.topics) ? problem.topics : [],
      videoUrl: row.video_url,
      creator: row.creator ?? "",
      hook: row.hook ?? "",
      likes: row.likes_count ?? 0,
      comments: 0,
      bookmarks: row.bookmarks_count ?? 0,
      shares: 0,
      impressionCount: countMap.get(row.id) ?? 0,
      createdAt: new Date(row.created_at),
      embedding: row.embedding ?? null,
    };
  });

  return result;
}

export async function fetchPublicFeed(limit: number = PAGE_SIZE_DEFAULT): Promise<Clip[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("clips")
    .select(
      `
      id,
      title,
      video_url,
      creator,
      hook,
      likes_count,
      bookmarks_count,
      created_at,
      problems!inner(number, difficulty, topics)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  return data.map((row: any) => {
    const problem = row.problems ?? {};
    return {
      id: row.id,
      title: row.title,
      problemNumber: problem.number ?? 0,
      difficulty: (problem.difficulty ?? "Medium") as Difficulty,
      topics: Array.isArray(problem.topics) ? problem.topics : [],
      videoUrl: row.video_url,
      creator: row.creator ?? "",
      hook: row.hook ?? "",
      likes: row.likes_count ?? 0,
      comments: 0,
      bookmarks: row.bookmarks_count ?? 0,
      shares: 0,
    };
  });
}

/**
 * Blended final score for a clip.
 * engagement 0.25, topicMatch 0.20, contentSim 0.15, difficultyFit 0.20,
 * reviewBoost 0.10, exploration 0.10
 */
export function finalScore(
  clip: FeedClip,
  userProfile: UserProfile | null,
  context: FeedContext,
  dueForReviewIds?: Set<string>,
): number {
  const stats: ClipStats = {
    avgCompletionRate: 0.5,
    saveRate: clip.impressionCount > 0 ? clip.bookmarks / clip.impressionCount : 0,
    shareRate: clip.impressionCount > 0 ? clip.shares / clip.impressionCount : 0,
    madleetsCorrectRate: 0.5,
    replayRate: 0.2,
    likeRate: clip.impressionCount > 0 ? clip.likes / clip.impressionCount : 0,
    skipRate: 0.2,
    commentRate: 0.05,
    impressionCount: clip.impressionCount,
    createdAt: clip.createdAt,
  };

  const engagement = clipScore(stats);
  const engagementNorm = Math.min(1, Math.max(0, engagement / 10));

  let topicMatch = 0;
  if (userProfile && clip.topics.length > 0 && Object.keys(userProfile.topicWeights).length > 0) {
    let sum = 0;
    for (const t of clip.topics) {
      sum += userProfile.topicWeights[t] ?? 0;
    }
    topicMatch = Math.min(1, sum);
  } else if (clip.topics.length > 0) {
    topicMatch = 0.5;
  }

  let contentSim = 0;
  const userTasteVector: number[] = [];
  if (clip.embedding && userTasteVector.length > 0) {
    const sim = cosineSimilarity(clip.embedding, userTasteVector);
    contentSim = Math.max(0, sim);
  }

  const userSkill =
    userProfile && clip.topics.length > 0
      ? clip.topics.reduce((acc, t) => acc + (userProfile.skillLevels[t] ?? 0.5), 0) /
        Math.max(1, clip.topics.length)
      : 0.5;
  const clipDiff = difficultyToNumber(clip.difficulty);
  const gap = Math.abs(clipDiff - userSkill);
  const difficultyFit = Math.exp(-Math.pow((gap - 0.1) / 0.3, 2));

  const reviewBoost =
    dueForReviewIds?.has(clip.id) ?? false ? 1.0 : 0;

  const exploration = explorationBonus(clip.impressionCount);

  return (
    engagementNorm * 0.25 +
    topicMatch * 0.2 +
    contentSim * 0.15 +
    difficultyFit * 0.2 +
    reviewBoost * 0.1 +
    exploration * 0.1
  );
}

/**
 * Diversity filter: no more than 2 same-topic in a row, no more than 3 same-difficulty in a row.
 */
export function diversityFilter(rankedClips: FeedClip[]): FeedClip[] {
  const result: FeedClip[] = [];
  const MAX_SAME_TOPIC = 2;
  const MAX_SAME_DIFFICULTY = 3;

  const getPrimaryTopic = (c: FeedClip) => c.topics[0] ?? "";
  const getDifficulty = (c: FeedClip) => c.difficulty;

  const remaining = [...rankedClips];

  while (remaining.length > 0) {
    const lastTopics = result.slice(-MAX_SAME_TOPIC).map(getPrimaryTopic);
    const lastDiffs = result.slice(-MAX_SAME_DIFFICULTY).map(getDifficulty);

    const topicBlocked =
      lastTopics.length === MAX_SAME_TOPIC &&
      lastTopics.every((t) => t && t === lastTopics[0]);
    const blockedTopic = topicBlocked ? lastTopics[0] : null;

    const diffBlocked =
      lastDiffs.length === MAX_SAME_DIFFICULTY &&
      lastDiffs.every((d) => d === lastDiffs[0]);
    const blockedDiff = diffBlocked ? lastDiffs[0] : null;

    let idx = -1;
    if (blockedTopic || blockedDiff) {
      idx = remaining.findIndex((c) => {
        if (blockedTopic && getPrimaryTopic(c) === blockedTopic) return false;
        if (blockedDiff && getDifficulty(c) === blockedDiff) return false;
        return true;
      });
    }
    if (idx === -1) idx = 0;

    const [picked] = remaining.splice(idx, 1);
    result.push(picked);
  }

  return result;
}

/**
 * Assemble feed: candidates → score → sort → diversity → dedup → paginate.
 */
export async function assembleFeed(context: FeedContext): Promise<Clip[]> {
  if (!isSupabaseConfigured || !context.userId) return [];

  const [candidates, dueForReview] = await Promise.all([
    generateCandidates(context.userId, CANDIDATE_LIMIT),
    getReviewDueItems(context.userId),
  ]);
  if (candidates.length === 0) return [];

  const dueSet = new Set(dueForReview);
  const scored = candidates.map((clip) => ({
    clip,
    score: finalScore(clip, context.userProfile, context, dueSet),
  }));

  scored.sort((a, b) => b.score - a.score);

  const ranked = scored.map((s) => s.clip);
  const diversified = diversityFilter(ranked);

  const seen = new Set<string>();
  const deduped = diversified.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const pageSize = context.pageSize ?? PAGE_SIZE_DEFAULT;
  const offset = (context.page - 1) * pageSize;
  const page = deduped.slice(offset, offset + pageSize);

  return page.map(toClip);
}

function toClip(fc: FeedClip): Clip {
  return {
    id: fc.id,
    title: fc.title,
    problemNumber: fc.problemNumber,
    difficulty: fc.difficulty,
    topics: fc.topics,
    videoUrl: fc.videoUrl,
    creator: fc.creator,
    hook: fc.hook,
    likes: fc.likes,
    comments: fc.comments,
    bookmarks: fc.bookmarks,
    shares: fc.shares,
  };
}
