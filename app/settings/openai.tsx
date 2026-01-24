import { router, Stack } from "expo-router";
import * as React from "react";
import { View, Text, SafeAreaView, ScrollView } from "react-native";
import { Suspense, useState, useEffect } from "react";
import { IconButton, SettingInput, SaveButton, ModelListManager, useTheme } from "@/components";
import { SymbolView } from "expo-symbols";
import { OPENAI_MODELS } from "@/types/provider.types";
import { useProviderStore, useAuthStore } from "@/stores";
import { testProviderConnection } from "@/providers/provider-factory";

/**
 * @file OpenAI Settings Screen
 * @component OpenAISettings
 * @description Settings interface for OpenAI provider configuration
 *
 * PURPOSE: Enable users to enter OpenAI API credentials, select models, test
 * connections, and persist settings with visual feedback
 *
 * KEY FEATURES:
 * - Secure API key input (masked display)
 * - Model selection from predefined list
 * - Connection testing with validation
 * - Color-coded feedback (success/error)
 * - Persistent storage of settings
 *
 * STATE MANAGEMENT:
 * - apiKey: Tracks API key input value (synced from auth store)
 * - isSaving: Loading indicator while persisting
 * - isTesting: Loading indicator during connection test
 * - testResult: Test outcome object or null
 *
 * UI LAYOUT (11 Sections):
 * 1. Root View: Themed background container
 * 2. Stack.Screen: Header with "OpenAI" title + close button
 * 3. SafeAreaView: Device boundary respecting container
 * 4. Suspense: Async component loading boundary
 * 5. ScrollView: Form container with gap-based layout
 *    6. SettingInput: API Key field (masked secure entry)
 *    7. ModelListManager: Model selection component
 *    8. Test Result: Conditional success/error display
 *    9. Spacer: Flexible view pushing button down
 *    10. SaveButton: Primary action with loading state
 *    11. Bottom Padding: Visual balance spacer
 */
