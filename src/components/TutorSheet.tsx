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
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/auth";
import {
  loadConversation,
  saveConversation,
  getRemainingMessages,
  streamTutorResponse,
  type ClipContext,
  type TutorMessage,
} from "../lib/tutor";
import { trackEvent } from "../lib/track";
import TutorMessageComponent from "./TutorMessage";
import QuickActionChips from "./QuickActionChips";

export type TutorSheetRef = {
  present: () => void;
  presentWithContext: (initialMessage: string) => void;
  close: () => void;
};

type Props = {
  clipContext: ClipContext;
  onClose: () => void;
};

const TutorSheet = forwardRef<TutorSheetRef, Props>(function TutorSheet(
  { clipContext, onClose },
  ref
) {
  const { session } = useAuth();
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [chipsCollapsed, setChipsCollapsed] = useState(false);
  const [remaining, setRemaining] = useState<{ remaining: number; limit: number } | null>(null);
  const streamingIndexRef = useRef<number | null>(null);
  const prevStreamingRef = useRef(false);
  const hasLoadedForOpenRef = useRef(false);
  const listMetricsRef = useRef({ contentHeight: 0, viewportHeight: 0 });

  const snapPoints = useMemo(() => ["50%", "85%"], []);
  const requiresSignIn = !session?.access_token;
  const signInPrompt =
    "Sign in to use LeetTok Tutor. You can still browse clips as a guest, but asking questions requires an account.";

  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Save conversation when streaming completes
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && messages.length > 0) {
      saveConversation(clipContext.clipId, messages);
      getRemainingMessages().then(setRemaining);
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, messages, clipContext.clipId]);

  const limitReached = remaining !== null && remaining.remaining <= 0;

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      if (!session?.access_token) {
        setMessages((prev) => {
          const alreadyShown = prev.some(
            (message) => message.role === "assistant" && message.content === signInPrompt
          );
          if (alreadyShown) return prev;
          return [...prev, { role: "assistant", content: signInPrompt }];
        });
        return;
      }
      if (isStreaming || limitReached) {
        return;
      }

      if (session.user?.id) {
        trackEvent(session.user.id, clipContext.clipId, "tutor_message_sent");
      }

      const userMsg: TutorMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInputText("");
      setChipsCollapsed(true);

      const assistantMsg: TutorMessage = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistantMsg]);
      const idx = messages.length + 1;
      streamingIndexRef.current = idx;
      setIsStreaming(true);

      await streamTutorResponse(
        [...messages, userMsg],
        clipContext,
        session.access_token,
        (token) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, content: last.content + token };
            }
            return next;
          });
        },
        () => {
          streamingIndexRef.current = null;
          setIsStreaming(false);
        },
        (err) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                content: last.content || `Error: ${err}`,
              };
            }
            return next;
          });
          streamingIndexRef.current = null;
          setIsStreaming(false);
        }
      );
    },
    [clipContext, messages, session?.access_token, session?.user?.id, isStreaming, limitReached, signInPrompt]
  );

  const handleSend = useCallback(() => {
    sendMessage(inputText);
  }, [inputText, sendMessage]);

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        bottomSheetRef.current?.snapToIndex(0);
      },
      presentWithContext: (initialMessage: string) => {
        bottomSheetRef.current?.snapToIndex(0);
        setInputText(initialMessage);
        if (initialMessage.trim()) {
          sendMessage(initialMessage.trim());
        }
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }),
    [sendMessage]
  );

  const handleSheetChange = useCallback(
    async (index: number) => {
      if (index < 0) {
        hasLoadedForOpenRef.current = false;
        onClose();
        return;
      }
      if (index >= 0 && !hasLoadedForOpenRef.current && session?.user?.id) {
        hasLoadedForOpenRef.current = true;
        const loaded = await loadConversation(clipContext.clipId);
        if (loaded.length > 0) setMessages(loaded);
        const usage = await getRemainingMessages();
        setRemaining(usage);
        trackEvent(session.user.id, clipContext.clipId, "tutor_opened");
      }
    },
    [clipContext.clipId, onClose, session?.user?.id]
  );

  const ListHeaderComponent = useMemo(
    () => (
      <View className="px-4 pt-2">
        <QuickActionChips
          onSend={sendMessage}
          collapsed={chipsCollapsed}
          onToggle={() => setChipsCollapsed((c) => !c)}
        />
      </View>
    ),
    [chipsCollapsed, sendMessage]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={-1}
      enablePanDownToClose
      enableDynamicSizing={false}
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: "#111111" }}
      handleIndicatorStyle={{ backgroundColor: "#5c6370" }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#1a1a1a", paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#fff" }}>LeetTok Tutor</Text>
          {remaining !== null && !limitReached && (
            <Text style={{ fontSize: 12, color: "#5c6370" }}>
              {remaining.remaining} messages left today
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => bottomSheetRef.current?.close()}
          style={{ height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: "#1a1a1a" }}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Message list */}
      <BottomSheetScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: messages.length === 0 ? 0 : 16,
          paddingBottom: 16,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator
        onContentSizeChange={(_, height) => {
          listMetricsRef.current.contentHeight = height;
        }}
        onLayout={(event) => {
          const height = event.nativeEvent.layout.height;
          listMetricsRef.current.viewportHeight = height;
        }}
        onScrollBeginDrag={() => {}}
      >
        {messages.length === 0 ? (
          ListHeaderComponent
        ) : (
          <>
            {messages.map((item, index) => (
              <TutorMessageComponent key={String(index)} message={item} />
            ))}
          </>
        )}
      </BottomSheetScrollView>

      {/* Chips above input when messages exist */}
      {messages.length > 0 && (
        <View style={{ borderTopWidth: 1, borderTopColor: "#1a1a1a", paddingHorizontal: 16, paddingTop: 8 }}>
          <QuickActionChips
            onSend={sendMessage}
            collapsed={chipsCollapsed}
            onToggle={() => setChipsCollapsed((c) => !c)}
          />
        </View>
      )}

      {/* Limit reached message */}
      {limitReached && (
        <View style={{ borderTopWidth: 1, borderTopColor: "#1a1a1a", backgroundColor: "#1a1a1a", paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ textAlign: "center", fontSize: 14, color: "#5c6370" }}>
            You've used all {remaining?.limit ?? 20} tutor messages today. Come back tomorrow!
          </Text>
        </View>
      )}

      {requiresSignIn && (
        <View style={{ borderTopWidth: 1, borderTopColor: "#1a1a1a", backgroundColor: "#1a1a1a", paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ marginBottom: 10, fontSize: 14, color: "#afb3b6" }}>
            Sign in to ask the tutor questions and save your conversation.
          </Text>
          <Pressable
            onPress={() => {
              bottomSheetRef.current?.close();
              router.push("/auth/login");
            }}
            style={{ alignItems: "center", borderRadius: 12, backgroundColor: "#fff", paddingVertical: 12 }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>Sign In to Use Tutor</Text>
          </Pressable>
        </View>
      )}

      {/* Input */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: "#1a1a1a", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 92 }}>
        <BottomSheetTextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={requiresSignIn ? "Sign in to ask the tutor..." : "Ask about this problem..."}
          placeholderTextColor="#5c6370"
          editable={!requiresSignIn && !isStreaming && !limitReached}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          style={{ flex: 1, borderRadius: 12, backgroundColor: "#1a1a1a", paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: "#fff" }}
        />
        <Pressable
          onPress={handleSend}
          disabled={requiresSignIn || !inputText.trim() || isStreaming || limitReached}
          style={{ height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#fff", opacity: (requiresSignIn || !inputText.trim() || isStreaming || limitReached) ? 0.5 : 1 }}
        >
          {isStreaming ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Ionicons name="send" size={18} color="#000" />
          )}
        </Pressable>
      </View>
    </BottomSheet>
  );
});

export default TutorSheet;
