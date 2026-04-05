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
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/components/ui/ThemeProvider";
import { useProviderStore, isProviderConfigured } from "@/stores";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { ThinkingLevel } from "@/types/chat.types";
import {
  ProviderId,
  PROVIDERS,
  OPENAI_MODELS,
  OPENROUTER_MODELS,
  OLLAMA_MODELS,
  isOllamaThinkingHintModel,
  isThinkingCapableModel,
} from "@/types/provider.types";
import useHapticFeedback from "@/hooks/useHapticFeedback";
import { getVisibleModelNames } from "@/lib/model-utils";

interface ChatContextMenuProps {
  onReset: () => void;
  onRename?: () => void;
}

type ActiveSheet = "models" | "options" | null;

const PROVIDER_IDS: ProviderId[] = ["apple", "openai", "openrouter", "ollama"];

const getDefaultModelsForProvider = (providerId: ProviderId): string[] => {
  switch (providerId) {
    case "apple":
      return ["Apple Intelligence"];
    case "openai":
      return OPENAI_MODELS;
    case "openrouter":
      return OPENROUTER_MODELS;
    case "ollama":
      return OLLAMA_MODELS;
    default:
      return [];
  }
};

const getStoredModelValue = (
  providerId: ProviderId,
  displayModel: string,
): string => {
  if (providerId === "apple") return "system-default";
  return displayModel;
};

const getModelLabel = (provider: ProviderId, model: string | null): string => {
  if (provider === "apple") return "Apple Intelligence";
  if (!model || model === "system-default") return PROVIDERS[provider].name;
  const maxLength = 22;
  return model.length > maxLength
    ? `${model.slice(0, maxLength - 3)}...`
    : model;
};

const getProviderSheetLabel = (provider: ProviderId): string => {
  if (provider === "apple") return "Apple";
  return PROVIDERS[provider].name;
};

