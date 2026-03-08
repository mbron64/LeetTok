import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  useWindowDimensions,
  ViewToken,
  ViewabilityConfig,
} from "react-native";
import { Clip } from "../types";
import VideoCard from "./VideoCard";

type Props = {
  clips: Clip[];
};

const viewabilityConfig: ViewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

export default function VideoFeed({ clips }: Props) {
  const { height: screenHeight } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<Clip>[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const renderItem = useCallback(
    ({ item, index }: { item: Clip; index: number }) => (
      <VideoCard
        clip={item}
        isActive={index === activeIndex}
        height={screenHeight}
      />
    ),
    [activeIndex, screenHeight],
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
