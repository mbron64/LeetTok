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
  const [language, setLanguage] = useState<(typeof ALL_LANGUAGES)[number]>(ALL_LANGUAGES[0]);
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
      setError("Sign in to run code.");
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
      setError("Sign in to submit code.");
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
        enableDynamicSizing={false}
        onClose={onClose}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textMuted }}
      >
        {/* Fixed header: tabs + language + Run + Submit */}
        <View style={{ backgroundColor: "#111111", flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)", paddingHorizontal: 8 }}>
          <View style={{ flexDirection: "row", flex: 1 }}>
            <Pressable
              onPress={() => setActiveTab("problem")}
              style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: activeTab === "problem" ? 2 : 0, borderBottomColor: "#fff" }}
            >
              <Text style={{ color: activeTab === "problem" ? "#fff" : "#5c6370", fontWeight: activeTab === "problem" ? "500" : "400" }}>
                Problem
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("code")}
              style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: activeTab === "code" ? 2 : 0, borderBottomColor: "#fff" }}
            >
              <Text style={{ color: activeTab === "code" ? "#fff" : "#5c6370", fontWeight: activeTab === "code" ? "500" : "400" }}>
                Code
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => setShowLangPicker(!showLangPicker)}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <Text style={{ color: "#fff", fontSize: 14 }}>
                {effectiveLanguages.find((l) => l.key === language.key)?.label ?? language.label}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleRun}
              disabled={loading}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(6,182,212,0.2)", borderWidth: 1, borderColor: "rgba(6,182,212,0.4)", opacity: loading ? 0.6 : 1 }}
            >
              <Text style={{ color: "#22d3ee", fontWeight: "500", fontSize: 14 }}>Run</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "rgba(34,197,94,0.2)", borderWidth: 1, borderColor: "rgba(34,197,94,0.4)", opacity: loading ? 0.6 : 1 }}
            >
              <Text style={{ color: "#4ade80", fontWeight: "500", fontSize: 14 }}>Submit</Text>
            </Pressable>
          </View>
        </View>

        {showLangPicker && (
          <View style={{ position: "absolute", top: 56, right: 8, zIndex: 10, borderRadius: 8, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingVertical: 4 }}>
            {effectiveLanguages.map((lang) => (
              <Pressable
                key={lang.key}
                onPress={() => handleLangSelect(lang)}
                style={{ paddingHorizontal: 16, paddingVertical: 8 }}
              >
                <Text style={{ color: "#fff", fontSize: 14 }}>{lang.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {activeTab === "problem" && problem && (
          <ProblemDescription problem={problem} />
        )}

        {activeTab === "code" && (
          <View style={{ flex: 1, backgroundColor: "#111111" }}>
            {(results !== null || error) && (
              <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)", maxHeight: "40%" }}>
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
                    style={{ marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}
                  >
                    <Ionicons name="sparkles" size={18} color="#fbb862" />
                    <Text style={{ color: "#fff", fontWeight: "500", fontSize: 14 }}>Ask Tutor</Text>
                  </Pressable>
                )}
              </View>
            )}
            <View style={{ flex: 1, flexDirection: "row" }}>
              <View style={{ width: 40, paddingTop: 12, paddingBottom: 92, backgroundColor: "#0a0a0a", borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.05)", alignItems: "flex-end", paddingRight: 8 }}>
                {lineNumbers.map((n) => (
                  <Text
                    key={n}
                    style={{ fontFamily: MONO_FONT, fontSize: 12, color: "#5c6370" }}
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
                  paddingTop: 8,
                  paddingBottom: 92,
                  textAlignVertical: "top",
                }}
                placeholderTextColor="#5c6370"
                keyboardAppearance="dark"
                autoCorrect={false}
                spellCheck={false}
                autoCapitalize="none"
              />
            </View>
          </View>
        )}
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
