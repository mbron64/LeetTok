export type ClipStats = {
  avgCompletionRate: number;
  saveRate: number;
  shareRate: number;
  madleetsCorrectRate: number;
  replayRate: number;
  likeRate: number;
  skipRate: number;
  commentRate: number;
  impressionCount: number;
  createdAt: Date;
};

/**
 * Weighted engagement score from clip stats.
 * Weights: completion 3.0, save 2.5, share 2.5, madleets 3.0, replay 2.0,
 * like 1.0, skip -3.0, comment 1.5
 */
export function engagementScore(stats: ClipStats): number {
  return (
    stats.avgCompletionRate * 3.0 +
    stats.saveRate * 2.5 +
    stats.shareRate * 2.5 +
    stats.madleetsCorrectRate * 3.0 +
    stats.replayRate * 2.0 +
    stats.likeRate * 1.0 +
    stats.skipRate * -3.0 +
    stats.commentRate * 1.5
  );
}

/**
 * Freshness multiplier with 7-day (168h) half-life.
 * Newer clips score higher: Math.pow(0.5, ageHours / 168)
 */
export function freshnessMultiplier(createdAt: Date): number {
  const ageHours = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  return Math.pow(0.5, ageHours / 168);
}

/**
 * Wilson score lower bound for Trending tab ranking.
 * @param positive - number of positive outcomes
 * @param total - total number of trials
 * @param z - z-score for confidence (default 1.96 for 95%)
 */
export function wilsonScore(
  positive: number,
  total: number,
  z: number = 1.96,
): number {
  if (total <= 0) return 0;
  const p = positive / total;
  const denominator = 1 + (z * z) / total;
  const center = p + (z * z) / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total);
  return (center - spread) / denominator;
}

/**
 * Combined clip score: engagement * freshness.
 */
export function clipScore(stats: ClipStats): number {
  return engagementScore(stats) * freshnessMultiplier(stats.createdAt);
}
