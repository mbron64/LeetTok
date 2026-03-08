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
