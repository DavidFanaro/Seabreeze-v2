/**
 * @file ModelListManager.tsx
 * @purpose Manages model list display, addition, editing, deletion, and search functionality for AI providers.
 */
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
    // ========================================
    // HOOKS AND STATE MANAGEMENT
    // ========================================
    
    // Theme and store hooks
    const { theme } = useTheme();
    const { customModels, hiddenModels, addCustomModel, editCustomModel, deleteModel } =
        useProviderStore();

    // UI State management
    const [isAdding, setIsAdding] = useState(false);              // Controls add model input visibility
    const [isEditMode, setIsEditMode] = useState(false);         // Toggles edit mode for deletion
    const [newModelName, setNewModelName] = useState("");         // Text for new model input
    const [editingModel, setEditingModel] = useState<string | null>(null); // Model being edited
    const [editedName, setEditedName] = useState("");             // Edited text for current model
    const [searchQuery, setSearchQuery] = useState("");           // Search filter query

    // ========================================
    // COMPUTED VALUES
    // ========================================
    
    // Get custom models for current provider, fallback to empty array
    const providerCustomModels = useMemo(
        () => customModels[providerId] ?? [],
        [customModels, providerId]
    );
    
    // Get hidden models for current provider, fallback to empty array
    const providerHiddenModels = useMemo(
        () => hiddenModels[providerId] ?? [],
        [hiddenModels, providerId]
    );

    // Base models: Use dynamic models if available (e.g., Ollama), otherwise use predefined
    // Filter out any hidden models from the base list
    const baseModels = useMemo(
        () =>
            (dynamicModels?.length ? dynamicModels : predefinedModels).filter(
                (m) => !providerHiddenModels.includes(m)
            ),
        [dynamicModels, predefinedModels, providerHiddenModels]
    );

    // All models: Combine provider base models with custom user-added models
    const allModels = useMemo(
        () => [...baseModels, ...providerCustomModels],
        [baseModels, providerCustomModels]
    );

    // Filtered models: Apply search query filter if present
    const filteredModels = useMemo(() => {
        if (!searchQuery.trim()) return allModels;
        const query = searchQuery.toLowerCase();
        return allModels.filter((model) => model.toLowerCase().includes(query));
    }, [allModels, searchQuery]);

    // UI logic flags
    const hasModels = allModels.length > 0;                        // Whether any models exist
    const showSearch = allModels.length > 5;                       // Only show search if many models

    // ========================================
    // EVENT HANDLERS
    // ========================================
    
    // Add new custom model after validation
    const handleAddModel = useCallback(() => {
        const trimmed = newModelName.trim();
        if (!trimmed) return;

        // Prevent duplicate model names
        if (allModels.includes(trimmed)) {
            Alert.alert("Duplicate", "This model already exists.");
            return;
        }

        addCustomModel(providerId, trimmed);
        onModelSelect(trimmed);
        setNewModelName("");
        setIsAdding(false);
    }, [newModelName, allModels, addCustomModel, providerId, onModelSelect]);

    // Start editing a model by populating edit state
    const handleStartEdit = useCallback((model: string) => {
        setEditingModel(model);
        setEditedName(model);
        setIsEditMode(false); // Exit edit mode when editing specific model
    }, []);

    // Save edited model name after validation
    const handleSaveEdit = useCallback(() => {
        const trimmed = editedName.trim();
        if (!trimmed || !editingModel) return;

        // Prevent duplicate names unless it's the same model
        if (trimmed !== editingModel && allModels.includes(trimmed)) {
            Alert.alert("Duplicate", "This model name already exists.");
            return;
        }

        editCustomModel(providerId, editingModel, trimmed);
        // Update selection if the edited model was currently selected
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

    // Delete a model and exit edit mode if no models remain
    const handleDelete = useCallback(
        (model: string) => {
            deleteModel(providerId, model);
            // Exit edit mode if this was the last model
            if (allModels.length <= 1) {
                setIsEditMode(false);
            }
        },
        [deleteModel, providerId, allModels.length]
    );

    // Cancel adding new model and reset state
    const handleCancelAdd = useCallback(() => {
        setIsAdding(false);
        setNewModelName("");
    }, []);

    // Cancel editing and reset edit state
    const handleCancelEdit = useCallback(() => {
        setEditingModel(null);
        setEditedName("");
    }, []);

    // Toggle bulk edit mode for deleting multiple custom models
    const toggleEditMode = useCallback(() => {
        setIsEditMode((prev) => !prev);
    }, []);

    return (
        <View className="gap-2">
            {/* ========================================
                 SECTION: HEADER CONTROLS
                 ========================================
                 Purpose: Displays section title and action buttons
                 Contains: "Models" title, Edit/Done toggle, Add model button
                 Visibility: Always visible
                 Interaction: Edit mode toggle, Add model initiation
            */}
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

            {/* ========================================
                 SECTION: ADD MODEL INPUT
                 ========================================
                 Purpose: Text input for adding new custom models
                 Contains: Text field, Cancel button, Save button
                 Visibility: Shown when isAdding = true
                 Interaction: Type model name, cancel, or save
                 Features: Auto-focus, validation, duplicate prevention
            */}
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

            {/* ========================================
                 SECTION: EDIT MODEL INPUT
                 ========================================
                 Purpose: Text input for editing existing model names
                 Contains: Text field with current name, Cancel button, Save button
                 Visibility: Shown when editingModel is not null
                 Interaction: Edit model name, cancel, or save changes
                 Features: Auto-focus, validation, duplicate prevention
            */}
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

            {/* ========================================
                 SECTION: SEARCH BAR
                 ========================================
                 Purpose: Filter models by name search
                 Contains: Search icon, text input, clear button
                 Visibility: Shown when >5 models exist and not editing/adding
                 Interaction: Type to filter, clear to reset
                 Features: Case-insensitive search, real-time filtering
            */}
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

            {/* ========================================
                 SECTION: MODEL LIST CONTAINER
                 ========================================
                 Purpose: Display all available models with interactions
                 Contains: Individual ModelRow components for each model
                 States: Empty state, no results state, or populated list
                 Interaction: Select model, edit (in edit mode), delete custom models
                 Features: Separators, selection highlighting, custom model indicators
            */}
            <View
                className="mx-4 rounded-lg border overflow-hidden"
                style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                }}
            >
                {allModels.length === 0 ? (
                    // Empty state: No models exist at all
                    <View className="p-6 items-center">
                        <Text
                            className="text-[14px] text-center"
                            style={{ color: theme.colors.textSecondary }}
                        >
                            No models available. Tap + to add one.
                        </Text>
                    </View>
                ) : filteredModels.length === 0 ? (
                    // No results state: Models exist but don't match search
                    <View className="p-6 items-center">
                        <Text
                            className="text-[14px] text-center"
                            style={{ color: theme.colors.textSecondary }}
                        >
                            No models match &quot;{searchQuery}&quot;
                        </Text>
                    </View>
                ) : (
                    // Populated list: Display filtered models
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
