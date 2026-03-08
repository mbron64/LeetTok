import React, { forwardRef, useCallback } from "react";
import {
  Platform,
  TextInput,
  type NativeSyntheticEvent,
  type TextInputProps,
  type TextInputSelectionChangeEventData,
} from "react-native";

const MONO_FONT = Platform.select({
  ios: "Courier New",
  default: "monospace",
});

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  indentLevel?: number;
  inputAccessoryViewID?: string;
  onFocusChange?: (focused: boolean) => void;
  onSelectionChange?: (
    e: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => void;
} & Omit<
  TextInputProps,
  "value" | "onChangeText" | "placeholder" | "onSelectionChange"
>;

const CodeInput = forwardRef<TextInput, Props>(function CodeInput(
  {
    value,
    onChangeText,
    placeholder = "Type your answer...",
    indentLevel = 0,
    inputAccessoryViewID,
    onFocusChange,
    onSelectionChange,
    style,
    ...rest
  },
  ref,
) {
  const indent = "  ".repeat(indentLevel);

  const handleFocus = useCallback(() => onFocusChange?.(true), [onFocusChange]);
  const handleBlur = useCallback(() => onFocusChange?.(false), [onFocusChange]);

  return (
    <TextInput
      ref={ref}
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
      inputAccessoryViewID={inputAccessoryViewID}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onSelectionChange={onSelectionChange}
      style={[
        {
          fontFamily: MONO_FONT,
          fontSize: 14,
          lineHeight: 22,
          color: "#e4e4e7",
          backgroundColor: "#1a1a1a",
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
});

export default CodeInput;
