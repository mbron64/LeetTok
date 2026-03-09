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

  // #region agent log
  fetch('http://127.0.0.1:7360/ingest/6c8e6634-9421-411a-9ff6-fab53aed419d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a81f82'},body:JSON.stringify({sessionId:'a81f82',runId:'run-code-rate-limit',hypothesisId:'C1',location:'src/lib/codeExecution.ts:submitCode',message:'Submitting code execution request',data:{action,languageId,testCaseCount:testCases.length,codeLength:code.length,functionName},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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

  // #region agent log
  fetch('http://127.0.0.1:7360/ingest/6c8e6634-9421-411a-9ff6-fab53aed419d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a81f82'},body:JSON.stringify({sessionId:'a81f82',runId:'run-code-visibility',hypothesisId:'U1',location:'src/lib/codeExecution.ts:submitCode',message:'Received code execution response',data:{action,status:res.status,ok:res.ok,isArray:Array.isArray(data),resultCount:Array.isArray(data)?data.length:null,firstResult:Array.isArray(data)&&data.length>0&&typeof data[0]==='object'?{passed:(data[0] as TestCaseResult).passed,status:(data[0] as TestCaseResult).status,actual_output:(data[0] as TestCaseResult).actual_output,expected_output:(data[0] as TestCaseResult).expected_output}:null,response:(data as {error?: string; message?: string} | null)?.error ?? (data as {error?: string; message?: string} | null)?.message ?? null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (!res.ok) {
    const errorData = data as { error?: string; message?: string } | null;
    throw new Error(errorData?.error ?? errorData?.message ?? `Request failed: ${res.status}`);
  }

  return data as SubmissionResult;
}
