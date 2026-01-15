import { apple } from "@react-native-ai/apple";

export type AppleLanguageModel = ReturnType<typeof apple>;

export function createAppleModel(): AppleLanguageModel {
    return apple();
}

export function isAppleModel(model: unknown): model is AppleLanguageModel {
    return typeof model === "object" && model !== null && "provider" in model && (model as { provider?: unknown }).provider === "apple";
}
