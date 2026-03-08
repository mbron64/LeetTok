import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CANDIDATE_LIMIT = 200;
const PAGE_SIZE_DEFAULT = 20;
const CACHE_MAX_AGE = 300;

function difficultyToNumber(d: string): number {
  const m: Record<string, number> = {
    easy: 0.3, Easy: 0.3, medium: 0.5, Medium: 0.5, hard: 0.8, Hard: 0.8,
  };
  return m[d] ?? 0.5;
}

function explorationBonus(imp: number): number {
  return imp >= 100 ? 0 : 1 - imp / 100;
}

function clipScore(stats: {
  likes: number;
  bookmarks: number;
  impressionCount: number;
  createdAt: string;
}): number {
  const ageHours = (Date.now() - new Date(stats.createdAt).getTime()) / (1000 * 60 * 60);
  const freshness = Math.pow(0.5, ageHours / 168);
  const engagement =
    (stats.likes ?? 0) * 1 +
    (stats.bookmarks ?? 0) * 2.5 +
    (stats.impressionCount > 0 ? 0 : 2);
  return Math.min(10, engagement * freshness);
}

function finalScore(
  clip: {
    id: string;
    topics: string[];
    difficulty: string;
    likes: number;
    bookmarks: number;
    impressionCount: number;
    createdAt: string;
    embedding?: number[] | null;
  },
  userProfile: { topic_weights?: Record<string, number>; skill_levels?: Record<string, number> } | null,
  dueIds: Set<string>,
): number {
  const engagement = clipScore({
    likes: clip.likes,
    bookmarks: clip.bookmarks,
    impressionCount: clip.impressionCount,
    createdAt: clip.createdAt,
  });
  const engagementNorm = Math.min(1, Math.max(0, engagement / 10));

  let topicMatch = 0;
  const tw = userProfile?.topic_weights ?? {};
  if (clip.topics?.length && Object.keys(tw).length) {
    topicMatch = Math.min(1, clip.topics.reduce((s, t) => s + (tw[t] ?? 0), 0));
  } else if (clip.topics?.length) topicMatch = 0.5;

  const contentSim = 0;

  const skillLevels = userProfile?.skill_levels ?? {};
  const userSkill =
    clip.topics?.length
      ? clip.topics.reduce((a: number, t: string) => a + (skillLevels[t] ?? 0.5), 0) /
        clip.topics.length
      : 0.5;
  const gap = Math.abs(difficultyToNumber(clip.difficulty) - userSkill);
  const difficultyFit = Math.exp(-Math.pow((gap - 0.1) / 0.3, 2));

  const reviewBoost = dueIds.has(clip.id) ? 1 : 0;
  const exploration = explorationBonus(clip.impressionCount);

  return (
    engagementNorm * 0.25 +
    topicMatch * 0.2 +
    contentSim * 0.15 +
    difficultyFit * 0.2 +
    reviewBoost * 0.1 +
    exploration * 0.1
  );
}

type ClipCandidate = {
  id: string;
  title: string;
  problemNumber: number;
  difficulty: string;
  topics: string[];
  videoUrl: string;
  creator: string;
  hook: string;
  likes: number;
  comments: number;
  bookmarks: number;
  shares: number;
  impressionCount: number;
  createdAt: string;
};

