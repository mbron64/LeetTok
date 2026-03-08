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
      style={{ position: "absolute", left: 0, right: 0, zIndex: 10, flexDirection: "row", alignItems: "center", top: 0, paddingTop: insets.top }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 20 }}
        style={{ flex: 1 }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat === active;
          return (
            <Pressable key={cat} onPress={() => onCategoryChange(cat)}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: isActive ? "700" : "400",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                {cat}
              </Text>
              {isActive && (
                <View
                  style={{
                    marginTop: 4,
                    height: 2,
                    width: 20,
                    borderRadius: 9999,
                    backgroundColor: "#fff",
                    alignSelf: "center",
                  }}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable onPress={onSearchPress} style={{ paddingRight: 16, paddingLeft: 8 }}>
        <Ionicons name="search" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}
