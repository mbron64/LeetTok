import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "madleets_review_queue";

const REVIEW_INTERVALS_MS = [
  1 * 24 * 60 * 60 * 1000, // 1 day
  3 * 24 * 60 * 60 * 1000, // 3 days
  7 * 24 * 60 * 60 * 1000, // 7 days
];

export type ReviewItem = {
  challengeId: string;
  addedAt: number;
  nextReviewAt: number;
  reviewCount: number;
};

async function getQueue(): Promise<ReviewItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveQueue(queue: ReviewItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function addToReviewQueue(
  challengeId: string,
): Promise<void> {
  const queue = await getQueue();

  const existing = queue.find((item) => item.challengeId === challengeId);
  if (existing) {
    existing.reviewCount = 0;
    existing.nextReviewAt = Date.now() + REVIEW_INTERVALS_MS[0];
    await saveQueue(queue);
    return;
  }

  queue.push({
    challengeId,
    addedAt: Date.now(),
    nextReviewAt: Date.now() + REVIEW_INTERVALS_MS[0],
    reviewCount: 0,
  });
  await saveQueue(queue);
}

export async function getReviewQueue(): Promise<ReviewItem[]> {
  const queue = await getQueue();
  const now = Date.now();
  return queue.filter((item) => item.nextReviewAt <= now);
}

export async function markReviewed(
  challengeId: string,
  wasCorrect: boolean,
): Promise<void> {
  const queue = await getQueue();
  const idx = queue.findIndex((item) => item.challengeId === challengeId);
  if (idx === -1) return;

  if (wasCorrect) {
    const item = queue[idx];
    const nextInterval =
      REVIEW_INTERVALS_MS[
        Math.min(item.reviewCount + 1, REVIEW_INTERVALS_MS.length - 1)
      ];
    item.reviewCount += 1;

    if (item.reviewCount >= REVIEW_INTERVALS_MS.length) {
      queue.splice(idx, 1);
    } else {
      item.nextReviewAt = Date.now() + nextInterval;
    }
  } else {
    queue[idx].reviewCount = 0;
    queue[idx].nextReviewAt = Date.now() + REVIEW_INTERVALS_MS[0];
  }

  await saveQueue(queue);
}

export async function removeFromReviewQueue(
  challengeId: string,
): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((item) => item.challengeId !== challengeId);
  await saveQueue(filtered);
}
