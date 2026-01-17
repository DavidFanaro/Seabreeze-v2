import React, { useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    Pressable,
    TextInput,
    Alert,
    StyleSheet,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/components/ui/ThemeProvider";
import { ProviderId } from "@/types/provider.types";
import { useProviderStore } from "@/stores";
import { ModelRow } from "./ModelRow";

interface ModelListManagerProps {
    providerId: ProviderId;
    predefinedModels: string[];
    dynamicModels?: string[];
    selectedModel: string;
    onModelSelect: (model: string) => void;
    disabled?: boolean;
}

export function ModelListManager({
    providerId,
    predefinedModels,
    dynamicModels,
    selectedModel,
    onModelSelect,
    disabled = false,
}: ModelListManagerProps) {
    const { theme } = useTheme();
    const { customModels, hiddenModels, addCustomModel, editCustomModel, deleteModel } =
        useProviderStore();

    const [isAdding, setIsAdding] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [newModelName, setNewModelName] = useState("");
    const [editingModel, setEditingModel] = useState<string | null>(null);
    const [editedName, setEditedName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const providerCustomModels = customModels[providerId] || [];
    const providerHiddenModels = hiddenModels[providerId] || [];

    // Use dynamic models if available (e.g., Ollama), otherwise use predefined
    // Filter out hidden models from predefined/dynamic
    const baseModels = (dynamicModels?.length ? dynamicModels : predefinedModels)
        .filter((m) => !providerHiddenModels.includes(m));

    // Combine base models with custom models
    const allModels = useMemo(
        () => [...baseModels, ...providerCustomModels],
        [baseModels, providerCustomModels]
    );

    // Filter models based on search query
    const filteredModels = useMemo(() => {
        if (!searchQuery.trim()) return allModels;
        const query = searchQuery.toLowerCase();
        return allModels.filter((model) => model.toLowerCase().includes(query));
    }, [allModels, searchQuery]);

    const hasModels = allModels.length > 0;
    const showSearch = allModels.length > 5; // Only show search if there are many models

    const handleAddModel = useCallback(() => {
        const trimmed = newModelName.trim();
        if (!trimmed) return;

        if (allModels.includes(trimmed)) {
            Alert.alert("Duplicate", "This model already exists.");
            return;
        }

        addCustomModel(providerId, trimmed);
        onModelSelect(trimmed);
        setNewModelName("");
        setIsAdding(false);
    }, [newModelName, allModels, addCustomModel, providerId, onModelSelect]);

    const handleStartEdit = useCallback((model: string) => {
        setEditingModel(model);
        setEditedName(model);
        setIsEditMode(false);
    }, []);

    const handleSaveEdit = useCallback(() => {
        const trimmed = editedName.trim();
        if (!trimmed || !editingModel) return;

        if (trimmed !== editingModel && allModels.includes(trimmed)) {
            Alert.alert("Duplicate", "This model name already exists.");
            return;
        }

        editCustomModel(providerId, editingModel, trimmed);
        if (selectedModel === editingModel) {
            onModelSelect(trimmed);
        }
        setEditingModel(null);
        setEditedName("");
    }, [
        editedName,
        editingModel,
        allModels,
        editCustomModel,
        providerId,
        selectedModel,
        onModelSelect,
    ]);

    const handleDelete = useCallback(
        (model: string) => {
            deleteModel(providerId, model);
            // Exit edit mode if no more models
            if (allModels.length <= 1) {
                setIsEditMode(false);
            }
        },
        [deleteModel, providerId, allModels.length]
    );

    const handleCancelAdd = useCallback(() => {
        setIsAdding(false);
        setNewModelName("");
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingModel(null);
        setEditedName("");
    }, []);

    const toggleEditMode = useCallback(() => {
        setIsEditMode((prev) => !prev);
    }, []);

    return (
        <View className="gap-2">
            {/* Header with Add and Edit buttons */}
            <View className="flex-row justify-between items-center px-4">
                <Text className="text-[13px] font-bold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
                    Models
                </Text>
                <View className="flex-row items-center gap-3">
                    {hasModels && !isAdding && !editingModel && (
                        <Pressable
                            onPress={toggleEditMode}
                            disabled={disabled}
                            className="py-1 px-2"
                            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                        >
                            <Text
                                className="text-[16px] font-medium"
                                style={{ color: theme.colors.accent }}
                            >
                                {isEditMode ? "Done" : "Edit"}
                            </Text>
                        </Pressable>
                    )}
                    {!isAdding && !editingModel && !isEditMode && (
                        <Pressable
                            onPress={() => setIsAdding(true)}
                            disabled={disabled}
                            className="p-1"
                            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                        >
                            <SymbolView
                                name="plus.circle.fill"
                                size={22}
                                tintColor={theme.colors.accent}
                            />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Add new model input */}
            {isAdding && (
                <View
                    className="flex-row items-center mx-4 rounded-md border px-3 pr-1 py-1"
                    style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                    }}
                >
                    <TextInput
                        className="flex-1 text-[16px] py-2"
                        style={{ color: theme.colors.text }}
                        value={newModelName}
                        onChangeText={setNewModelName}
                        placeholder="Enter model name..."
                        placeholderTextColor={theme.colors.textSecondary}
                        autoFocus
                        onSubmitEditing={handleAddModel}
                        returnKeyType="done"
                    />
                    <View className="flex-row gap-1">
                        <Pressable onPress={handleCancelAdd} className="p-1">
                            <SymbolView
                                name="xmark.circle.fill"
                                size={24}
                                tintColor={theme.colors.textSecondary}
                            />
                        </Pressable>
                        <Pressable
                            onPress={handleAddModel}
                            className="p-1"
                            disabled={!newModelName.trim()}
                        >
                            <SymbolView
                                name="checkmark.circle.fill"
                                size={24}
                                tintColor={
                                    newModelName.trim()
                                        ? theme.colors.accent
                                        : theme.colors.textSecondary
                                }
                            />
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Edit model input */}
            {editingModel && (
                <View
                    className="flex-row items-center mx-4 rounded-md border px-3 pr-1 py-1"
                    style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                    }}
                >
                    <TextInput
                        className="flex-1 text-[16px] py-2"
                        style={{ color: theme.colors.text }}
                        value={editedName}
                        onChangeText={setEditedName}
                        placeholder="Enter model name..."
                        placeholderTextColor={theme.colors.textSecondary}
                        autoFocus
                        onSubmitEditing={handleSaveEdit}
                        returnKeyType="done"
                    />
                    <View className="flex-row gap-1">
                        <Pressable onPress={handleCancelEdit} className="p-1">
                            <SymbolView
                                name="xmark.circle.fill"
                                size={24}
                                tintColor={theme.colors.textSecondary}
                            />
                        </Pressable>
                        <Pressable
                            onPress={handleSaveEdit}
                            className="p-1"
                            disabled={!editedName.trim()}
                        >
                            <SymbolView
                                name="checkmark.circle.fill"
                                size={24}
                                tintColor={
                                    editedName.trim()
                                        ? theme.colors.accent
                                        : theme.colors.textSecondary
                                }
                            />
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Search input */}
            {showSearch && !isEditMode && !isAdding && !editingModel && (
                <View
                    className="flex-row items-center mx-4 rounded-md border px-3 py-2"
                    style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                    }}
                >
                    <SymbolView
                        name="magnifyingglass"
                        size={16}
                        tintColor={theme.colors.textSecondary}
                    />
                    <TextInput
                        className="flex-1 text-[16px] py-2"
                        style={{ color: theme.colors.text }}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search models..."
                        placeholderTextColor={theme.colors.textSecondary}
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery("")}>
                            <SymbolView
                                name="xmark.circle.fill"
                                size={18}
                                tintColor={theme.colors.textSecondary}
                            />
                        </Pressable>
                    )}
                </View>
            )}

            {/* Model list */}
            <View
                className="mx-4 rounded-lg border overflow-hidden"
                style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                }}
            >
                {allModels.length === 0 ? (
                    <View className="p-6 items-center">
                        <Text
                            className="text-[14px] text-center"
                            style={{ color: theme.colors.textSecondary }}
                        >
                            No models available. Tap + to add one.
                        </Text>
                    </View>
                ) : filteredModels.length === 0 ? (
                    <View className="p-6 items-center">
                        <Text
                            className="text-[14px] text-center"
                            style={{ color: theme.colors.textSecondary }}
                        >
                            No models match &quot;{searchQuery}&quot;
                        </Text>
                    </View>
                ) : (
                    filteredModels.map((model, index) => {
                        const isCustom = providerCustomModels.includes(model);
                        const isLast = index === filteredModels.length - 1;

                        return (
                            <View
                                key={model}
                                style={[
                                    !isLast && {
                                        borderBottomWidth: StyleSheet.hairlineWidth,
                                        borderBottomColor: theme.colors.border,
                                    },
                                ]}
                            >
                                <ModelRow
                                    model={model}
                                    isSelected={selectedModel === model}
                                    isCustom={isCustom}
                                    isEditMode={isEditMode}
                                    onSelect={() => onModelSelect(model)}
                                    onEdit={() => handleStartEdit(model)}
                                    onDelete={() => handleDelete(model)}
                                    theme={theme}
                                    disabled={disabled}
                                />
                            </View>
                        );
                    })
                )}
            </View>
        </View>
    );
}
