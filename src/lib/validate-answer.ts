export type ValidationTier =
  | "perfect"
  | "correct"
  | "close"
  | "partial"
  | "wrong";

export type ValidationResult = {
  tier: ValidationTier;
  message: string;
  xpMultiplier: number;
};

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}

export function tokenSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .replace(/[^a-zA-Z0-9_]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => t.toLowerCase()),
    );

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return overlap / union;
}

export function validateAnswer(
  userAnswer: string,
  correctAnswer: string,
  acceptedAnswers: string[],
): ValidationResult {
  const normalUser = normalize(userAnswer);
  const normalCorrect = normalize(correctAnswer);

  if (!normalUser) {
    return { tier: "wrong", message: "No answer provided", xpMultiplier: 0 };
  }

  const allAccepted = [correctAnswer, ...acceptedAnswers].map(normalize);

  for (const accepted of allAccepted) {
    if (normalUser === accepted) {
      return { tier: "perfect", message: "Perfect!", xpMultiplier: 1.0 };
    }
  }

  const minDist = Math.min(
    ...allAccepted.map((a) => levenshteinDistance(normalUser, a)),
  );
  const refLength = Math.max(normalCorrect.length, 1);

  if (minDist / refLength < 0.1) {
    return { tier: "correct", message: "Correct!", xpMultiplier: 1.0 };
  }

  if (minDist / refLength < 0.2) {
    return { tier: "close", message: "Close enough!", xpMultiplier: 0.75 };
  }

  const similarity = tokenSimilarity(normalUser, normalCorrect);
  if (similarity > 0.6) {
    return { tier: "partial", message: "Almost!", xpMultiplier: 0 };
  }

  return { tier: "wrong", message: "Not quite", xpMultiplier: 0 };
}