const toTestIdFragment = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider({ color }: { color: string }) {
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

// ─── Grab handle ──────────────────────────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
export function ChatContextMenu({ onReset, onRename }: ChatContextMenuProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
  const visibleProvider = PROVIDERS[sheetProvider];
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

  const sheetContainer = {
    backgroundColor: cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0.5,
    borderBottomWidth: 0,
    borderColor: dividerColor,
    maxHeight: "80%" as const,
    paddingBottom: Math.max(24, insets.bottom + 10),
    overflow: "hidden" as const,
  };

  const sheetTitle = {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
  };

  const rowBase = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
  };

  const rowLabel = {
    fontSize: 16,
    fontWeight: "400" as const,
    color: theme.colors.text,
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

      {/* ── Bottom sheet modal ───────────────────────────────────────────── */}
      <Modal
        transparent
        visible={modalMounted}
        animationType="none"
        onRequestClose={() => closeSheet()}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            {/* Backdrop — opacity driven by sheetY so it fades as you drag */}
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
                onPress={() => closeSheet()}
              />
            </Animated.View>

            {/* Sheet card — follows finger via panGesture */}
            <GestureDetector gesture={panGesture}>
              <Animated.View
                testID={
                  activeSheet === "models"
                    ? "chat-toolbar-model-sheet"
                    : "chat-toolbar-options-sheet"
                }
                style={[sheetContainer, sheetAnimatedStyle]}
              >
                <GrabHandle color={dividerColor} />

                {/* ── MODEL SHEET ────────────────────────────────────────────── */}
                {activeSheet === "models" ? (
                  <>
                    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                      <Text style={sheetTitle}>Choose Model</Text>
                      {/* Provider segmented tabs */}
                      <View
                        style={{
                          flexDirection: "row",
                          marginTop: 14,
                          borderRadius: 12,
                          backgroundColor: `${theme.colors.text}0a`,
                          padding: 3,
                        }}
                      >
                        {PROVIDER_IDS.map((pid) => {
                          const sel = sheetProvider === pid;
                          return (
                            <TouchableOpacity
                              key={pid}
                              testID={`chat-toolbar-provider-${pid}`}
                              onPress={() => handleProviderBrowse(pid)}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityState={{ selected: sel }}
                              style={{
                                flex: 1,
                                paddingVertical: 7,
                                borderRadius: 10,
                                alignItems: "center",
                                backgroundColor: sel ? cardBg : "transparent",
                                // subtle shadow for the selected segment
                                ...(sel
                                  ? {
                                      shadowColor: "#000",
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.08,
                                      shadowRadius: 2,
                                      elevation: 1,
                                    }
                                  : {}),
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: sel ? "600" : "400",
                                  color: sel
                                    ? theme.colors.text
                                    : theme.colors.textSecondary,
                                  letterSpacing: -0.1,
                                }}
                                numberOfLines={1}
                              >
                                {getProviderSheetLabel(pid)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Not-configured warning */}
                      {!providerConfigured ? (
                        <Text
                          style={{
                            color: theme.colors.accent,
                            fontSize: 12,
                            marginTop: 8,
                          }}
                        >
                          {`${visibleProvider.name} is not configured. Go to Settings to add your API key.`}
                        </Text>
                      ) : null}
                    </View>

                    <Divider color={dividerColor} />

                    {/* Model list */}
                    <ScrollView
                      style={{ marginTop: 0 }}
                      contentContainerStyle={{ paddingBottom: 4 }}
                      showsVerticalScrollIndicator={false}
                    >
                      {visibleModels.length > 0 ? (
                        visibleModels.map((model, index) => {
                          const selected = isModelSelected(
                            sheetProvider,
                            model,
                          );
                          return (
                            <React.Fragment key={model}>
                              {index > 0 && <Divider color={dividerColor} />}
                              <TouchableOpacity
                                testID={`chat-model-option-${toTestIdFragment(model)}`}
                                onPress={() =>
                                  handleModelSelect(sheetProvider, model)
                                }
                                activeOpacity={0.6}
                                style={{
                                  ...rowBase,
                                  backgroundColor: selected
                                    ? `${theme.colors.accent}12`
                                    : "transparent",
                                }}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                              >
                                <Text
                                  style={{
                                    flex: 1,
                                    fontSize: 15.5,
                                    fontWeight: selected ? "600" : "400",
                                    color: selected
                                      ? theme.colors.accent
                                      : theme.colors.text,
                                    letterSpacing: -0.2,
                                  }}
                                  numberOfLines={1}
                                >
                                  {model}
                                </Text>
                                {selected ? (
                                  <SymbolView
                                    name="checkmark"
                                    size={13}
                                    tintColor={theme.colors.accent}
                                  />
                                ) : null}
                              </TouchableOpacity>
                            </React.Fragment>
                          );
                        })
                      ) : (
                        <Text
                          testID="chat-model-empty-state"
                          style={{
                            color: theme.colors.textSecondary,
                            fontSize: 14,
                            paddingHorizontal: 16,
                            paddingVertical: 20,
                          }}
                        >
                          No models available for this provider.
                        </Text>
                      )}
                    </ScrollView>
                  </>
                ) : (
                  /* ── OPTIONS SHEET ──────────────────────────────────────────── */
                  <>
                    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                      <Text style={sheetTitle}>Options</Text>
                    </View>

                    <Divider color={dividerColor} />

                    {/* Rename */}
                    <TouchableOpacity
                      testID="chat-toolbar-rename-action"
                      onPress={handleRename}
                      activeOpacity={0.6}
                      style={rowBase}
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
                          <SymbolView
                            name="pencil"
                            size={14}
                            tintColor="#fff"
                          />
                        </View>
                        <Text style={rowLabel}>Rename Chat</Text>
                      </View>
                      <SymbolView
                        name="chevron.right"
                        size={11}
                        tintColor={dividerColor}
                      />
                    </TouchableOpacity>

                    <Divider color={dividerColor} />

                    {/* Reset */}
                    <TouchableOpacity
                      testID="chat-toolbar-reset-action"
                      onPress={handleReset}
                      activeOpacity={0.6}
                      style={rowBase}
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
                          <SymbolView
                            name="arrow.clockwise"
                            size={14}
                            tintColor="#fff"
                          />
                        </View>
                        <Text style={[rowLabel, { color: "#ff3b30" }]}>
                          Reset Chat
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <Divider color={dividerColor} />

                    {/* Thinking Output toggle */}
                    <View style={rowBase} accessibilityRole="none">
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
                          <Text style={rowLabel}>Thinking Output</Text>
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
                        onValueChange={handleThinkingToggle}
                        trackColor={{
                          false: dividerColor,
                          true: theme.colors.accent,
                        }}
                        thumbColor="#fff"
                      />
                    </View>

                    {/* Ollama managed reasoning hint */}
                    {showOllamaThinkingHint ? (
                      <>
                        <Divider color={dividerColor} />
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
                )}
              </Animated.View>
            </GestureDetector>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}
