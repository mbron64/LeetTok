import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import VideoFeed from "../../src/components/VideoFeed";
import { sampleClips } from "../../src/constants/sampleData";

export default function FeedScreen() {
  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <VideoFeed clips={sampleClips} />
    </View>
  );
}
