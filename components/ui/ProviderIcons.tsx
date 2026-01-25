/**
 * @file ProviderIcons.tsx
 * @purpose Icon components for AI providers with consistent styling and theming
 * @connects-to Provider selector UI, settings screens, chat interface
 */

import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ProviderId } from "@/types/provider.types";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useTheme } from "./ThemeProvider";

// ============================================================================
// TYPES AND INTERFACES SECTION
// ============================================================================

/**
 * Props interface for provider icon components
 * @size - Icon dimensions in pixels (default: 24)
 * @color - Custom icon color (optional, uses theme text color if not provided)
 */
export interface ProviderIconProps {
  size?: number;
  color?: string;
}

// ============================================================================
// PROVIDER ICON MAPPING SECTION
// ============================================================================

/**
 * Registry of icon components for each AI provider
 * Maps ProviderId to corresponding React component with appropriate icons
 * Uses MaterialCommunityIcons, AntDesign, and Ionicons for variety
 */
export const PROVIDER_ICONS: Record<ProviderId, React.FC<ProviderIconProps>> = {
  // Apple Intelligence: Uses apple icon from MaterialCommunityIcons
  apple: ({ size = 24, color }) => (
    <MaterialCommunityIcons name="apple" size={size} color={color} />
  ),
  
  // OpenAI: Uses open-a-i icon from AntDesign (specifically designed for OpenAI)
  openai: ({ size = 24, color }) => (
    <AntDesign name="open-a-i" size={size} color={color} />
  ),
  
  // OpenRouter: Uses web icon representing multi-provider routing
  openrouter: ({ size = 24, color }) => (
    <MaterialCommunityIcons name="web" size={size} color={color} />
  ),
  
  // Ollama: Uses server outline icon representing local AI server
  ollama: ({ size = 24, color }) => (
    <Ionicons name="server-outline" size={size} color={color} />
  ),
};

// ============================================================================
// MAIN PROVIDER ICON COMPONENT SECTION
// ============================================================================

/**
 * Main ProviderIcon component for rendering provider-specific icons
 * Handles theme integration and provides consistent styling across the app
 * 
 * @param providerId - The AI provider identifier (apple, openai, openrouter, ollama)
 * @param size - Icon size in pixels (default: 24)
 * @param color - Optional custom color, falls back to theme text color
 * @returns Themed icon component for the specified provider
 */
export function ProviderIcon({
  providerId,
  size = 24,
  color,
}: ProviderIconProps & { providerId: ProviderId }) {
  // Get current theme for consistent color theming
  const { theme } = useTheme();
  
  // Use provided color or fallback to theme's text color
  const defaultColor = color ?? theme.colors.text;
  
  // Get the appropriate icon component from the registry
  const IconComponent = PROVIDER_ICONS[providerId];
  
  // Render the icon with computed styling
  return <IconComponent size={size} color={defaultColor} />;
}
