import React from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ProviderId } from "@/types/provider.types";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useTheme } from "./ThemeProvider";

export interface ProviderIconProps {
  size?: number;
  color?: string;
}

export const PROVIDER_ICONS: Record<ProviderId, React.FC<ProviderIconProps>> = {
  apple: ({ size = 24, color }) => (
    <MaterialCommunityIcons name="apple" size={size} color={color} />
  ),
  openai: ({ size = 24, color }) => (
    <AntDesign name="open-a-i" size={size} color={color} />
  ),
  openrouter: ({ size = 24, color }) => (
    <MaterialCommunityIcons name="web" size={size} color={color} />
  ),
  ollama: ({ size = 24, color }) => (
    <Ionicons name="server-outline" size={size} color={color} />
  ),
};

export function ProviderIcon({
  providerId,
  size = 24,
  color,
}: ProviderIconProps & { providerId: ProviderId }) {
  const { theme } = useTheme();
  const defaultColor = color ?? theme.colors.text;
  const IconComponent = PROVIDER_ICONS[providerId];
  return <IconComponent size={size} color={defaultColor} />;
}
