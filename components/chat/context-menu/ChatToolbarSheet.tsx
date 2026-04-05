import React from "react";
import {
  Modal,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import {
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SheetDividerProps {
  color: string;
}

interface ChatToolbarSheetProps {
  activeSheet: "models" | "options";
  visible: boolean;
  onClose: () => void;
  panGesture: any;
  sheetAnimatedStyle: StyleProp<ViewStyle>;
  backdropAnimatedStyle: StyleProp<ViewStyle>;
  cardBg: string;
  dividerColor: string;
  children: React.ReactNode;
}

function GrabHandle({ color }: { color: string }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
      <View
        style={{
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function SheetDivider({ color }: SheetDividerProps) {
  return (
    <View
      style={{
        height: 0.5,
        backgroundColor: color,
        marginLeft: 16,
      }}
    />
  );
}

export function ChatToolbarSheet({
  activeSheet,
  visible,
  onClose,
  panGesture,
  sheetAnimatedStyle,
  backdropAnimatedStyle,
  cardBg,
  dividerColor,
  children,
}: ChatToolbarSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Animated.View
            style={[
              {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
              },
              backdropAnimatedStyle,
            ]}
          >
            <Pressable
              testID="chat-toolbar-sheet-backdrop"
              style={{ flex: 1 }}
              onPress={onClose}
            />
          </Animated.View>

          <GestureDetector gesture={panGesture}>
            <Animated.View
              testID={
                activeSheet === "models"
                  ? "chat-toolbar-model-sheet"
                  : "chat-toolbar-options-sheet"
              }
              style={[
                {
                  backgroundColor: cardBg,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  borderWidth: 0.5,
                  borderBottomWidth: 0,
                  borderColor: dividerColor,
                  maxHeight: "80%",
                  paddingBottom: Math.max(24, insets.bottom + 10),
                  overflow: "hidden",
                },
                sheetAnimatedStyle,
              ]}
            >
              <GrabHandle color={dividerColor} />
              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
