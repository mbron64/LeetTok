import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getWrapper } from "./wrappers.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const DAILY_SUBMISSION_LIMIT = 10;
const JUDGE0_URL = Deno.env.get("JUDGE0_URL") || "https://ce.judge0.com";
const JUDGE0_AUTH_TOKEN = Deno.env.get("JUDGE0_AUTH_TOKEN") || "";

interface TestCase {
  input: string;
  expected_output: string;
}

interface RequestBody {
  code: string;
  language_id: number;
  test_cases: TestCase[];
  function_name?: string;
}

interface Judge0Submission {
  token?: string;
  language_id?: string;
  source_code?: string;
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  message?: string;
  status?: { id: number; description: string };
  status_id?: number;
  time?: string;
  memory?: number;
}

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

async function checkRateLimit(userId: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseAdmin
    .from("code_execution_usage")
    .select("submission_count")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  const count = data?.submission_count ?? 0;
  return count >= DAILY_SUBMISSION_LIMIT;
}

async function incrementUsage(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await supabaseAdmin.rpc("increment_code_execution_usage", {
    p_user_id: userId,
  });
}

async function submitBatchToJudge0(
  submissions: Array<{ source_code: string; language_id: number; stdin: string }>
): Promise<string[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (JUDGE0_AUTH_TOKEN) {
    headers["X-Auth-Token"] = JUDGE0_AUTH_TOKEN;
  }

  const res = await fetch(`${JUDGE0_URL}/submissions/batch?base64_encoded=false`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      submissions: submissions.map((s) => ({
        source_code: s.source_code,
        language_id: s.language_id,
        stdin: s.stdin,
      })),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Judge0 batch submit failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Judge0 batch did not return array");
  }
  return data.map((d: { token?: string }) => {
    if (!d?.token) throw new Error("Judge0 submission missing token");
    return d.token;
  });
}

async function getBatchFromJudge0(tokens: string[]): Promise<Judge0Submission[]> {
  const headers: Record<string, string> = {};
  if (JUDGE0_AUTH_TOKEN) {
    headers["X-Auth-Token"] = JUDGE0_AUTH_TOKEN;
  }

  const tokenStr = tokens.join(",");
  const res = await fetch(
    `${JUDGE0_URL}/submissions/batch?tokens=${encodeURIComponent(tokenStr)}&base64_encoded=false&fields=stdout,stderr,status_id,status,time,memory,compile_output,message`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Judge0 batch get failed: ${res.status}`);
  }
  const data = await res.json();
  return data.submissions ?? [];
}

async function pollBatch(
  tokens: string[],
  maxAttempts = 30
): Promise<Judge0Submission[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const subs = await getBatchFromJudge0(tokens);
    const allDone = subs.every((s) => {
      const id = s.status_id ?? s.status?.id ?? 0;
      return id >= 3;
    });
    if (allDone) return subs;
    const delay = Math.min(1000 * Math.pow(1.5, attempt), 10000);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error("Judge0 polling timeout");
}

function parseOutput(stdout: string | null): { result?: unknown; error?: string } {
  if (!stdout || !stdout.trim()) {
    return { error: "No output" };
  }
  try {
    const lastLine = stdout.trim().split("\n").pop() || "";
    const parsed = JSON.parse(lastLine);
    if (parsed.error) return { error: parsed.error };
    return { result: parsed.result };
  } catch {
    return { error: stdout.trim().slice(0, 500) };
  }
}

function normalizeOutput(result: unknown): string {
  if (result === null || result === undefined) return "";
  if (Array.isArray(result)) {
    return JSON.stringify(result);
  }
  if (typeof result === "object") {
    return JSON.stringify(result);
  }
  return String(result);
}

function outputsMatch(actual: string, expected: string): boolean {
  const a = actual.trim();
  const b = expected.trim();
  if (a === b) return true;
  try {
    const pa = JSON.parse(a);
    const pb = JSON.parse(b);
    return JSON.stringify(pa) === JSON.stringify(pb);
  } catch {
    return false;
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

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (await checkRateLimit(user.id)) {
    return jsonResponse(
      {
        error: "Rate limit exceeded",
        message: `You've used all ${DAILY_SUBMISSION_LIMIT} code submissions for today.`,
      },
      429
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { code, language_id, test_cases, function_name = "solve" } = body;
  if (!code || !language_id || !test_cases || !Array.isArray(test_cases)) {
    return jsonResponse({
      error: "Missing required fields: code, language_id, test_cases",
    }, 400);
  }

  try {
    const submissions: Array<{ source_code: string; language_id: number; stdin: string }> = [];
    for (const tc of test_cases) {
      let wrappedCode: string;
      try {
        wrappedCode = getWrapper(language_id, code, tc.input, function_name);
      } catch {
        return jsonResponse({
          error: `Unsupported language_id: ${language_id}`,
        }, 400);
      }
      submissions.push({
        source_code: wrappedCode,
        language_id,
        stdin: tc.input,
      });
    }

    const tokens = await submitBatchToJudge0(submissions);
    const subs = await pollBatch(tokens);

    const results = subs.map((submission, i) => {
      const tc = test_cases[i];
      const statusId = submission.status_id ?? submission.status?.id ?? 0;
      const statusDesc =
        submission.status?.description ?? `Status ${statusId}`;
      const time = submission.time ?? "0";
      const memory = submission.memory ?? 0;

      const { result, error } = parseOutput(submission.stdout);
      const actualOutput = result !== undefined
        ? normalizeOutput(result)
        : (error ?? submission.stderr ?? submission.compile_output ?? submission.message ?? "No output");
      const expectedOutput = tc.expected_output.trim();
      const passed =
        statusId === 3 &&
        outputsMatch(String(actualOutput), expectedOutput) &&
        !error;

      return {
        passed,
        actual_output: String(actualOutput),
        expected_output: expectedOutput,
        time: String(time),
        memory: Number(memory),
        status: statusDesc,
        ...(error && { error }),
      };
    });

    await incrementUsage(user.id);
    return jsonResponse(results);
  } catch (err) {
    console.error("run-code error:", err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Execution failed" },
      500
    );
  }
});
