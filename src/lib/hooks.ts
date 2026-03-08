import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { isSupabaseConfigured } from "../constants/config";
import { sampleClips } from "../constants/sampleData";
import { assembleFeed } from "./feed";
import { fetchUserProfile } from "./userProfile";
import type { Clip, Difficulty } from "../types";

const PAGE_SIZE = 20;

// ------------------------------------------------------------------
// useClips — feed assembly when Supabase configured, else sample data
// ------------------------------------------------------------------

export function useClips() {
  const { user } = useAuth();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      if (!isSupabaseConfigured) {
        setClips(sampleClips);
        setLoading(false);
        setHasMore(false);
        return;
      }

      if (!user?.id) {
        setClips([]);
        setLoading(false);
        setHasMore(false);
        return;
      }

      try {
        const userProfile = await fetchUserProfile(user.id);
        const feedClips = await assembleFeed({
          userId: user.id,
          userProfile,
          page: pageNum,
          pageSize: PAGE_SIZE,
        });

        if (feedClips.length === 0 && pageNum === 1) {
          setClips(sampleClips);
          setHasMore(false);
        } else if (append) {
          setClips((prev) => [...prev, ...feedClips]);
          setHasMore(feedClips.length === PAGE_SIZE);
        } else {
          setClips(feedClips);
          setHasMore(feedClips.length === PAGE_SIZE);
        }
      } catch {
        if (pageNum === 1) setClips(sampleClips);
        setHasMore(false);
      }
      setLoading(false);
    },
    [user?.id],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setClips(sampleClips);
      setLoading(false);
      setHasMore(false);
      return;
    }
    if (!user?.id) {
      setClips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPage(1, false);
  }, [user?.id, isSupabaseConfigured]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || !user?.id) return;
    setLoading(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPage(nextPage, true);
  }, [page, hasMore, loading, user?.id, fetchPage]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    if (isSupabaseConfigured && user?.id) {
      setLoading(true);
      await fetchPage(1, false);
    } else {
      setClips(sampleClips);
      setHasMore(false);
    }
    setRefreshing(false);
  }, [user?.id, fetchPage]);

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
