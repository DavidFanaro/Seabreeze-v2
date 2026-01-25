// React imports for component functionality
import React from "react";
// SymbolView for rendering SF Symbols on iOS and equivalent icons on other platforms
import { SymbolView } from "expo-symbols";
// HeroUIButton as the base button component with built-in styling and interactions
import { Button as HeroUIButton } from "heroui-native";
// ThemeProvider hook for accessing app theme and color values
import { useTheme } from "./ThemeProvider";

/**
 * Interface defining the props for the IconButton component
 * Provides flexible configuration for icon-only buttons with customizable appearance and behavior
 */
interface IconButtonProps {
    /** The name of the SF Symbol or icon to display */
    icon: string;
    /** Size of the icon in points (default: 24) */
    size?: number;
    /** Custom color for the icon (overrides theme accent color) */
    color?: string;
    /** Callback function triggered when the button is pressed */
    onPress?: () => void;
    /** Whether the button is disabled and non-interactive (default: false) */
    disabled?: boolean;
    /** Additional styling properties to apply to the button container */
    style?: any;
}

/**
 * IconButton Component
 * 
 * A customizable icon-only button component that wraps HeroUIButton with SymbolView integration.
 * Provides consistent styling, theme integration, and accessibility for icon-based interactions.
 * 
 * Features:
 * - SF Symbols support on iOS with fallback icons on other platforms
 * - Theme-aware coloring with custom color override support
 * - Disabled state handling
 * - Ghost variant for minimal visual impact
 * - Configable icon sizing
 */
export const IconButton: React.FC<IconButtonProps> = ({
    icon,
    size = 24,
    color,
    onPress,
    disabled = false,
    style,
}) => {
    // Access current theme for consistent color scheme across the app
    const { theme } = useTheme();
    
    // Determine icon color: use custom color if provided, otherwise fall back to theme accent
    const iconColor = color ?? theme.colors.accent;

    // Render the button with icon content
    return (
        <HeroUIButton
            // Ghost variant for subtle background appearance
            variant="ghost"
            // Medium size for balanced touch targets
            size="md"
            // Press handler for user interactions
            onPress={onPress}
            // Disabled state prevents interaction and updates styling
            isDisabled={disabled}
            // Icon-only flag for proper accessibility and layout
            isIconOnly
            // Custom styles override for specific positioning or layout needs
            style={style}
        >
            {/* Icon rendering section with SF Symbols integration */}
            <SymbolView
                // Icon name passed as prop (cast to any for TypeScript compatibility)
                name={icon as any}
                // Icon size in points for consistent scaling
                size={size}
                // Dynamic color based on theme or custom color prop
                tintColor={iconColor}
            />
        </HeroUIButton>
    );
};
