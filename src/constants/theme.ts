import type { Difficulty } from "../types";

export const theme = {
  colors: {
    background: "#000000",
    surface: "#111111",
    surfaceElevated: "#1a1a1a",
    surfaceBright: "#222222",

    text: "#ffffff",
    textSecondary: "#afb3b6",
    textMuted: "#5c6370",

    border: "#1a1a1a",
    borderLight: "rgba(255,255,255,0.08)",

    highlight: "#fbb862",
    highlightLight: "#fcc97e",
    highlightDim: "rgba(251,184,98,0.15)",

    interactive: "#ffffff",
    interactiveFg: "#000000",

    success: "#22c55e",
    error: "#ef4444",

    overlay: "rgba(0,0,0,0.5)",
    overlayLight: "rgba(255,255,255,0.1)",
    overlayMedium: "rgba(255,255,255,0.2)",
  },

  difficulty: {
    Easy: "#22c55e",
    Medium: "#fbb862",
    Hard: "#ef4444",
  } satisfies Record<Difficulty, string>,

  difficultyBg: {
    Easy: "rgba(34,197,94,0.13)",
    Medium: "rgba(251,184,98,0.13)",
    Hard: "rgba(239,68,68,0.13)",
  } satisfies Record<Difficulty, string>,

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
} as const;
