/**
 * @file HeroUIComponents.tsx
 * @purpose Test HeroUI Native installation and basic usage
 */

import { Button, Card } from "heroui-native";
import { View, Text } from "react-native";

export const HeroUIComponents: React.FC = () => {
    return (
        <View className="flex-1 justify-center items-center p-4">
            <Card className="w-full max-w-sm">
                <View className="p-4">
                    <Text className="text-lg font-bold mb-4">HeroUI Native Test</Text>
                    <Text className="text-sm mb-4">
                        This component verifies HeroUI Native is properly installed.
                    </Text>
                    <Button className="w-full">Test Button</Button>
                </View>
            </Card>
        </View>
    );
};
