import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

function MadLeetsButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.centerBtnOuter}>
      <View style={styles.centerBtnBorder}>
        <View style={styles.centerBtnInner}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.centerBtnLogo}
          />
        </View>
      </View>
    </Pressable>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(0,0,0,0.85)",
          borderTopColor: "rgba(255,255,255,0.08)",
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 80,
          paddingBottom: 24,
          paddingTop: 6,
          position: "absolute",
        },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#5c6370",
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
    top: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 56,
    alignSelf: "center",
  },
  centerBtnBorder: {
    width: 50,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#fbb862",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  centerBtnInner: {
    width: 44,
    height: 38,
    borderRadius: 9,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  centerBtnLogo: {
    width: 52,
    height: 52,
  },
});
