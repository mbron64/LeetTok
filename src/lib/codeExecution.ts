/**
 * Client for code execution via Supabase Edge Function.
 */

import { SUPABASE_URL } from "../constants/config";

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
}

export async function submitCode({
  code,
  languageId,
  testCases,
  accessToken,
  functionName = "solve",
}: SubmitCodeOptions): Promise<SubmissionResult> {
  const fnUrl = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/run-code`;

  const res = await fetch(fnUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      code,
      language_id: languageId,
      test_cases: testCases,
      function_name: functionName,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error ?? data?.message ?? `Request failed: ${res.status}`);
  }

  return data as SubmissionResult;
}
