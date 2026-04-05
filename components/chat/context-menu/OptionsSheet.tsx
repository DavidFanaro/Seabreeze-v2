import React from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { useTheme } from "@/components/ui/ThemeProvider";
import { SheetDivider } from "./ChatToolbarSheet";

interface OptionsSheetProps {
  thinkingEnabled: boolean;
  showOllamaThinkingHint: boolean;
  onRename: () => void;
  onReset: () => void;
  onThinkingToggle: (value: boolean) => void;
  dividerColor: string;
}

export function OptionsSheet({
  thinkingEnabled,
  showOllamaThinkingHint,
  onRename,
  onReset,
  onThinkingToggle,
  dividerColor,
}: OptionsSheetProps) {
  const { theme } = useTheme();

  return (
    <>
      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 17,
            fontWeight: "600",
            letterSpacing: -0.3,
          }}
        >
          Options
        </Text>
      </View>

      <SheetDivider color={dividerColor} />

      <TouchableOpacity
        testID="chat-toolbar-rename-action"
        onPress={onRename}
        activeOpacity={0.6}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
        accessibilityRole="button"
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              backgroundColor: theme.colors.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SymbolView name="pencil" size={14} tintColor="#fff" />
          </View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "400",
              color: theme.colors.text,
            }}
          >
            Rename Chat
          </Text>
        </View>
        <SymbolView
          name="chevron.right"
          size={11}
          tintColor={dividerColor}
        />
      </TouchableOpacity>

      <SheetDivider color={dividerColor} />

      <TouchableOpacity
        testID="chat-toolbar-reset-action"
        onPress={onReset}
        activeOpacity={0.6}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
        accessibilityRole="button"
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              backgroundColor: "#ff3b30",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SymbolView name="arrow.clockwise" size={14} tintColor="#fff" />
          </View>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "400",
              color: "#ff3b30",
            }}
          >
            Reset Chat
          </Text>
        </View>
      </TouchableOpacity>

      <SheetDivider color={dividerColor} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
        accessibilityRole="none"
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              backgroundColor: "#7c5cbf",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SymbolView name="brain" size={14} tintColor="#fff" />
          </View>
          <View>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "400",
                color: theme.colors.text,
              }}
            >
              Thinking Output
            </Text>
            <Text
              style={{
                color: theme.colors.textSecondary,
                fontSize: 12,
                marginTop: 1,
              }}
            >
              Show model reasoning
            </Text>
          </View>
        </View>
        <Switch
          testID="chat-toolbar-thinking-toggle"
          value={thinkingEnabled}
          onValueChange={onThinkingToggle}
          trackColor={{
            false: dividerColor,
            true: theme.colors.accent,
          }}
          thumbColor="#fff"
        />
      </View>

      {showOllamaThinkingHint ? (
        <>
          <SheetDivider color={dividerColor} />
          <Text
            testID="chat-ollama-thinking-hint"
            style={{
              color: theme.colors.textSecondary,
              fontSize: 13,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            This Ollama model manages its own reasoning output.
          </Text>
        </>
      ) : null}
    </>
  );
}
