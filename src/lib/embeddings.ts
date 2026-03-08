import { supabase } from "./supabase";
import { isSupabaseConfigured } from "../constants/config";

export type SimilarClipResult = {
  clip_id: string;
  similarity: number;
};

/**
 * Fetch clips similar to the given embedding via pgvector cosine similarity.
 */
export async function fetchSimilarClips(
  embedding: number[],
  limit: number = 20,
): Promise<SimilarClipResult[]> {
  if (!isSupabaseConfigured || embedding.length !== 384) return [];

  const { data, error } = await supabase.rpc("similar_clips", {
    query_embedding: embedding,
    limit_n: limit,
  });

  if (error) return [];
  return (data ?? []) as SimilarClipResult[];
}

/**
 * Compute user taste vector as average of last 20 liked/saved clip embeddings.
 */
export function computeUserTasteVector(
  likedClipEmbeddings: number[][],
): number[] {
  const take = Math.min(likedClipEmbeddings.length, 20);
  if (take === 0) return new Array(384).fill(0);

  const subset = likedClipEmbeddings.slice(-take);
  const dim = subset[0]?.length ?? 384;
  const sum = new Array(dim).fill(0);

  for (const emb of subset) {
    for (let i = 0; i < dim; i++) {
      sum[i] += emb[i] ?? 0;
    }
  }

  for (let i = 0; i < dim; i++) {
    sum[i] /= take;
  }

  // Normalize for cosine similarity
  const norm = Math.sqrt(sum.reduce((a, v) => a + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      sum[i] /= norm;
    }
  }

  return sum;
}

/**
 * Cosine similarity between two vectors (0 = orthogonal, 1 = identical).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}
