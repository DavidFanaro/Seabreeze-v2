/**
 * @file ModelRow.tsx
 * @purpose Individual model row component for model list
 * @connects-to ModelListManager, useProviderStore
 */

import React from "react";
import { View, Pressable, StyleSheet, Text } from "react-native";
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
            style={({ pressed }) => [
                styles.modelRow,
                {
                    backgroundColor: pressed && !isEditMode
                        ? theme.colors.surface
                        : theme.colors.background,
                },
            ]}
        >
            <View style={styles.modelRowContent}>
                <Text
                    style={[styles.modelName, { color: theme.colors.text }]}
                    numberOfLines={1}
                >
                    {model}
                </Text>
                {isCustom && !isEditMode && (
                    <View
                        style={[
                            styles.customBadge,
                            { backgroundColor: theme.colors.surface },
                        ]}
                    >
                        <Text
                            style={[
                                styles.customBadgeText,
                                { color: theme.colors.textSecondary },
                            ]}
                        >
                            Custom
                        </Text>
                    </View>
                )}
            </View>

            {isEditMode ? (
                <View style={styles.editActions}>
                    {isCustom && (
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onEdit();
                            }}
                            style={({ pressed }) => [
                                styles.actionButton,
                                {
                                    backgroundColor: theme.colors.accent,
                                    opacity: pressed ? 0.7 : 1,
                                },
                            ]}
                        >
                            <SymbolView name="pencil" size={14} tintColor="#ffffff" />
                        </Pressable>
                    )}
                    <Pressable
                        onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                            onDelete();
                        }}
                        style={({ pressed }) => [
                            styles.actionButton,
                            {
                                backgroundColor: theme.colors.error,
                                opacity: pressed ? 0.7 : 1,
                            },
                        ]}
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

const styles = StyleSheet.create({
    modelRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 16,
        minHeight: 44,
    },
    modelRowContent: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginRight: 8,
    },
    modelName: {
        fontSize: 16,
        flexShrink: 1,
    },
    customBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    customBadgeText: {
        fontSize: 10,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    editActions: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
});
