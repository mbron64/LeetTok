// TODO: restrict Access-Control-Allow-Origin to your app's domain in production
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const DAILY_LIMIT = 20;

interface ClipContext {
  clipId: string;
  problemTitle: string;
  problemNumber: number;
  difficulty: string;
  topics: string[];
  transcript: string;
  codeSnippets: string[];
}

function buildSystemPrompt(clipContext: ClipContext): string {
  const { problemNumber, problemTitle, difficulty, topics, transcript, codeSnippets } = clipContext;
  const topicsStr = Array.isArray(topics) ? topics.join(", ") : String(topics);

  let prompt = `You are LeetTok Tutor, an expert coding tutor embedded in a short-form video app.
The user is watching a clip about the following LeetCode problem:

**Problem**: #${problemNumber} - ${problemTitle}
**Difficulty**: ${difficulty}
**Topics**: ${topicsStr}

**Video transcript**:
${transcript}
`;

  if (codeSnippets && codeSnippets.length > 0) {
    prompt += `
**Code shown in the video**:
${codeSnippets.join("\n---\n")}
`;
  }

  prompt += `
Rules:
- Answer questions about THIS specific problem and the approach shown in the video.
- Keep answers concise (2-4 paragraphs max). The user is on mobile.
- Use code blocks with syntax highlighting when showing code.
- If the user asks about time/space complexity, reference the specific approach in the video.
- If the user seems confused about a prerequisite concept, give a brief explanation first.
- Never give away the full solution unprompted. Guide the user to think through it.
- Use Socratic questioning when appropriate.
- You can reference specific moments from the transcript.
`;

  return prompt;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
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

  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await supabaseAdmin
    .from("tutor_usage")
    .select("message_count")
    .eq("user_id", user.id)
    .eq("date", today)
    .single();

  if (usage && usage.message_count >= DAILY_LIMIT) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: `You've used all ${DAILY_LIMIT} tutor messages for today. Come back tomorrow!`,
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }

  let body: { messages?: { role: string; content: string }[]; clipContext?: ClipContext };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const { messages, clipContext } = body;
  if (!messages || !Array.isArray(messages) || !clipContext) {
    return new Response(
      JSON.stringify({ error: "Missing messages or clipContext" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }

  const systemPrompt = buildSystemPrompt(clipContext);

  const encoder = new TextEncoder();
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
      max_tokens: 1024,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          await supabaseAdmin.rpc("increment_tutor_usage", { p_user_id: user.id });
          controller.close();
        }
      },
    });

    return new Response(readable, { headers: corsHeaders });
  } catch (err) {
    console.error("OpenAI error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to get tutor response" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
