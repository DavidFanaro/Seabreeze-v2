import { apple } from "@react-native-ai/apple";
import { isAppleIntelligenceCompatible } from "@/lib/deviceCapabilities";

export type AppleLanguageModel = ReturnType<typeof apple>;

export function createAppleModel(): AppleLanguageModel {
    return apple();
}

export function isAppleModel(model: unknown): model is AppleLanguageModel {
    return typeof model === "object" && model !== null && "provider" in model && (model as { provider?: unknown }).provider === "apple";
}

export async function testAppleIntelligence(): Promise<boolean> {
    try {
        if (!isAppleIntelligenceCompatible()) {
            return false;
        }
        
        const model = createAppleModel();
        if (!model) {
            return false;
        }
        return true;
    } catch (error) {
        return false;
    }
}
