import { router, Stack } from "expo-router";
import type { ReactNode } from "react";
import { SafeAreaView, ScrollView, View } from "react-native";

import { IconButton } from "@/components/ui/IconButton";
import { useTheme } from "@/components/ui/ThemeProvider";

interface SettingsScreenProps {
  title: string;
  children: ReactNode;
  closeButtonPosition?: "left" | "right";
  contentContainerClassName?: string;
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
}

export function SettingsScreen({
  title,
  children,
  closeButtonPosition = "right",
  contentContainerClassName = "flex-grow pt-5 px-4",
  keyboardShouldPersistTaps,
}: SettingsScreenProps) {
  const { theme } = useTheme();
  const headerCloseButton = () => (
    <IconButton icon="xmark" onPress={() => router.dismiss()} size={24} />
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: theme.colors.background }}
    >
      <Stack.Screen
        options={{
          headerTitle: title,
          headerTransparent: true,
          headerTintColor: theme.colors.text,
          ...(closeButtonPosition === "left"
            ? { headerLeft: headerCloseButton }
            : { headerRight: headerCloseButton }),
        }}
      />
      <SafeAreaView className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName={contentContainerClassName}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
