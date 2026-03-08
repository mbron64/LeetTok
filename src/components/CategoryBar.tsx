import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const CATEGORIES = ["For You", "MadLeets", "NeetCode 150", "Trending", "New"] as const;
export type Category = (typeof CATEGORIES)[number];

type Props = {
  active: Category;
  onCategoryChange: (category: Category) => void;
  onSearchPress?: () => void;
};

export default function CategoryBar({ active, onCategoryChange, onSearchPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute left-0 right-0 z-10 flex-row items-center bg-black/40"
      style={{ top: 0, paddingTop: insets.top }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row items-center px-4 py-2.5 gap-5"
        className="flex-1"
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat === active;
          return (
            <Pressable key={cat} onPress={() => onCategoryChange(cat)}>
              <Text
                className={`text-[15px] ${isActive ? "font-bold text-white" : "font-normal text-white/60"}`}
              >
                {cat}
              </Text>
              {isActive && (
                <View className="mx-auto mt-1 h-[2px] w-5 rounded-full bg-white" />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable onPress={onSearchPress} className="pr-4 pl-2">
        <Ionicons name="search" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}
