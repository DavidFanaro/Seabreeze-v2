/**
 * @file ModelRow.tsx
 * @purpose Individual model row component for model list
 * @connects-to ModelListManager, useProviderStore
 */

import React from "react";
import { View, Pressable, Text } from "react-native";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import { Theme } from "@/components/ui/ThemeProvider";

interface ModelRowProps {
    model: string;
    isSelected: boolean;
    isCustom: boolean;
    isEditMode: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    theme: Theme;
    disabled?: boolean;
}

export function ModelRow({
    model,
    isSelected,
    isCustom,
    isEditMode,
    onSelect,
    onEdit,
    onDelete,
    theme,
    disabled,
}: ModelRowProps) {
    return (
        <Pressable
            onPress={onSelect}
            disabled={disabled || isEditMode}
            className="flex-row items-center justify-between py-3 px-4 min-h-[44px]"
            style={({ pressed }) => ({
                backgroundColor: pressed && !isEditMode
                    ? theme.colors.surface
                    : theme.colors.background,
            })}
        >
            <View className="flex-1 flex-row items-center gap-2 mr-2">
                <Text
                    className="text-[16px] flex-shrink-0"
                    style={{ color: theme.colors.text }}
                    numberOfLines={1}
                >
                    {model}
                </Text>
                {isCustom && !isEditMode && (
                    <View
                        className="px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: theme.colors.surface }}
                    >
                        <Text
                            className="text-[10px] font-bold uppercase"
                            style={{ color: theme.colors.textSecondary }}
                        >
                            Custom
                        </Text>
                    </View>
                )}
            </View>

            {isEditMode ? (
                <View className="flex-row gap-2">
                    {isCustom && (
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onEdit();
                            }}
                            className="w-[28px] h-[28px] rounded-full justify-center items-center"
                            style={({ pressed }) => ({
                                backgroundColor: theme.colors.accent,
                                opacity: pressed ? 0.7 : 1,
                            })}
                        >
                            <SymbolView name="pencil" size={14} tintColor="#ffffff" />
                        </Pressable>
                    )}
                    <Pressable
                        onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            onDelete();
                        }}
                        className="w-[28px] h-[28px] rounded-full justify-center items-center"
                        style={({ pressed }) => ({
                            backgroundColor: theme.colors.error,
                            opacity: pressed ? 0.7 : 1,
                        })}
                    >
                        <SymbolView name="trash" size={14} tintColor="#ffffff" />
                    </Pressable>
                </View>
            ) : (
                isSelected && (
                    <SymbolView
                        name="checkmark"
                        size={18}
                        tintColor={theme.colors.accent}
                    />
                )
            )}
        </Pressable>
    );
}
