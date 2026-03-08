import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MadLeetsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <View className="flex-1 items-center justify-center gap-3">
        <Text className="text-2xl font-bold text-white">MadLeets</Text>
        <Text className="text-sm text-gray-500">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