function diversityFilter(clips: ClipCandidate[]): ClipCandidate[] {
  const out: ClipCandidate[] = [];
  const rest = [...clips];
  const MAX_TOPIC = 2;
  const MAX_DIFF = 3;

  while (rest.length) {
    const lastTopics = out.slice(-MAX_TOPIC).map((c: ClipCandidate) => c.topics?.[0] ?? "");
    const lastDiffs = out.slice(-MAX_DIFF).map((c: ClipCandidate) => c.difficulty ?? "");
    const blockTopic =
      lastTopics.length === MAX_TOPIC && lastTopics.every((t: string) => t === lastTopics[0]);
    const blockDiff =
      lastDiffs.length === MAX_DIFF && lastDiffs.every((d: string) => d === lastDiffs[0]);

    let i = rest.findIndex((c: ClipCandidate) => {
      if (blockTopic && (c.topics?.[0] ?? "") === lastTopics[0]) return false;
      if (blockDiff && (c.difficulty ?? "") === lastDiffs[0]) return false;
      return true;
    });
    if (i < 0) i = 0;
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

async function getReviewDueIds(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("review_cards")
    .select("clip_id, card_state")
    .eq("user_id", userId);
  if (!data?.length) return [];

  const due: string[] = [];
  const now = new Date();
  for (const r of data) {
    const cs = r.card_state as { due?: string; stability?: number; last_review?: string } | null;
    if (!cs) continue;
    const last = cs.last_review ? new Date(cs.last_review) : new Date(cs.due ?? 0);
    const elapsed = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    const R = Math.pow(1 + (0.9 ** (1 / 0.5) - 1) * (elapsed / (9 * (cs.stability ?? 0.1))), 0.5);
    if (R < 0.9) due.push(r.clip_id);
  }
  return due;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("page_size") ?? String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT));

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: seen } = await supabaseAdmin
    .from("impressions")
    .select("clip_id")
    .eq("user_id", user.id)
    .gte("shown_at", sevenDaysAgo);

  const excluded = [...new Set((seen ?? []).map((r) => r.clip_id))];

  let q = supabaseAdmin
    .from("clips")
    .select(
      "id, title, video_url, creator, hook, likes_count, bookmarks_count, created_at, embedding, problems!inner(number, difficulty, topics)"
    )
    .order("created_at", { ascending: false })
    .limit(CANDIDATE_LIMIT * 2);

  if (excluded.length) {
    q = q.not("id", "in", `(${excluded.join(",")})`);
  }
  if (cursor) {
    q = q.lt("created_at", cursor);
  }

  const { data: clipsData, error } = await q;

  if (error || !clipsData?.length) {
    return new Response(
      JSON.stringify({ clips: [], next_cursor: null }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": `private, max-age=${CACHE_MAX_AGE}`,
        },
      }
    );
  }

  const clipIds = clipsData.map((c) => c.id);
  const { data: impData } = await supabaseAdmin
    .from("impressions")
    .select("clip_id")
    .in("clip_id", clipIds);

  const impCount: Record<string, number> = {};
  for (const r of impData ?? []) {
    impCount[r.clip_id] = (impCount[r.clip_id] ?? 0) + 1;
  }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("topic_weights, skill_levels")
    .eq("user_id", user.id)
    .single();

  const dueIds = new Set(await getReviewDueIds(user.id));

  const candidates = clipsData.slice(0, CANDIDATE_LIMIT).map((r: any) => {
    const p = r.problems ?? {};
    return {
      id: r.id,
      title: r.title,
      problemNumber: p.number ?? 0,
      difficulty: p.difficulty ?? "Medium",
      topics: Array.isArray(p.topics) ? p.topics : [],
      videoUrl: r.video_url,
      creator: r.creator ?? "",
      hook: r.hook ?? "",
      likes: r.likes_count ?? 0,
      comments: 0,
      bookmarks: r.bookmarks_count ?? 0,
      shares: 0,
      impressionCount: impCount[r.id] ?? 0,
      createdAt: r.created_at,
      embedding: r.embedding ?? null,
    };
  });

  const scored = candidates.map((c: ClipCandidate) => ({
    clip: c,
    score: finalScore(c, profile, dueIds),
  }));
  scored.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

  const ranked = scored.map((s) => s.clip);
  const diversified = diversityFilter(ranked);
  const seenIds = new Set<string>();
  const deduped = diversified.filter((c: ClipCandidate) => {
    if (seenIds.has(c.id)) return false;
    seenIds.add(c.id);
    return true;
  });

  const page = deduped.slice(0, pageSize);
  const last = page[page.length - 1];
  const nextCursor = last ? last.createdAt : null;

  const clips = page.map((c: ClipCandidate) => ({
    id: c.id,
    title: c.title,
    problemNumber: c.problemNumber,
    difficulty: c.difficulty,
    topics: c.topics,
    videoUrl: c.videoUrl,
    creator: c.creator,
    hook: c.hook,
    likes: c.likes,
    comments: c.comments,
    bookmarks: c.bookmarks,
    shares: c.shares,
  }));

  return new Response(
    JSON.stringify({ clips, next_cursor: nextCursor }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": `private, max-age=${CACHE_MAX_AGE}`,
      },
    }
  );
});
