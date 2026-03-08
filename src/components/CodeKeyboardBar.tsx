import React, { useCallback } from "react";
import {
  InputAccessoryView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";

const MONO_FONT = Platform.select({
  ios: "Courier New" as const,
  default: "monospace" as const,
});

const NATIVE_ID = "code-keyboard-bar";

type Props = {
  tokens: string[];
  onInsertToken: (token: string) => void;
};

function TokenRow({ tokens, onInsertToken }: Props) {
  const handlePress = useCallback(
    (token: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onInsertToken(token);
    },
    [onInsertToken],
  );

  return (
    <View style={{ backgroundColor: "#1a1a1a" }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingVertical: 8,
          gap: 6,
          alignItems: "center",
        }}
      >
        {tokens.map((token, idx) => (
          <Pressable
            key={`${token}-${idx}`}
            onPress={() => handlePress(token)}
            style={({ pressed }) => ({
              backgroundColor: pressed
                ? "rgba(6,182,212,0.25)"
                : "rgba(255,255,255,0.08)",
              borderWidth: 1,
              borderColor: pressed
                ? "rgba(6,182,212,0.5)"
                : "rgba(255,255,255,0.12)",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              minWidth: 32,
              alignItems: "center",
            })}
          >
            <Text
              style={{
                fontFamily: MONO_FONT,
                fontSize: 13,
                color: "#afb3b6",
              }}
            >
              {token}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export { NATIVE_ID as CODE_KEYBOARD_BAR_ID };

export default function CodeKeyboardBar({ tokens, onInsertToken }: Props) {
  if (Platform.OS === "ios") {
    return (
      <InputAccessoryView nativeID={NATIVE_ID}>
        <TokenRow tokens={tokens} onInsertToken={onInsertToken} />
      </InputAccessoryView>
    );
  }

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
      }}
    >
      <TokenRow tokens={tokens} onInsertToken={onInsertToken} />
    </View>
  );
}
