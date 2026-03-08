import React from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const QUICK_ACTIONS = [
  "Explain this",
  "Time/Space",
  "Give me a hint",
  "Other approaches?",
  "Why this works",
] as const;

type Props = {
  onSend: (message: string) => void;
  collapsed: boolean;
  onToggle: () => void;
};

export default function QuickActionChips({
  onSend,
  collapsed,
  onToggle,
}: Props) {
  if (collapsed) {
    return (
      <Pressable
        onPress={onToggle}
        className="mb-2 flex-row items-center gap-2"
      >
        <View className="h-8 w-8 items-center justify-center rounded-full bg-[#222]">
          <Ionicons name="add" size={18} color="#afb3b6" />
        </View>
        <Text className="text-sm text-[#afb3b6]">Quick actions</Text>
      </Pressable>
    );
  }

  return (
    <View className="mb-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs text-[#afb3b6]">Quick actions</Text>
        <Pressable
          onPress={onToggle}
          className="h-6 w-6 items-center justify-center rounded-full bg-[#222]"
        >
          <Ionicons name="chevron-up" size={14} color="#afb3b6" />
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      >
        {QUICK_ACTIONS.map((label) => (
          <Pressable
            key={label}
            onPress={() => onSend(label)}
            className="rounded-full bg-[#222] px-4 py-2"
          >
            <Text className="text-sm text-white">{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
