import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const EMBEDDING_DIM = 384;

interface RequestBody {
  clipId?: string;
  title?: string;
  transcript?: string;
  topics?: string[];
  difficulty?: string;
}

// TODO: restrict Access-Control-Allow-Origin to your app's domain in production
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function buildInputText(
  title: string,
  transcript: string,
  topics: string[],
  difficulty: string
): string {
  const parts: string[] = [];
  if (title) parts.push(title);
  if (transcript) parts.push(transcript);
  if (topics?.length) parts.push(topics.join(" "));
  if (difficulty) parts.push(difficulty);
  return parts.join(" ").trim() || "unknown";
}

/**
 * Fallback: simple hash-based 384-dim vector when Supabase AI is unavailable.
 */
function tfidfFallback(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

  for (const token of tokens) {
    let h = 0;
    for (let i = 0; i < token.length; i++) {
      h = (h * 31 + token.charCodeAt(i)) >>> 0;
    }
    const idx = Math.abs(h) % EMBEDDING_DIM;
    vec[idx] += 1;
  }

  const norm = Math.sqrt(vec.reduce((a, v) => a + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  }
  return vec;
}

async function generateEmbeddingWithAI(input: string): Promise<number[] | null> {
  try {
    // Supabase.ai is a global in the Edge Runtime
    const Supabase = (globalThis as { Supabase?: { ai: { Session: new (m: string) => { run: (i: string, o: object) => Promise<unknown> } } } }).Supabase;
    if (!Supabase?.ai?.Session) return null;

    const session = new Supabase.ai.Session("gte-small");
    const output = await session.run(input, {
      mean_pool: true,
      normalize: true,
    });

    if (Array.isArray(output)) return output;
    if (output && typeof output === "object" && "data" in output) {
      return Array.from((output as { data: Iterable<number> }).data);
    }
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  let title = body.title ?? "";
  let transcript = body.transcript ?? "";
  let topics: string[] = body.topics ?? [];
  let difficulty = body.difficulty ?? "";
  let clipId = body.clipId;

  if (clipId) {
    const { data: clip, error: clipError } = await supabaseAdmin
      .from("clips")
      .select("id, title, transcript, problem_id")
      .eq("id", clipId)
      .single();

    if (clipError || !clip) {
      return jsonResponse({ error: "Clip not found" }, 404);
    }

    clipId = clip.id;
    title = clip.title ?? title;
    transcript = clip.transcript ?? transcript;

    if (clip.problem_id) {
      const { data: problem } = await supabaseAdmin
        .from("problems")
        .select("topics, difficulty")
        .eq("id", clip.problem_id)
        .single();

      if (problem) {
        topics = problem.topics ?? topics;
        difficulty = problem.difficulty ?? difficulty;
      }
    }
  } else if (!title && !transcript) {
    return jsonResponse(
      { error: "Provide clipId or (title, transcript, topics, difficulty)" },
      400
    );
  }

  const input = buildInputText(title, transcript, topics, difficulty);
  let embedding = await generateEmbeddingWithAI(input);

  if (!embedding || embedding.length !== EMBEDDING_DIM) {
    embedding = tfidfFallback(input);
  }

  if (clipId) {
    const { error: updateError } = await supabaseAdmin
      .from("clips")
      .update({ embedding })
      .eq("id", clipId);

    if (updateError) {
      return jsonResponse({ error: "Failed to update clip embedding" }, 500);
    }
  }

  return jsonResponse({
    embedding,
    clipId: clipId ?? null,
  });
});
