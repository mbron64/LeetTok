import type { Clip, Difficulty } from "../types";

type RecommendInput = {
  allClips: Clip[];
  likedClipIds: Set<string>;
  viewedClipIds: Set<string>;
  preferredDifficulties?: Difficulty[];
  preferredTopics?: string[];
};

export function recommendClips({
  allClips,
  likedClipIds,
  viewedClipIds,
  preferredDifficulties,
  preferredTopics,
}: RecommendInput): Clip[] {
  const likedTopicCounts = new Map<string, number>();
  for (const clip of allClips) {
    if (likedClipIds.has(clip.id)) {
      for (const topic of clip.topics) {
        likedTopicCounts.set(topic, (likedTopicCounts.get(topic) ?? 0) + 1);
      }
    }
  }

  const scored = allClips.map((clip) => {
    let score = 0;

    if (!viewedClipIds.has(clip.id)) score += 50;

    for (const topic of clip.topics) {
      score += (likedTopicCounts.get(topic) ?? 0) * 10;
    }

    if (preferredTopics?.length) {
      const overlap = clip.topics.filter((t) => preferredTopics.includes(t));
      score += overlap.length * 8;
    }

    if (preferredDifficulties?.length) {
      if (preferredDifficulties.includes(clip.difficulty)) {
        score += 5;
      }
    }

    score += Math.random() * 10;

    return { clip, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return mixDifficulties(scored.map((s) => s.clip));
}

const MAX_CONSECUTIVE_SAME_DIFFICULTY = 2;

function mixDifficulties(clips: Clip[]): Clip[] {
  const result: Clip[] = [];
  const remaining = [...clips];

  while (remaining.length > 0) {
    const lastDifficulties = result
      .slice(-MAX_CONSECUTIVE_SAME_DIFFICULTY)
      .map((c) => c.difficulty);

    const allSame =
      lastDifficulties.length === MAX_CONSECUTIVE_SAME_DIFFICULTY &&
      lastDifficulties.every((d) => d === lastDifficulties[0]);

    if (allSame) {
      const blockedDifficulty = lastDifficulties[0];
      const altIdx = remaining.findIndex(
        (c) => c.difficulty !== blockedDifficulty,
      );
      if (altIdx !== -1) {
        result.push(remaining.splice(altIdx, 1)[0]);
        continue;
      }
    }

    result.push(remaining.shift()!);
  }

  return result;
}
