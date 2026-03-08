import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ProgressData, TopicBreakdown } from "../lib/progress";
import { getXPForNextLevel } from "../lib/xp";

type Props = {
  data: ProgressData;
};

function XPLevelCard({ data }: Props) {
  const { current, needed } = getXPForNextLevel(data.totalXP);
  const progress = needed > 0 ? current / needed : 0;

  return (
    <View className="mb-4 rounded-2xl bg-[#111] p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#fbb862]/15">
            <Ionicons name="star" size={20} color="#fbb862" />
          </View>
          <View>
            <Text className="text-xs text-gray-500">LEVEL</Text>
            <Text className="text-2xl font-bold text-white">
              {data.level}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-xs text-gray-500">TOTAL XP</Text>
          <Text className="text-lg font-bold text-[#fbb862]">
            {data.totalXP.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* XP progress bar */}
      <View className="mb-1 h-3 overflow-hidden rounded-full bg-[#1a1a1a]">
        <View
          className="h-full rounded-full bg-[#fbb862]"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </View>
      <Text className="text-right text-[10px] text-gray-500">
        {current} / {needed} XP to Level {data.level + 1}
      </Text>
    </View>
  );
}

function StreakCard({ data }: Props) {
  return (
    <View className="mb-4 flex-row gap-3">
      <View className="flex-1 rounded-2xl bg-[#111] p-4">
        <View className="mb-1 flex-row items-center gap-1.5">
          <Text className="text-lg">🔥</Text>
          <Text className="text-xs font-semibold uppercase text-gray-500">
            Streak
          </Text>
        </View>
        <Text className="text-3xl font-bold text-white">
          {data.streak.currentStreak}
        </Text>
        <Text className="text-[10px] text-gray-500">days</Text>
      </View>

      <View className="flex-1 rounded-2xl bg-[#111] p-4">
        <View className="mb-1 flex-row items-center gap-1.5">
          <Text className="text-lg">🏆</Text>
          <Text className="text-xs font-semibold uppercase text-gray-500">
            Best
          </Text>
        </View>
        <Text className="text-3xl font-bold text-white">
          {data.streak.longestStreak}
        </Text>
        <Text className="text-[10px] text-gray-500">days</Text>
      </View>

      <View className="flex-1 rounded-2xl bg-[#111] p-4">
        <View className="mb-1 flex-row items-center gap-1.5">
          <Text className="text-lg">🧊</Text>
          <Text className="text-xs font-semibold uppercase text-gray-500">
            Freezes
          </Text>
        </View>
        <Text className="text-3xl font-bold text-white">
          {data.streak.streakFreezes}
        </Text>
        <Text className="text-[10px] text-gray-500">available</Text>
      </View>
    </View>
  );
}

function AccuracyCard({ data }: Props) {
  return (
    <View className="mb-4 rounded-2xl bg-[#111] p-4">
      <Text className="mb-3 text-xs font-semibold uppercase text-gray-500">
        Accuracy
      </Text>
      <View className="flex-row items-end justify-between">
        <View className="flex-row items-end gap-1">
          <Text className="text-4xl font-bold text-white">
            {data.accuracy}
          </Text>
          <Text className="mb-1.5 text-lg text-gray-500">%</Text>
        </View>
        <View className="items-end">
          <Text className="text-sm text-[#22c55e]">
            {data.challengesCorrect} correct
          </Text>
          <Text className="text-xs text-gray-500">
            of {data.challengesCompleted} attempted
          </Text>
        </View>
      </View>
    </View>
  );
}

function TopicBar({ topic }: { topic: TopicBreakdown }) {
  return (
    <View className="mb-2.5">
      <View className="mb-1 flex-row items-center justify-between">
        <Text className="text-xs text-gray-300">{topic.topic}</Text>
        <Text className="text-[10px] text-gray-500">
          {topic.correct}/{topic.total} ({topic.accuracy}%)
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
        <View
          className="h-full rounded-full"
          style={{
            width: `${topic.accuracy}%`,
            backgroundColor:
              topic.accuracy >= 70
                ? "#22c55e"
                : topic.accuracy >= 40
                  ? "#fbb862"
                  : "#ef4444",
          }}
        />
      </View>
    </View>
  );
}

function TopicBreakdownCard({ data }: Props) {
  if (data.topicBreakdown.length === 0) {
    return (
      <View className="mb-4 rounded-2xl bg-[#111] p-4">
        <Text className="mb-2 text-xs font-semibold uppercase text-gray-500">
          Topics
        </Text>
        <Text className="text-xs text-gray-600">
          Complete challenges to see topic breakdown
        </Text>
      </View>
    );
  }

  return (
    <View className="mb-4 rounded-2xl bg-[#111] p-4">
      <Text className="mb-3 text-xs font-semibold uppercase text-gray-500">
        Topics
      </Text>
      {data.topicBreakdown.map((topic) => (
        <TopicBar key={topic.topic} topic={topic} />
      ))}
    </View>
  );
}

function DifficultyCard({ data }: Props) {
  const difficulties = [
    { key: "Easy" as const, color: "#22c55e", bg: "bg-[#22c55e]/15" },
    { key: "Medium" as const, color: "#fbb862", bg: "bg-[#fbb862]/15" },
    { key: "Hard" as const, color: "#ef4444", bg: "bg-[#ef4444]/15" },
  ];

  return (
    <View className="mb-4 rounded-2xl bg-[#111] p-4">
      <Text className="mb-3 text-xs font-semibold uppercase text-gray-500">
        Difficulty Breakdown
      </Text>
      <View className="flex-row gap-3">
        {difficulties.map(({ key, color, bg }) => {
          const entry = data.difficultyBreakdown[key];
          return (
            <View key={key} className={`flex-1 items-center rounded-xl p-3 ${bg}`}>
              <Text
                className="text-lg font-bold"
                style={{ color }}
              >
                {entry.total}
              </Text>
              <Text className="text-[10px]" style={{ color }}>
                {key}
              </Text>
              {entry.total > 0 && (
                <Text className="mt-0.5 text-[10px] text-gray-500">
                  {Math.round((entry.correct / entry.total) * 100)}% acc
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function WeakestTopicsCard({ data }: Props) {
  if (data.weakestTopics.length === 0) return null;

  return (
    <View className="mb-4 rounded-2xl bg-[#111] p-4">
      <View className="mb-3 flex-row items-center gap-2">
        <Ionicons name="alert-circle" size={14} color="#ef4444" />
        <Text className="text-xs font-semibold uppercase text-gray-500">
          Weakest Topics
        </Text>
      </View>
      {data.weakestTopics.map((topic) => (
        <View
          key={topic.topic}
          className="mb-2 flex-row items-center justify-between rounded-lg bg-[#ef4444]/5 px-3 py-2"
        >
          <Text className="text-sm text-gray-300">{topic.topic}</Text>
          <Text className="text-xs font-semibold text-[#ef4444]">
            {topic.accuracy}%
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function ProgressStats({ data }: Props) {
  return (
    <View className="mx-4 mt-2">
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Progress
      </Text>
      <XPLevelCard data={data} />
      <StreakCard data={data} />
      <AccuracyCard data={data} />
      <DifficultyCard data={data} />
      <TopicBreakdownCard data={data} />
      <WeakestTopicsCard data={data} />
    </View>
  );
}
