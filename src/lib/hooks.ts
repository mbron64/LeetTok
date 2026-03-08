import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { isSupabaseConfigured } from "../constants/config";
import { sampleClips } from "../constants/sampleData";
import type { Clip, Difficulty } from "../types";

const PAGE_SIZE = 10;

// ------------------------------------------------------------------
// useClips — paginated clip feed, falls back to sample data
// ------------------------------------------------------------------

export function useClips() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(
    async (after?: string | null) => {
      if (!isSupabaseConfigured) {
        setClips(sampleClips);
        setLoading(false);
        setHasMore(false);
        return;
      }

      let query = supabase
        .from("clips")
        .select(
          "id, title, video_url, creator, hook, likes_count, bookmarks_count, created_at, problems!inner(number, difficulty, topics)",
        )
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (after) {
        query = query.lt("created_at", after);
      }

      const { data, error } = await query;

      if (error || !data) {
        setClips(sampleClips);
        setLoading(false);
        setHasMore(false);
        return;
      }

      const mapped: Clip[] = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        problemNumber: row.problems.number,
        difficulty: row.problems.difficulty as Difficulty,
        topics: row.problems.topics ?? [],
        videoUrl: row.video_url,
        creator: row.creator ?? "",
        hook: row.hook ?? "",
        likes: row.likes_count,
        comments: row.comments_count ?? 0,
        bookmarks: row.bookmarks_count,
        shares: row.shares_count ?? 0,
      }));

      if (after) {
        setClips((prev) => [...prev, ...mapped]);
      } else {
        setClips(mapped);
      }

      const last = data[data.length - 1];
      setCursor(last?.created_at ?? null);
      setHasMore(data.length === PAGE_SIZE);
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    fetchPage(cursor);
  }, [cursor, hasMore, loading, fetchPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setCursor(null);
    await fetchPage();
    setRefreshing(false);
  }, [fetchPage]);

  return { clips, loading, refreshing, loadMore, refresh, hasMore };
}

// ------------------------------------------------------------------
// useProblems — all problems, falls back to extracted sample data
// ------------------------------------------------------------------

type Problem = {
  id: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  topics: string[];
};

function extractProblemsFromClips(clips: Clip[]): Problem[] {
  const map = new Map<number, Problem>();
  for (const clip of clips) {
    if (!map.has(clip.problemNumber)) {
      map.set(clip.problemNumber, {
        id: String(clip.problemNumber),
        number: clip.problemNumber,
        title: clip.title,
        difficulty: clip.difficulty,
        topics: [...clip.topics],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.number - b.number);
}

export function useProblems() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setProblems(extractProblemsFromClips(sampleClips));
      setLoading(false);
      return;
    }

    supabase
      .from("problems")
      .select("id, number, title, difficulty, topics")
      .order("number")
      .then(({ data, error }) => {
        if (error || !data) {
          setProblems(extractProblemsFromClips(sampleClips));
        } else {
          setProblems(
            data.map((r: any) => ({
              id: r.id,
              number: r.number,
              title: r.title,
              difficulty: r.difficulty as Difficulty,
              topics: r.topics ?? [],
            })),
          );
        }
        setLoading(false);
      });
  }, []);

  return { problems, loading };
}

// ------------------------------------------------------------------
// useLike — toggle like with optimistic update
// ------------------------------------------------------------------

export function useLike(clipId: string) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    supabase
      .from("likes")
      .select("id")
      .eq("clip_id", clipId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setLiked(!!data);
      });
  }, [clipId, user]);

  const toggle = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setLiked((prev) => !prev);
      setCount((prev) => (liked ? prev - 1 : prev + 1));
      return;
    }

    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    if (wasLiked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("clip_id", clipId)
        .eq("user_id", user.id);
      if (error) {
        setLiked(wasLiked);
        setCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      }
    } else {
      const { error } = await supabase
        .from("likes")
        .insert({ clip_id: clipId, user_id: user.id });
      if (error) {
        setLiked(wasLiked);
        setCount((prev) => (wasLiked ? prev + 1 : prev - 1));
      }
    }
  }, [clipId, user, liked]);

  return { liked, count, toggle };
}

// ------------------------------------------------------------------
// useBookmark — toggle bookmark with optimistic update
// ------------------------------------------------------------------

export function useBookmark(clipId: string) {
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) return;

    supabase
      .from("bookmarks")
      .select("id")
      .eq("clip_id", clipId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setBookmarked(!!data);
      });
  }, [clipId, user]);

  const toggle = useCallback(async () => {
    if (!isSupabaseConfigured || !user) {
      setBookmarked((prev) => !prev);
      setCount((prev) => (bookmarked ? prev - 1 : prev + 1));
      return;
    }

    const was = bookmarked;
    setBookmarked(!was);
    setCount((prev) => (was ? prev - 1 : prev + 1));

    if (was) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("clip_id", clipId)
        .eq("user_id", user.id);
      if (error) {
        setBookmarked(was);
        setCount((prev) => (was ? prev + 1 : prev - 1));
      }
    } else {
      const { error } = await supabase
        .from("bookmarks")
        .insert({ clip_id: clipId, user_id: user.id });
      if (error) {
        setBookmarked(was);
        setCount((prev) => (was ? prev + 1 : prev - 1));
      }
    }
  }, [clipId, user, bookmarked]);

  return { bookmarked, count, toggle };
}
