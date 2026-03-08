import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { TestCaseResult } from "../lib/codeExecution";
import { theme } from "../constants/theme";

type Props = {
  results: TestCaseResult[] | null;
  error: string | null;
  loading: boolean;
  isSubmit?: boolean;
};

function formatJsonForDisplay(s: string): string {
  try {
    const parsed = JSON.parse(s);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return s;
  }
}

function DiffLine({
  label,
  value,
  isExpected,
}: {
  label: string;
  value: string;
  isExpected: boolean;
}) {
  const color = isExpected ? theme.colors.success : theme.colors.error;
  return (
    <View className="mb-2">
      <Text className="text-[#666] text-xs mb-0.5">{label}</Text>
      <View
        style={{ borderLeftWidth: 3, borderLeftColor: color }}
        className="pl-2 py-1"
      >
        <Text className="text-[#c9d1d9] text-xs font-mono break-all">{value}</Text>
      </View>
    </View>
  );
}

function getStatusDisplay(status: string, error?: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("compilation") || s.includes("compile")) return "Compilation Error";
  if (s.includes("runtime") || s.includes("error")) return "Runtime Error";
  if (s.includes("tle") || s.includes("time limit")) return "Time Limit Exceeded";
  if (s.includes("mle") || s.includes("memory")) return "Memory Limit Exceeded";
  if (error) return error;
  return status || "Unknown";
}

export default function TestResults({
  results,
  error,
  loading,
  isSubmit = false,
}: Props) {
  if (loading) {
    return (
      <View className="py-8 items-center">
        <Text className="text-[#a0a0a0]">Running...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="py-4 px-4 rounded-lg bg-red-500/10 border border-red-500/30">
        <View className="flex-row items-center gap-2 mb-1">
          <Ionicons name="close-circle" size={20} color={theme.colors.error} />
          <Text className="text-red-400 font-medium">Error</Text>
        </View>
        <Text className="text-[#c9d1d9] text-sm">{error}</Text>
      </View>
    );
  }

  if (!results || results.length === 0) {
    return null;
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const allPassed = passed === total;

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="pb-6"
      showsVerticalScrollIndicator={false}
    >
      <View
        className={`flex-row items-center gap-2 py-3 px-4 rounded-lg mb-4 ${
          allPassed ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"
        }`}
      >
        {allPassed ? (
          <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
        ) : (
          <Ionicons name="close-circle" size={24} color={theme.colors.error} />
        )}
        <Text
          className={allPassed ? "text-green-400 font-semibold" : "text-red-400 font-semibold"}
        >
          {allPassed
            ? isSubmit
              ? "All test cases passed!"
              : "Sample tests passed!"
            : `${passed}/${total} test cases passed`}
        </Text>
      </View>

      {results.map((r, idx) => (
        <View
          key={idx}
          className={`mb-3 p-3 rounded-lg border ${
            r.passed ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
          }`}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              {r.passed ? (
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
              ) : (
                <Ionicons name="close-circle" size={18} color={theme.colors.error} />
              )}
              <Text className="text-white font-medium text-sm">
                Test case {idx + 1} {r.passed ? "Passed" : "Failed"}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Text className="text-[#666] text-xs">{r.time}</Text>
              <Text className="text-[#666] text-xs">{r.memory} KB</Text>
            </View>
          </View>

          {!r.passed && (
            <View className="mt-2 gap-2">
              <DiffLine
                label="Expected:"
                value={formatJsonForDisplay(r.expected_output)}
                isExpected
              />
              <DiffLine
                label="Actual:"
                value={formatJsonForDisplay(r.actual_output)}
                isExpected={false}
              />
              {(r.status || r.error) && (
                <View className="mt-1">
                  <Text className="text-[#666] text-xs mb-0.5">Status</Text>
                  <Text className="text-amber-400 text-xs">
                    {getStatusDisplay(r.status, r.error)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
