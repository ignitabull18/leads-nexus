import { View, Text, ScrollView } from "react-native";
import { Container } from "@/components/container";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export default function Home() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());

  return (
    <Container>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <Text className="font-mono text-foreground text-3xl font-bold mb-4">
			BETTER T STACK
		</Text>
        <View className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
            <View className="flex-row items-center gap-3">
              <View
                className={`h-3 w-3 rounded-full ${
                    healthCheck.data ? "bg-green-500" : "bg-orange-500"
                }`}
              />
              <View className="flex-1">
                <Text className="text-sm font-medium text-card-foreground">
                  TRPC
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {healthCheck.isLoading
                    ? "Checking connection..."
                    : healthCheck.data
                      ? "All systems operational"
                      : "Service unavailable"}
                </Text>
              </View>
            </View>
        </View>
      </ScrollView>
    </Container>
  );
}
