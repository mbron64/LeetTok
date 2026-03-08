import { SUPABASE_URL } from "../constants/config";

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClipContext {
  clipId: string;
  problemTitle: string;
  problemNumber: number;
  difficulty: string;
  topics: string[];
  transcript: string;
  codeSnippets: string[];
}

/**
 * Streams a tutor response from the chat-tutor Edge Function.
 * Parses SSE format: data: {"text": "token"}\n\n, ending with data: [DONE]\n\n
 */
export async function streamTutorResponse(
  messages: TutorMessage[],
  clipContext: ClipContext,
  supabaseAccessToken: string,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const url = `${SUPABASE_URL}/functions/v1/chat-tutor`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAccessToken}`,
      },
      body: JSON.stringify({ messages, clipContext }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errMsg = `Request failed: ${response.status}`;
      try {
        const parsed = JSON.parse(errBody);
        errMsg = parsed.error || parsed.message || errMsg;
      } catch {
        if (errBody) errMsg = errBody;
      }
      onError(errMsg);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed?.text) {
              onToken(parsed.text);
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    }

    // Check for [DONE] in remaining buffer
    if (buffer.trim().startsWith("data: ")) {
      const data = buffer.trim().slice(6);
      if (data === "[DONE]") {
        onDone();
        return;
      }
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : String(err));
  }
}
