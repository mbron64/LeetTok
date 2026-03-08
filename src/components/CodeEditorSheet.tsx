import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomSheet from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import { submitCode, LANGUAGE_IDS } from "../lib/codeExecution";
import { SAMPLE_PROBLEMS } from "../constants/sampleProblems";
import { isSupabaseConfigured } from "../constants/config";
import { trackEvent } from "../lib/track";
import ProblemDescription from "./ProblemDescription";
import TestResults from "./TestResults";
import CodeSymbolBar from "./CodeSymbolBar";
import { theme } from "../constants/theme";
import type { ClipContext } from "../lib/tutor";

const LANG_PREF_KEY = "code-editor-lang-pref";

const CODE_SYMBOL_BAR_ID = "code-editor-symbol-bar";

const MONO_FONT = Platform.select({
  ios: "Courier New" as const,
  default: "monospace" as const,
});

const ALL_LANGUAGES = [
  { key: "python", label: "Python", id: LANGUAGE_IDS.python },
  { key: "javascript", label: "JS", id: LANGUAGE_IDS.javascript },
  { key: "java", label: "Java", id: LANGUAGE_IDS.java },
  { key: "cpp", label: "C++", id: LANGUAGE_IDS.cpp },
] as const;

export type CodeEditorSheetRef = {
  open: (problemNumber: number) => void;
  close: () => void;
};

type Props = {
  clipId: string;
  clipContext: ClipContext;
  onClose: () => void;
  onAskTutor?: (context: string) => void;
};

function getStarterCode(problem: (typeof SAMPLE_PROBLEMS)[0], langKey: string): string {
  const key = langKey === "cpp" ? "cpp" : langKey;
  return (
    problem.starterCode[key] ??
    problem.starterCode.python ??
    problem.starterCode.javascript ??
    ""
  );
}

