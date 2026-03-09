/**
 * Client for code execution via Supabase Edge Function.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants/config";

export const LANGUAGE_IDS = {
  python: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
} as const;

export type TestCaseResult = {
  passed: boolean;
  actual_output: string;
  expected_output: string;
  time: string;
  memory: number;
  status: string;
  error?: string;
};

export type SubmissionResult = TestCaseResult[];

export interface SubmitCodeOptions {
  code: string;
  languageId: number;
  testCases: Array<{ input: string; expected_output: string }>;
  accessToken: string;
  functionName?: string;
  action?: "run" | "submit";
}

export async function submitCode({
  code,
  languageId,
  testCases,
  accessToken,
  functionName = "solve",
  action = "run",
}: SubmitCodeOptions): Promise<SubmissionResult> {
  const fnUrl = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/run-code`;

  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      code,
      language_id: languageId,
      test_cases: testCases,
      function_name: functionName,
      action,
    }),
  });

  const raw = await res.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { message: raw };
  }

  if (!res.ok) {
    const errorData = data as { error?: string; message?: string } | null;
    throw new Error(errorData?.error ?? errorData?.message ?? `Request failed: ${res.status}`);
  }

  return data as SubmissionResult;
}
