import React from "react";
import { Text, View } from "react-native";
import type { TutorMessage as TutorMessageType } from "../lib/tutor";

type Props = {
  message: TutorMessageType;
};

/**
 * Parses content for code blocks (```...```) and returns segments.
 */
function parseContent(content: string): Array<{ type: "text" | "code"; value: string }> {
  const segments: Array<{ type: "text" | "code"; value: string }> = [];
  const regex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", value: match[1].trim() });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  if (segments.length === 0 && content) {
    segments.push({ type: "text", value: content });
  }

  return segments;
}

export default function TutorMessage({ message }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View className="mb-3 flex-row justify-end">
        <View className="max-w-[85%] rounded-2xl rounded-br-md bg-[#1e1e1e] px-4 py-3">
          <Text className="text-[15px] leading-[22px] text-white">
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  const segments = parseContent(message.content);

  return (
    <View className="mb-3 flex-row justify-start">
      <View className="max-w-[85%] rounded-2xl rounded-bl-md bg-[#2a2a2a] px-4 py-3">
        {segments.map((seg, i) =>
          seg.type === "code" ? (
            <View
              key={i}
              className="my-1.5 overflow-hidden rounded-lg bg-[#1e1e1e] px-3 py-2"
            >
              <Text
                className="font-mono text-[13px] leading-[20px] text-white"
                selectable
              >
                {seg.value}
              </Text>
            </View>
          ) : (
            <Text
              key={i}
              className="text-[15px] leading-[22px] text-white"
              selectable
            >
              {seg.value}
            </Text>
          )
        )}
      </View>
    </View>
  );
}
