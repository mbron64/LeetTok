import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import VideoFeed from "../../src/components/VideoFeed";
import { useClips } from "../../src/lib/hooks";

export default function FeedScreen() {
  const { clips, loading } = useClips();

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : (
        <VideoFeed clips={clips} />
      )}
    </View>
  );
}
