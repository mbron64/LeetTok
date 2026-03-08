import React from "react";
import { Platform, TextInput, type TextInputProps } from "react-native";

const MONO_FONT = Platform.select({
  ios: "Courier New",
  default: "monospace",
});

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  indentLevel?: number;
} & Omit<TextInputProps, "value" | "onChangeText" | "placeholder">;

export default function CodeInput({
  value,
  onChangeText,
  placeholder = "Type your answer...",
  indentLevel = 0,
  style,
  ...rest
}: Props) {
  const indent = "  ".repeat(indentLevel);

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={`${indent}${placeholder}`}
      placeholderTextColor="rgba(255,255,255,0.25)"
      autoCorrect={false}
      spellCheck={false}
      autoCapitalize="none"
      autoComplete="off"
      keyboardType="ascii-capable"
      keyboardAppearance="dark"
      style={[
        {
          fontFamily: MONO_FONT,
          fontSize: 14,
          lineHeight: 22,
          color: "#e4e4e7",
          backgroundColor: "#1e1e2e",
          borderWidth: 1.5,
          borderColor: "#06b6d4",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          minHeight: 44,
        },
        style,
      ]}
      {...rest}
    />
  );
}
