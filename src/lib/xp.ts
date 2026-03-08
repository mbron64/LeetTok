import type { Difficulty } from "../types";

export const DIFFICULTY_XP: Record<Difficulty, number> = {
  Easy: 10,
  Medium: 15,
  Hard: 25,
};

const MAX_STREAK_BONUS = 25;
const STREAK_BONUS_PER_DAY = 5;
const XP_PER_LEVEL = 100;

export function calculateXP(
  difficulty: Difficulty,
  xpValue: number,
  xpMultiplier: number,
  currentStreak: number,
  isFirstAttempt: boolean,
): number {
  const baseXP = xpValue * xpMultiplier;
  const streakBonus = Math.min(
    currentStreak * STREAK_BONUS_PER_DAY,
    MAX_STREAK_BONUS,
  );
  const firstAttemptBonus = isFirstAttempt ? 5 : 0;

  return Math.round(baseXP + streakBonus + firstAttemptBonus);
}

export function getLevel(totalXP: number): number {
  return Math.floor(totalXP / XP_PER_LEVEL);
}

export function getXPForNextLevel(totalXP: number): {
  current: number;
  needed: number;
} {
  return {
    current: totalXP % XP_PER_LEVEL,
    needed: XP_PER_LEVEL,
  };
}
