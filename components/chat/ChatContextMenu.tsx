/**
 * @file components/chat/ChatContextMenu.tsx
 * @purpose Inline toolbar chips above the composer with native-style slide-up sheets
 * for model selection and chat options.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import {
  Gesture,
} from "react-native-gesture-handler";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useProviderStore, isProviderConfigured } from "@/stores";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ThinkingLevel } from "@/types/chat.types";
import {
  ProviderId,
  isOllamaThinkingHintModel,
  isThinkingCapableModel,
} from "@/types/provider.types";
import useHapticFeedback from "@/hooks/useHapticFeedback";
import { getVisibleModelNames } from "@/lib/model-utils";
import { ChatToolbarSheet } from "@/components/chat/context-menu/ChatToolbarSheet";
import { ModelSelectionSheet } from "@/components/chat/context-menu/ModelSelectionSheet";
import { OptionsSheet } from "@/components/chat/context-menu/OptionsSheet";
import {
  getDefaultModelsForProvider,
  getModelLabel,
  getStoredModelValue,
} from "@/components/chat/context-menu/utils";

interface ChatContextMenuProps {
  onReset: () => void;
  onRename?: () => void;
}

type ActiveSheet = "models" | "options" | null;

// ─── Main component ───────────────────────────────────────────────────────────
export function ChatContextMenu({ onReset, onRename }: ChatContextMenuProps) {
  const { theme } = useTheme();
  const { triggerPress } = useHapticFeedback();

  const {
    selectedProvider,
    selectedModel,
    customModels,
    hiddenModels,
    availableModels,
    setSelectedProvider,
    setSelectedModel,
  } = useProviderStore();

  const thinkingEnabled = useSettingsStore((s) => s.thinkingEnabled);
  const setThinkingEnabled = useSettingsStore((s) => s.setThinkingEnabled);
  const thinkingLevel = useSettingsStore((s) => s.thinkingLevel);
  const setThinkingLevel = useSettingsStore((s) => s.setThinkingLevel);
  const webSearchEnabled = useSettingsStore((s) => s.webSearchEnabled);
  const setWebSearchEnabled = useSettingsStore((s) => s.setWebSearchEnabled);

  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  // modalMounted stays true during the exit animation so the modal isn't torn down early
  const [modalMounted, setModalMounted] = useState(false);
  const [sheetProvider, setSheetProvider] =
    useState<ProviderId>(selectedProvider);
  const pendingCloseActionRef = useRef<(() => void) | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Single shared value: 0 = fully open, positive = offset downward (closing/dragging)
  const sheetY = useSharedValue(600);
  const DISMISS_THRESHOLD = 150;
  const DISMISS_VELOCITY = 1200;

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheetY.value, [0, 300], [1, 0], Extrapolation.CLAMP),
  }));

  useEffect(() => {
    if (activeSheet !== "models") setSheetProvider(selectedProvider);
  }, [activeSheet, selectedProvider]);

  const getModelsForProvider = useMemo(() => {
    return (providerId: ProviderId): string[] => {
      const defaultModels = getDefaultModelsForProvider(providerId);
      const hidden = hiddenModels[providerId] || [];
      const custom = customModels[providerId] || [];
      const available = availableModels[providerId] || [];
      if (providerId === "apple") return defaultModels;
      const baseModels = providerId === "ollama" ? available : defaultModels;
      return getVisibleModelNames({
        baseModels,
        customModels: custom,
        hiddenModels: hidden,
      });
    };
  }, [availableModels, customModels, hiddenModels]);

  const onDismissed = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setActiveSheet(null);
    setModalMounted(false);

    const action = pendingCloseActionRef.current;
    pendingCloseActionRef.current = null;
    action?.();
  }, []);

  const closeSheet = useCallback(
    (afterClose?: () => void) => {
      pendingCloseActionRef.current = afterClose ?? null;
      sheetY.value = withTiming(600, { duration: 260 });

      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }

      closeTimeoutRef.current = setTimeout(() => {
        onDismissed();
      }, 260);
    },
    [onDismissed, sheetY],
  );

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const panGesture = Gesture.Pan()
    .activeOffsetY(10)
    .onUpdate((e) => {
      // Resist dragging above resting position
      sheetY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (sheetY.value > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY) {
        // Flick or drag past threshold → dismiss
        runOnJS(closeSheet)();
      } else {
        // Snap back — no bounce
        sheetY.value = withTiming(0, { duration: 200 });
      }
    });

  const openSheet = useCallback(
    (sheet: Exclude<ActiveSheet, null>) => {
      triggerPress("light");
      pendingCloseActionRef.current = null;

      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      sheetY.value = 600;
      setActiveSheet(sheet);
      setModalMounted(true);
      requestAnimationFrame(() => {
        sheetY.value = withTiming(0, { duration: 320 });
      });
    },
    [sheetY, triggerPress],
  );

  const openModelSheet = () => {
    setSheetProvider(selectedProvider);
    openSheet("models");
  };
  const openOptionsSheet = () => openSheet("options");

  const handleModelSelect = (providerId: ProviderId, model: string) => {
    triggerPress("light");
    setSelectedProvider(providerId);
    setSelectedModel(getStoredModelValue(providerId, model));
    closeSheet();
  };

  const handleProviderBrowse = (providerId: ProviderId) => {
    triggerPress("light");
    setSheetProvider(providerId);
  };

  const handleReset = () => {
    triggerPress("medium");
    closeSheet();
    onReset();
  };
  const handleRename = () => {
    triggerPress("light");
    closeSheet(onRename);
  };

  const handleThinkingToggle = (value: boolean) => {
    triggerPress("light");
    setThinkingEnabled(value);
  };

  const handleThinkingLevelCycle = () => {
    triggerPress("light");
    const order: ThinkingLevel[] = ["low", "medium", "high"];
    const next = order[(order.indexOf(thinkingLevel) + 1) % order.length];
    setThinkingLevel(next);
  };

  const handleWebSearchToggle = () => {
    triggerPress("light");
    setWebSearchEnabled(!webSearchEnabled);
  };

  const isModelSelected = (providerId: ProviderId, model: string): boolean => {
    if (selectedProvider !== providerId) return false;
    if (providerId === "apple") return selectedModel === "system-default";
    return selectedModel === model;
  };

  const modelLabel = getModelLabel(selectedProvider, selectedModel);
  const visibleModels = getModelsForProvider(sheetProvider);
  const providerConfigured = isProviderConfigured(sheetProvider);
  const isThinkingLevelAvailable = isThinkingCapableModel(
    selectedProvider,
    selectedModel ?? "",
  );
  const showOllamaThinkingHint =
    selectedProvider === "ollama" &&
    isOllamaThinkingHintModel(selectedModel ?? "");

  // ─── Shared style tokens ───────────────────────────────────────────────────
  const dividerColor = theme.colors.border ?? `${theme.colors.text}15`;
  const cardBg = theme.colors.surface;

  const chipBase = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    gap: 6,
    borderWidth: 0.5,
    borderColor: dividerColor,
  };

  const inactiveChip = {
    ...chipBase,
    backgroundColor: `${theme.colors.surface}`,
  };

  const activeChip = {
    ...chipBase,
    backgroundColor: `${theme.colors.accent}18`,
    borderColor: `${theme.colors.accent}55`,
  };

  const chipLabel = {
    fontSize: 14,
    fontWeight: "500" as const,
    letterSpacing: -0.1,
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Toolbar chips ────────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 4,
        }}
      >
        {/* Model selector chip — grows to fill available space */}
        <TouchableOpacity
          testID="chat-toolbar-model-trigger"
          onPress={openModelSheet}
          activeOpacity={0.65}
          style={[inactiveChip, { flex: 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Choose chat model"
        >
          <SymbolView
            name="cpu"
            size={14}
            tintColor={theme.colors.textSecondary}
          />
          <Text
            style={[chipLabel, { color: theme.colors.text, flex: 1 }]}
            numberOfLines={1}
          >
            {modelLabel}
          </Text>
          <SymbolView
            name="chevron.down"
            size={11}
            tintColor={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Web search toggle chip */}
        <TouchableOpacity
          testID="chat-toolbar-web-toggle"
          onPress={handleWebSearchToggle}
          activeOpacity={0.65}
          style={webSearchEnabled ? activeChip : inactiveChip}
          accessibilityRole="button"
          accessibilityLabel={
            webSearchEnabled ? "Disable web search" : "Enable web search"
          }
          accessibilityState={{ selected: webSearchEnabled }}
        >
          <SymbolView
            name="globe"
            size={14}
            tintColor={
              webSearchEnabled
                ? theme.colors.accent
                : theme.colors.textSecondary
            }
          />
          <Text
            style={[
              chipLabel,
              {
                color: webSearchEnabled
                  ? theme.colors.accent
                  : theme.colors.textSecondary,
              },
            ]}
          >
            Web
          </Text>
        </TouchableOpacity>

        {/* Thinking level chip — only visible when model supports it */}
        {isThinkingLevelAvailable ? (
          <TouchableOpacity
            testID="chat-toolbar-thinking-level-chip"
            onPress={handleThinkingLevelCycle}
            activeOpacity={0.65}
            style={activeChip}
            accessibilityRole="button"
            accessibilityLabel={`Thinking level: ${thinkingLevel}. Tap to change.`}
          >
            <SymbolView
              name="sparkles"
              size={13}
              tintColor={theme.colors.accent}
            />
            <Text style={[chipLabel, { color: theme.colors.accent }]}>
              {thinkingLevel.charAt(0).toUpperCase() + thinkingLevel.slice(1)}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Options chip */}
        <TouchableOpacity
          testID="chat-toolbar-options-trigger"
          onPress={openOptionsSheet}
          activeOpacity={0.65}
          style={inactiveChip}
          accessibilityRole="button"
          accessibilityLabel="Open chat options"
        >
          <SymbolView
            name="ellipsis"
            size={14}
            tintColor={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {activeSheet ? (
        <ChatToolbarSheet
          activeSheet={activeSheet}
          visible={modalMounted}
          onClose={() => closeSheet()}
          panGesture={panGesture}
          sheetAnimatedStyle={sheetAnimatedStyle}
          backdropAnimatedStyle={backdropAnimatedStyle}
          cardBg={cardBg}
          dividerColor={dividerColor}
        >
          {activeSheet === "models" ? (
            <ModelSelectionSheet
              sheetProvider={sheetProvider}
              visibleModels={visibleModels}
              providerConfigured={providerConfigured}
              onProviderBrowse={handleProviderBrowse}
              onModelSelect={handleModelSelect}
              isModelSelected={isModelSelected}
              dividerColor={dividerColor}
              cardBg={cardBg}
            />
          ) : (
            <OptionsSheet
              thinkingEnabled={thinkingEnabled}
              showOllamaThinkingHint={showOllamaThinkingHint}
              onRename={handleRename}
              onReset={handleReset}
              onThinkingToggle={handleThinkingToggle}
              dividerColor={dividerColor}
            />
          )}
        </ChatToolbarSheet>
      ) : null}
    </>
  );
}
