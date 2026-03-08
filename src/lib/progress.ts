import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Challenge, Difficulty } from "../types";
import { getLevel } from "./xp";
import { getStreakData, type StreakData } from "./streak";

const STORAGE_KEY = "madleets_attempts";

type Attempt = {
  challengeId: string;
  difficulty: Difficulty;
  topics: string[];
  isCorrect: boolean;
  xpEarned: number;
  timestamp: number;
};

export type TopicBreakdown = {
  topic: string;
  total: number;
  correct: number;
  accuracy: number;
};

export type DifficultyBreakdown = Record<
  Difficulty,
  { total: number; correct: number }
>;

export type ProgressData = {
  totalXP: number;
  level: number;
  streak: StreakData;
  challengesCompleted: number;
  challengesCorrect: number;
  accuracy: number;
  topicBreakdown: TopicBreakdown[];
  difficultyBreakdown: DifficultyBreakdown;
  weakestTopics: TopicBreakdown[];
};

async function getAttempts(): Promise<Attempt[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveAttempts(attempts: Attempt[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
}

export async function recordAttempt(
  challenge: Challenge,
  isCorrect: boolean,
  xpEarned: number,
): Promise<void> {
  const attempts = await getAttempts();
  attempts.push({
    challengeId: challenge.id,
    difficulty: challenge.difficulty,
    topics: challenge.tags ?? [],
    isCorrect,
    xpEarned,
    timestamp: Date.now(),
  });
  await saveAttempts(attempts);
}

export async function getProgress(): Promise<ProgressData> {
  const [attempts, streak] = await Promise.all([
    getAttempts(),
    getStreakData(),
  ]);

  const totalXP = attempts.reduce((sum, a) => sum + a.xpEarned, 0);
  const level = getLevel(totalXP);
  const challengesCompleted = attempts.length;
  const challengesCorrect = attempts.filter((a) => a.isCorrect).length;
  const accuracy =
    challengesCompleted > 0
      ? Math.round((challengesCorrect / challengesCompleted) * 100)
      : 0;

  const topicMap = new Map<
    string,
    { total: number; correct: number }
  >();
  for (const attempt of attempts) {
    for (const topic of attempt.topics) {
      const entry = topicMap.get(topic) ?? { total: 0, correct: 0 };
      entry.total += 1;
      if (attempt.isCorrect) entry.correct += 1;
      topicMap.set(topic, entry);
    }
  }
  const topicBreakdown: TopicBreakdown[] = Array.from(
    topicMap.entries(),
  )
    .map(([topic, { total, correct }]) => ({
      topic,
      total,
      correct,
      accuracy: Math.round((correct / total) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  const difficultyBreakdown: DifficultyBreakdown = {
    Easy: { total: 0, correct: 0 },
    Medium: { total: 0, correct: 0 },
    Hard: { total: 0, correct: 0 },
  };
  for (const attempt of attempts) {
    const entry = difficultyBreakdown[attempt.difficulty];
    if (entry) {
      entry.total += 1;
      if (attempt.isCorrect) entry.correct += 1;
    }
  }

  const MIN_ATTEMPTS_FOR_WEAK = 2;
  const weakestTopics = topicBreakdown
    .filter((t) => t.total >= MIN_ATTEMPTS_FOR_WEAK)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  return {
    totalXP,
    level,
    streak,
    challengesCompleted,
    challengesCorrect,
    accuracy,
    topicBreakdown,
    difficultyBreakdown,
    weakestTopics,
  };
}
