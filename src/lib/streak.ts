import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "madleets_streak";

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastChallengeDate: string | null;
  streakFreezes: number;
};

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastChallengeDate: null,
  streakFreezes: 0,
};

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  const dateA = new Date(a + "T00:00:00Z");
  const dateB = new Date(b + "T00:00:00Z");
  return Math.round(
    Math.abs(dateB.getTime() - dateA.getTime()) / msPerDay,
  );
}

export async function getStreakData(): Promise<StreakData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_STREAK };
  try {
    return { ...DEFAULT_STREAK, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STREAK };
  }
}

async function saveStreakData(data: StreakData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function updateStreak(): Promise<StreakData> {
  const data = await getStreakData();
  const today = toDateString(new Date());

  if (data.lastChallengeDate === today) {
    return data;
  }

  if (!data.lastChallengeDate) {
    data.currentStreak = 1;
  } else {
    const gap = daysBetween(data.lastChallengeDate, today);

    if (gap === 1) {
      data.currentStreak += 1;
    } else if (gap > 1) {
      if (data.streakFreezes > 0 && gap === 2) {
        data.streakFreezes -= 1;
        data.currentStreak += 1;
      } else {
        data.currentStreak = 1;
      }
    }
  }

  data.lastChallengeDate = today;
  data.longestStreak = Math.max(data.longestStreak, data.currentStreak);

  if (earnStreakFreeze(data.currentStreak)) {
    data.streakFreezes += 1;
  }

  await saveStreakData(data);
  return data;
}

export function checkStreakAtRisk(lastChallengeDate: string | null): boolean {
  if (!lastChallengeDate) return false;
  const now = Date.now();
  const last = new Date(lastChallengeDate + "T00:00:00Z").getTime();
  const hoursSince = (now - last) / (1000 * 60 * 60);
  return hoursSince > 20;
}

export function earnStreakFreeze(streak: number): boolean {
  return streak > 0 && streak % 7 === 0;
}
