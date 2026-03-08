import React, { useCallback, useMemo } from "react";
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

const COMMON_SYMBOLS = ["Tab", "{", "}", "(", ")", "[", "]", "=", ";", ":", ".", ","];

const PYTHON_SYMBOLS = [":", "def", "self", "in", "range", ...COMMON_SYMBOLS];
const JAVASCRIPT_SYMBOLS = ["{", "}", ";", "const", "=>", ...COMMON_SYMBOLS];
const JAVA_SYMBOLS = ["{", "}", ";", "public", "return", ...COMMON_SYMBOLS];
const CPP_SYMBOLS = ["{", "}", ";", "int", "return", ...COMMON_SYMBOLS];

function getSymbolsForLanguage(language: string): string[] {
  const lang = language.toLowerCase();
  if (lang === "python") return PYTHON_SYMBOLS;
  if (lang === "javascript" || lang === "js") return JAVASCRIPT_SYMBOLS;
  if (lang === "java") return JAVA_SYMBOLS;
  if (lang === "cpp" || lang === "c++") return CPP_SYMBOLS;
  return COMMON_SYMBOLS;
}

type Props = {
  language: string;
  onInsert: (text: string) => void;
  inputAccessoryViewID: string;
};

function SymbolRow({ symbols, onInsert }: { symbols: string[]; onInsert: (t: string) => void }) {
  const handlePress = useCallback(
    (text: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onInsert(text);
    },
    [onInsert],
  );

  return (
    <View className="bg-[#1a1a2e]">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerClassName="px-2 py-2 gap-1.5 items-center"
      >
        {symbols.map((sym, idx) => (
          <Pressable
            key={`${sym}-${idx}`}
            onPress={() => handlePress(sym)}
            className="rounded-lg px-3 py-1.5 min-w-[28px] items-center active:bg-cyan-500/25 border border-white/10 active:border-cyan-500/50"
          >
            <Text style={{ fontFamily: MONO_FONT, fontSize: 13 }} className="text-[#c9d1d9]">
              {sym}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function CodeSymbolBar({
  language,
  onInsert,
  inputAccessoryViewID,
}: Props) {
  const symbols = useMemo(() => getSymbolsForLanguage(language), [language]);

  if (Platform.OS === "ios") {
    return (
      <InputAccessoryView nativeID={inputAccessoryViewID}>
        <SymbolRow symbols={symbols} onInsert={onInsert} />
      </InputAccessoryView>
    );
  }

  return (
    <View className="absolute bottom-0 left-0 right-0">
      <SymbolRow symbols={symbols} onInsert={onInsert} />
    </View>
  );
}