function CodeEditorSheetInner(
  { clipId, clipContext, onClose, onAskTutor }: Props,
  ref: React.Ref<CodeEditorSheetRef>,
) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const codeInputRef = useRef<TextInput>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const { session, user } = useAuth();
  const [problemNumber, setProblemNumber] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"problem" | "code">("problem");
  const [language, setLanguage] = useState<(typeof ALL_LANGUAGES)[0]>(ALL_LANGUAGES[0]);
  const [code, setCode] = useState("");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [results, setResults] = useState<import("../lib/codeExecution").TestCaseResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const problem = useMemo(
    () => SAMPLE_PROBLEMS.find((p) => p.number === problemNumber) ?? null,
    [problemNumber],
  );

  const open = useCallback(async (num: number) => {
    setProblemNumber(num);
    setResults(null);
    setError(null);
    const p = SAMPLE_PROBLEMS.find((x) => x.number === num);
    if (p) {
      const langPref = await AsyncStorage.getItem(LANG_PREF_KEY);
      const langKey =
        langPref && ALL_LANGUAGES.some((l) => l.key === langPref)
          ? langPref
          : language.key;
      const lang = ALL_LANGUAGES.find((l) => l.key === langKey) ?? ALL_LANGUAGES[0];
      setLanguage(lang);
      const codeKey = `code-${num}-${langKey}`;
      const saved = await AsyncStorage.getItem(codeKey);
      setCode(saved ?? getStarterCode(p, langKey));
    }
    bottomSheetRef.current?.expand();
  }, [language.key]);

  const close = useCallback(() => {
    bottomSheetRef.current?.close();
  }, []);

  useImperativeHandle(ref, () => ({ open, close }), [open, close]);


  const handleLangSelect = useCallback(
    async (lang: (typeof ALL_LANGUAGES)[number]) => {
      setLanguage(lang);
      setShowLangPicker(false);
      await AsyncStorage.setItem(LANG_PREF_KEY, lang.key);
      if (problem && problemNumber) {
        const codeKey = `code-${problemNumber}-${lang.key}`;
        const saved = await AsyncStorage.getItem(codeKey);
        setCode(saved ?? getStarterCode(problem, lang.key));
      }
    },
    [problem, problemNumber],
  );

  // Auto-save code every 5 seconds
  useEffect(() => {
    if (!problemNumber || !code) return;
    const key = `code-${problemNumber}-${language.key}`;
    const id = setInterval(() => {
      AsyncStorage.setItem(key, code);
    }, 5000);
    return () => clearInterval(id);
  }, [problemNumber, language.key, code]);

  const handleRun = useCallback(async () => {
    if (!problem || !session?.access_token || !isSupabaseConfigured) {
      setError("Sign in and configure Supabase to run code.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    const sampleCases = problem.testCases.filter((tc) => tc.sample);
    const testCases = sampleCases.map((tc) => ({
      input: tc.input,
      expected_output: tc.expected_output,
    }));
    try {
      const res = await submitCode({
        code,
        languageId: language.id,
        testCases,
        accessToken: session.access_token,
        functionName: problem.functionSignature.name,
      });
      setResults(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Execution failed");
    } finally {
      setLoading(false);
    }
  }, [problem, code, language, session?.access_token]);

  const handleSubmit = useCallback(async () => {
    if (!problem || !session?.access_token || !isSupabaseConfigured) {
      setError("Sign in and configure Supabase to submit.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    const testCases = problem.testCases.map((tc) => ({
      input: tc.input,
      expected_output: tc.expected_output,
    }));
    try {
      const res = await submitCode({
        code,
        languageId: language.id,
        testCases,
        accessToken: session.access_token,
        functionName: problem.functionSignature.name,
      });
      setResults(res);
      if (user?.id) {
        trackEvent(user.id, clipId, "code_submitted");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }, [problem, code, language, session?.access_token, user?.id, clipId]);

  const handleInsertSymbol = useCallback(
    (text: string) => {
      const { start, end } = selectionRef.current;
      const before = code.slice(0, start);
      const after = code.slice(end);
      const newValue = before + text + after;
      const newCursor = start + text.length;
      setCode(newValue);
      selectionRef.current = { start: newCursor, end: newCursor };
      requestAnimationFrame(() => {
        codeInputRef.current?.setNativeProps({
          selection: { start: newCursor, end: newCursor },
        });
      });
    },
    [code],
  );

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      selectionRef.current = e.nativeEvent.selection;
    },
    [],
  );

  const lineCount = code.split("\n").length;
  const lineNumbers = Array.from({ length: Math.max(1, lineCount) }, (_, i) => i + 1);

  const snapPoints = useMemo(() => ["50%", "85%"], []);

  const availableLanguages = useMemo(() => {
    if (!problem) return ALL_LANGUAGES;
    return ALL_LANGUAGES.filter((l) => {
      const key = l.key === "cpp" ? "cpp" : l.key;
      return key in problem.starterCode;
    });
  }, [problem]);

  const effectiveLanguages = availableLanguages.length > 0 ? availableLanguages : ALL_LANGUAGES;

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textMuted }}
      >
        <View className="flex-1 bg-[#0a0a0a]">
          {/* Header: tabs + language + Run + Submit */}
          <View className="flex-row items-center border-b border-white/10 px-2">
            <View className="flex-row flex-1">
              <Pressable
                onPress={() => setActiveTab("problem")}
                className={`px-4 py-3 ${activeTab === "problem" ? "border-b-2 border-indigo-500" : ""}`}
              >
                <Text
                  className={
                    activeTab === "problem" ? "text-white font-medium" : "text-[#666]"
                  }
                >
                  Problem
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("code")}
                className={`px-4 py-3 ${activeTab === "code" ? "border-b-2 border-indigo-500" : ""}`}
              >
                <Text
                  className={
                    activeTab === "code" ? "text-white font-medium" : "text-[#666]"
                  }
                >
                  Code
                </Text>
              </Pressable>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setShowLangPicker(!showLangPicker)}
                className="px-3 py-2 rounded-lg bg-white/10"
              >
                <Text className="text-white text-sm">
                  {effectiveLanguages.find((l) => l.key === language.key)?.label ?? language.label}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRun}
                disabled={loading}
                className="px-3 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 active:bg-cyan-500/30"
              >
                <Text className="text-cyan-400 font-medium text-sm">Run</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                className="px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/40 active:bg-green-500/30"
              >
                <Text className="text-green-400 font-medium text-sm">Submit</Text>
              </Pressable>
            </View>
          </View>

          {showLangPicker && (
            <View className="absolute top-14 right-2 z-10 rounded-lg bg-[#1a1a1a] border border-white/10 py-1">
              {effectiveLanguages.map((lang) => (
                <Pressable
                  key={lang.key}
                  onPress={() => handleLangSelect(lang)}
                  className="px-4 py-2 active:bg-white/10"
                >
                  <Text className="text-white text-sm">{lang.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {activeTab === "problem" && problem && (
            <View className="flex-1">
              <ProblemDescription problem={problem} />
            </View>
          )}

          {activeTab === "code" && (
            <View className="flex-1">
              {(results !== null || error) && (
                <View className="px-4 py-2 border-b border-white/10 max-h-[40%]">
                  <TestResults
                    results={results}
                    error={error}
                    loading={loading}
                    isSubmit={!!problem && results?.length === problem.testCases.length}
                  />
                  {onAskTutor && !loading && (error || (results && results.some((r) => !r.passed))) && (
                    <Pressable
                      onPress={() => {
                        const msg = error
                          ? `My code failed with error: ${error}. Problem: ${problem?.title ?? ""}.`
                          : results
                            ? `My code failed ${results.filter((r) => !r.passed).length} test(s). Problem: ${problem?.title ?? ""}. Failed cases: ${results
                                .filter((r) => !r.passed)
                                .map((r) => `expected ${r.expected_output}, got ${r.actual_output}`)
                                .join("; ")}` 
                            : "";
                        onAskTutor(msg);
                      }}
                      className="mt-2 flex-row items-center justify-center gap-2 rounded-lg bg-indigo-500/20 py-2 px-3 border border-indigo-500/40 active:bg-indigo-500/30"
                    >
                      <Ionicons name="sparkles" size={18} color="#818cf8" />
                      <Text className="text-indigo-400 font-medium text-sm">Ask Tutor</Text>
                    </Pressable>
                  )}
                </View>
              )}
              <View className="flex-1 flex-row">
                <View className="w-10 py-3 bg-[#111] border-r border-white/5 items-end pr-2">
                  {lineNumbers.map((n) => (
                    <Text
                      key={n}
                      style={{ fontFamily: MONO_FONT, fontSize: 12 }}
                      className="text-[#666]"
                    >
                      {n}
                    </Text>
                  ))}
                </View>
                <TextInput
                  ref={codeInputRef}
                  value={code}
                  onChangeText={setCode}
                  onSelectionChange={handleSelectionChange}
                  multiline
                  inputAccessoryViewID={Platform.OS === "ios" ? CODE_SYMBOL_BAR_ID : undefined}
                  style={{
                    flex: 1,
                    fontFamily: MONO_FONT,
                    fontSize: 14,
                    lineHeight: 22,
                    color: "#e4e4e7",
                    backgroundColor: "#1a1a1a",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    textAlignVertical: "top",
                  }}
                  placeholderTextColor="#666"
                  keyboardAppearance="dark"
                  autoCorrect={false}
                  spellCheck={false}
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}
        </View>
      </BottomSheet>

      <CodeSymbolBar
        language={language.key}
        onInsert={handleInsertSymbol}
        inputAccessoryViewID={CODE_SYMBOL_BAR_ID}
      />
    </>
  );
}

export default forwardRef<CodeEditorSheetRef, Props>(CodeEditorSheetInner);