export default function OpenAISettings() {
     // ================================================================
     // SECTION: Hooks - Access theme and global state from stores
     // ================================================================
     const { theme } = useTheme();
     const { selectedModel, setSelectedModel } = useProviderStore();
     const { openaiApiKey, setOpenAIApiKey } = useAuthStore();

     // ================================================================
     // SECTION: State Variables - Form inputs and async operations
     // ================================================================
     // Local API key state - synced with auth store on component mount
     const [apiKey, setApiKeyState] = useState(openaiApiKey || "");
     // Loading state while testing connection to OpenAI API
     const [isTesting, setIsTesting] = useState(false);
     // Connection test result: null (not tested) or { success: boolean, message: string }
     const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
     // Loading state while persisting API key to secure storage
     const [isSaving, setIsSaving] = useState(false);

     // ================================================================
     // SECTION: Effects - Synchronize local state with stores
     // ================================================================
     /**
      * Effect: Sync local API key with auth store value
      * Runs: On mount and when openaiApiKey changes
      * Purpose: Keep input in sync with persistent storage
      */
     useEffect(() => {
         setApiKeyState(openaiApiKey || "");
     }, [openaiApiKey]);

     // ================================================================
     // SECTION: Event Handlers - User interactions
     // ================================================================
     /**
      * Handler: Save API key and test connection
      * Execution Flow:
      * 1. Enable loading (show spinner, disable button)
      * 2. Clear previous test result
      * 3. Persist API key to secure storage
      * 4. If key provided: test connection, display result
      * 5. Disable loading
      *
      * Success Message: "Connected successfully!" (green)
      * Error Message: "Connection failed. Check your API key." (red)
      */
     const handleSave = async () => {
         setIsSaving(true);
         setTestResult(null);

         await setOpenAIApiKey(apiKey || null);

         if (apiKey) {
             setIsTesting(true);
             const success = await testProviderConnection("openai", { apiKey });
             setTestResult({
                 success,
                 message: success ? "Connected successfully!" : "Connection failed. Check your API key.",
             });
             setIsTesting(false);
         }

         setIsSaving(false);
     };

     return (
         // SECTION 1: Root Container
         // Main View with themed background color
         <View
             className="flex-1"
             style={{ backgroundColor: theme.colors.background }}
         >
             {/* SECTION 2: Navigation Header
                 Sets "OpenAI" title and close button (X icon)
                 headerTransparent: Makes header blend into content
                 headerRight: Custom close button dismisses the screen */}
             <Stack.Screen
                 options={{
                     // Header title label
                     headerTitle: "OpenAI",
                     // Transparent background for seamless appearance
                     headerTransparent: true,
                     // Use theme text color for header elements
                     headerTintColor: theme.colors.text,
                     // Add close button (X icon) on right side of header
                     headerRight: () => (
                         <IconButton
                             icon="xmark" // X icon for close button
                             onPress={() => router.dismiss()} // Dismiss on press
                             size={24}
                             style={{ marginLeft: 6 }} // Spacing from edge
                         />
                     ),
                 }}
             />
             {/* SECTION 3: Safe Area Container
                 Respects device safe areas (notches, home indicator) */}
             <SafeAreaView className="flex-1">
                 {/* SECTION 4: Suspense Boundary
                     Handles loading states for async operations */}
                 <Suspense fallback={<Text>Loading</Text>}>
                     {/* SECTION 5: ScrollView - Main Form Container
                         Scrollable container with gap-based layout
                         contentContainerClassName: flex-grow (fill), pt-5 (top pad), gap-5 (spacing)
                         keyboardShouldPersistTaps: Dismiss keyboard on tap instead of scroll */}
                     <ScrollView
                         className="flex-1"
                         contentContainerClassName="flex-grow pt-5 gap-5"
                         keyboardShouldPersistTaps="handled"
                     >
                         {/* SECTION 6: API Key Input Field
                             Secure masked text input for OpenAI API key
                             secureTextEntry: Hides typed characters with dots
                             placeholder: Shows expected format (sk-...) */}
                         <SettingInput
                             label="API Key" // Field label
                             value={apiKey} // Input value from state
                             onChangeText={setApiKeyState} // Update on input
                             secureTextEntry={true} // Mask for security
                             placeholder="sk-..." // Format hint
                         />

                         {/* SECTION 7: Model Selection Component
                             Container for ModelListManager - select OpenAI models
                             mt-4: Top margin for spacing from input above */}
                         <View className="mt-4">
                             {/* Component for selecting from available models
                                 providerId="openai": Specifies provider
                                 predefinedModels: Available models list
                                 selectedModel: Currently selected model
                                 onModelSelect: Callback on selection change */}
                             <ModelListManager
                                 providerId="openai"
                                 predefinedModels={OPENAI_MODELS}
                                 selectedModel={selectedModel}
                                 onModelSelect={setSelectedModel}
                             />
                         </View>

                         {/* SECTION 8: Connection Test Result Feedback
                             Conditional display of test outcome (success/error)
                             Only shown when testResult is not null (after test runs)
                             Icon: Checkmark (success, green) or X (failure, red)
                             Message: Color-coded based on result */}
                         {testResult && (
                             // Horizontal flex layout: icon and message side-by-side
                             // mx-4: Horizontal margin, p-3: Padding, rounded-md: Border radius
                             <View
                                 className="flex-row items-center mx-4 p-3 rounded-md"
                                 style={{ backgroundColor: theme.colors.surface }}
                             >
                                 {/* Test outcome icon
                                     Success: checkmark.circle (green/accent)
                                     Failure: xmark.circle (red/error) */}
                                 <SymbolView
                                     name={testResult.success ? "checkmark.circle" : "xmark.circle"}
                                     size={20}
                                     tintColor={
                                         testResult.success ? theme.colors.accent : theme.colors.error
                                     }
                                 />
                                 {/* Test result message text
                                     Success: "Connected successfully!" (green)
                                     Failure: "Connection failed. Check your API key." (red)
                                     text-[14px]: Font size, ml-2: Left spacing from icon */}
                                 <Text
                                     className="text-[14px] ml-2"
                                     style={{
                                         color: testResult.success ? theme.colors.accent : theme.colors.error,
                                     }}
                                 >
                                     {testResult.message}
                                 </Text>
                             </View>
                         )}
                         {/* SECTION 9: Vertical Spacer
                             Flexible spacer that grows to push button to bottom
                             flex-1: Takes remaining space, min-h-2: Min height */}
                         <View className="flex-1 min-h-2" />
                         {/* SECTION 10: Save Button Container
                             Horizontal padding container for save button
                             px-4: 16px left/right padding */}
                         <View className="px-4">
                             {/* Primary action button - saves settings and tests connection
                                 onPress: handleSave - persist key and validate
                                 loading: Shows spinner during save/test
                                 title: "Save Settings" button label */}
                             <SaveButton
                                 onPress={handleSave}
                                 loading={isSaving || isTesting}
                                 title="Save Settings"
                             />
                         </View>
                         {/* SECTION 11: Bottom Padding Spacer
                             Small bottom margin (h-2 = 8px) for visual balance
                             Prevents content from appearing cramped at bottom */}
                         <View className="h-2" />
                     </ScrollView>
                 </Suspense>
             </SafeAreaView>
         </View>
     );
 }
