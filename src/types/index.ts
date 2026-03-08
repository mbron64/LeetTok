export type Difficulty = "Easy" | "Medium" | "Hard";

export type Clip = {
  id: string;
  title: string;
  problemNumber: number;
  difficulty: Difficulty;
  topics: string[];
  videoUrl: string;
  creator: string;
  hook: string;
  likes: number;
  comments: number;
  bookmarks: number;
  shares: number;
};

export type Challenge = {
  id: string;
  clipId: string;
  problemId: string;
  language: string;
  codeBlock: string[];
  blankLineIndex: number;
  blankLineContent: string;
  acceptedAnswers: string[];
  hint: string;
  explanation: string;
  difficulty: Difficulty;
  pauseTimestamp: number;
  xpValue: number;
  tags: string[];
};
