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
  Text,
  View,
} from "react-native";
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetFlatListMethods,
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
  const bottomSheetRef = useRef<BottomSheet>(null);
  const flatListRef = useRef<BottomSheetFlatListMethods | null>(null);

  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [chipsCollapsed, setChipsCollapsed] = useState(false);
  const [remaining, setRemaining] = useState<{ remaining: number; limit: number } | null>(null);
  const streamingIndexRef = useRef<number | null>(null);
  const prevStreamingRef = useRef(false);
  const hasLoadedForOpenRef = useRef(false);

  const snapPoints = useMemo(() => ["50%", "85%"], []);

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

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
      if (!trimmed || !session?.access_token || isStreaming || limitReached) return;

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
    [clipContext, messages, session?.access_token, session?.user?.id, isStreaming, limitReached]
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

  const renderItem = useCallback(
    ({ item }: { item: TutorMessage }) => (
      <TutorMessageComponent message={item} />
    ),
    []
  );

  const keyExtractor = useCallback((_: TutorMessage, index: number) => String(index), []);

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
      onChange={handleSheetChange}
      backgroundStyle={{ backgroundColor: "#0a0a0a" }}
      handleIndicatorStyle={{ backgroundColor: "#444" }}
    >
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-[#1a1a1a] px-4 py-3">
          <View className="flex-1 flex-row items-center gap-2">
            <Text className="text-lg font-semibold text-white">LeetTok Tutor</Text>
            {remaining !== null && !limitReached && (
              <Text className="text-xs text-[#888]">
                {remaining.remaining} messages left today
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => bottomSheetRef.current?.close()}
            className="h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a]"
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Message list */}
        <View className="flex-1 min-h-0">
          <BottomSheetFlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={messages.length === 0 ? ListHeaderComponent : null}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 16,
              flexGrow: 1,
            }}
            inverted={false}
          />
        </View>

        {/* Chips above input when messages exist */}
        {messages.length > 0 && (
          <View className="border-t border-[#1a1a1a] px-4 pt-2">
            <QuickActionChips
              onSend={sendMessage}
              collapsed={chipsCollapsed}
              onToggle={() => setChipsCollapsed((c) => !c)}
            />
          </View>
        )}

        {/* Limit reached message */}
        {limitReached && (
          <View className="border-t border-[#1a1a1a] bg-[#1a1a1a] px-4 py-3">
            <Text className="text-center text-sm text-[#888]">
              You've used all {remaining?.limit ?? 20} tutor messages today. Come back tomorrow!
            </Text>
          </View>
        )}

        {/* Input */}
        <View className="flex-row items-center gap-2 border-t border-[#1a1a1a] px-4 py-3">
          <BottomSheetTextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about this problem..."
            placeholderTextColor="#666"
            editable={!isStreaming && !limitReached}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            className="flex-1 rounded-xl bg-[#1e1e1e] px-4 py-3 text-[15px] text-white"
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isStreaming || limitReached}
            className="h-11 w-11 items-center justify-center rounded-full bg-[#6366f1] disabled:opacity-50"
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
});

export default TutorSheet;
