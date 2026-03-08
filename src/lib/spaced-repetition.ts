import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type Grade,
} from "ts-fsrs";
import { supabase } from "./supabase";
import { isSupabaseConfigured } from "../constants/config";
import type { Clip } from "../types";

function difficultyToNumber(difficulty: string): number {
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

const REVIEW_BOOST_DUE = 1.0;
const REVIEW_BOOST_NOT_DUE = 0;

type StoredCard = {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string | null;
};

function cardToStored(card: Card): StoredCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.toISOString() ?? null,
  };
}

function storedToCard(stored: StoredCard): Card {
  const due = new Date(stored.due);
  const lastReview = stored.last_review ? new Date(stored.last_review) : undefined;
  const elapsedDays =
    lastReview != null
      ? (Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24)
      : 0;
  return {
    due,
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: stored.elapsed_days ?? elapsedDays,
    scheduled_days: stored.scheduled_days,
    learning_steps: stored.learning_steps,
    reps: stored.reps,
    lapses: stored.lapses,
    state: stored.state,
    last_review: lastReview,
  };
}

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, enable_short_term: false }));

/**
 * MadLeets outcome to FSRS rating mapping:
 * - Correct first try → Rating.Easy
 * - Correct with hint → Rating.Good
 * - Wrong but close → Rating.Hard
 * - Wrong → Rating.Again
 */
export type MadLeetsOutcome =
  | "correct_first_try"
  | "correct_with_hint"
  | "wrong_but_close"
  | "wrong";

export function madLeetsOutcomeToRating(outcome: MadLeetsOutcome): Rating {
  switch (outcome) {
    case "correct_first_try":
      return Rating.Easy;
    case "correct_with_hint":
      return Rating.Good;
    case "wrong_but_close":
      return Rating.Hard;
    case "wrong":
      return Rating.Again;
    default:
      return Rating.Again;
  }
}

/**
 * Creates FSRS review card when user gets MadLeets wrong.
 */
export async function createReviewCard(
  clipId: string,
  problemTopic: string,
  userId: string,
  outcome: MadLeetsOutcome = "wrong",
): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return false;

  const existing = await supabase
    .from("review_cards")
    .select("id, card_state")
    .eq("user_id", userId)
    .eq("clip_id", clipId)
    .maybeSingle();

  if (existing.data) {
    const card = storedToCard(existing.data.card_state as StoredCard);
    const rating = madLeetsOutcomeToRating(outcome);
    const result = scheduler.next(card, new Date(), rating as Grade);
    if (result) {
      await supabase
        .from("review_cards")
        .update({
          card_state: cardToStored(result.card),
          problem_topic: problemTopic,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("clip_id", clipId);
    }
    return true;
  }

  const card = createEmptyCard(new Date());
  const rating = madLeetsOutcomeToRating(outcome);
  const result = scheduler.next(card, new Date(), rating as Grade);

  const { error } = await supabase.from("review_cards").insert({
    user_id: userId,
    clip_id: clipId,
    problem_topic: problemTopic,
    card_state: cardToStored(result.card),
  });

  return !error;
}

/**
 * Returns clips due for review (retrievability < 0.9).
 */
export async function getReviewDueItems(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured || !userId) return [];

  const { data, error } = await supabase
    .from("review_cards")
    .select("clip_id, card_state")
    .eq("user_id", userId);

  if (error || !data) return [];

  const now = new Date();
  const dueClipIds: string[] = [];

  for (const row of data) {
    const card = storedToCard(row.card_state as StoredCard);
    const retrievability = scheduler.get_retrievability(card, now, false);
    if (retrievability < 0.9) {
      dueClipIds.push(row.clip_id);
    }
  }

  return dueClipIds;
}

/**
 * Updates FSRS card with new rating after review.
 */
export async function updateReviewCard(
  clipId: string,
  userId: string,
  rating: Rating,
): Promise<boolean> {
  if (!isSupabaseConfigured || !userId) return false;

  const { data, error } = await supabase
    .from("review_cards")
    .select("card_state")
    .eq("user_id", userId)
    .eq("clip_id", clipId)
    .single();

  if (error || !data) return false;

  const card = storedToCard(data.card_state as StoredCard);
  const result = scheduler.next(card, new Date(), rating as Grade);

  const { error: updateError } = await supabase
    .from("review_cards")
    .update({
      card_state: cardToStored(result.card),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("clip_id", clipId);

  return !updateError;
}

/**
 * Bell curve: exp(-((gap - 0.1) / 0.3)^2)
 * gap = clipDifficulty - userSkill
 */
export function adaptiveDifficultyScore(
  skillLevels: Record<string, number>,
  clip: Clip,
): number {
  const clipDiff = difficultyToNumber(clip.difficulty);
  const userSkill =
    clip.topics.length > 0
      ? clip.topics.reduce((acc, t) => acc + (skillLevels[t] ?? 0.5), 0) /
        clip.topics.length
      : 0.5;
  const gap = Math.abs(clipDiff - userSkill);
  return Math.exp(-Math.pow((gap - 0.1) / 0.3, 2));
}

/**
 * Returns boost value for clips due for spaced repetition review.
 */
export function spacedRepetitionBoost(userId: string, clipId: string): number {
  return REVIEW_BOOST_NOT_DUE;
}

/**
 * Async version: fetches due items and returns boost if clip is due.
 */
export async function spacedRepetitionBoostAsync(
  userId: string,
  clipId: string,
): Promise<number> {
  if (!isSupabaseConfigured || !userId) return REVIEW_BOOST_NOT_DUE;
  const dueIds = await getReviewDueItems(userId);
  return dueIds.includes(clipId) ? REVIEW_BOOST_DUE : REVIEW_BOOST_NOT_DUE;
}
