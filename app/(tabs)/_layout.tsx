import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

function MadLeetsButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.centerBtnOuter}>
      <LinearGradient
        colors={["#00f2ea", "#ff0050"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.centerBtnGradient}
      >
        <View style={styles.centerBtnInner}>
          <Ionicons name="code-slash" size={22} color="#fff" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#000",
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 80,
          paddingBottom: 24,
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#888",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="madleets"
        options={{
          title: "",
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <MadLeetsButton onPress={props.onPress as () => void} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: "Bookmarks",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerBtnOuter: {
    top: -14,
    justifyContent: "center",
    alignItems: "center",
    width: 56,
    alignSelf: "center",
  },
  centerBtnGradient: {
    width: 48,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  centerBtnInner: {
    flex: 1,
    width: "100%",
    backgroundColor: "#000",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
