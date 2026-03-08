import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  useWindowDimensions,
  ViewToken,
  ViewabilityConfig,
} from "react-native";
import { Clip, Challenge } from "../types";
import { useAuth } from "../lib/auth";
import { trackEvent } from "../lib/track";
import VideoCard from "./VideoCard";

type Props = {
  clips: Clip[];
  challengeMap?: Map<string, Challenge>;
  challengesEnabled?: boolean;
};

const viewabilityConfig: ViewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

const SKIP_THRESHOLD_MS = 2000;

export default function VideoFeed({ clips, challengeMap, challengesEnabled = true }: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const { user } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSinceRef = useRef<number>(Date.now());
  const prevIndexRef = useRef<number>(0);
  const clipsRef = useRef(clips);
  const userRef = useRef(user);
  clipsRef.current = clips;
  userRef.current = user;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Clip>[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const newIndex = viewableItems[0].index;
        const prevIndex = prevIndexRef.current;
        const uid = userRef.current?.id;
        const clipsList = clipsRef.current;

        if (uid && prevIndex !== newIndex) {
          const timeOnPrev = Date.now() - activeSinceRef.current;
          if (timeOnPrev < SKIP_THRESHOLD_MS) {
            const prevClip = clipsList[prevIndex];
            if (prevClip) {
              trackEvent(uid, prevClip.id, "skip", {
                watchedMs: timeOnPrev,
              });
            }
          }
        }

        prevIndexRef.current = newIndex;
        activeSinceRef.current = Date.now();
        setActiveIndex(newIndex);
      }
    },
  ).current;

  const renderItem = useCallback(
    ({ item, index }: { item: Clip; index: number }) => (
      <VideoCard
        clip={item}
        isActive={index === activeIndex}
        height={screenHeight}
        challenge={challengeMap?.get(item.id)}
        challengesEnabled={challengesEnabled}
      />
    ),
    [activeIndex, screenHeight, challengeMap, challengesEnabled],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: screenHeight,
      offset: screenHeight * index,
      index,
    }),
    [screenHeight],
  );

  const keyExtractor = useCallback((item: Clip) => item.id, []);

  return (
    <FlatList
      data={clips}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      pagingEnabled
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      getItemLayout={getItemLayout}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
      windowSize={3}
      removeClippedSubviews
      initialNumToRender={1}
      maxToRenderPerBatch={2}
    />
  );
}
