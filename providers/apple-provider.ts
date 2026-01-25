import { apple } from "@react-native-ai/apple";
import { isAppleIntelligenceCompatible } from "@/lib/deviceCapabilities";

/**
 * Type definition for the Apple Intelligence language model.
 * This represents the model object returned by the @react-native-ai/apple package,
 * which provides the interface for interacting with Apple's on-device AI capabilities.
 */
export type AppleLanguageModel = ReturnType<typeof apple>;

// ==============================================================================
// APPLE INTELLIGENCE PROVIDER
// ==============================================================================
/**
 * Overview:
 * The Apple provider enables integration with Apple Intelligence, Apple's on-device
 * AI framework available on compatible iOS devices (iPhone 15 Pro/Pro Max, iPhone 16 series,
 * and iPad Pro with M1+ chips running iOS 18+).
 * 
 * Key Features:
 * - On-device processing for privacy and speed
 * - No API keys or external dependencies required
 * - Automatic device compatibility detection
 * - Seamless integration with the unified provider system
 * 
 * Compatibility Requirements:
 * - iPhone 15 Pro/Pro Max or iPhone 16 series
 * - iPad Pro with M1, M2, M3, or M4 chips
 * - iOS 18.0 or later
 * - Apple Intelligence enabled in device settings
 * 
 * Usage Context:
 * This provider is automatically preferred when available due to its privacy
 * benefits, zero cost, and offline capabilities. It's ideal for everyday chat
 * interactions where complex reasoning or specialized knowledge isn't required.
 * ==============================================================================
 */

/**
 * Creates and returns an Apple Intelligence language model instance.
 * 
 * This function initializes the Apple provider using the @react-native-ai/apple
 * package. The returned model can be used for text generation, completion,
 * and other AI tasks through the unified AI SDK interface.
 * 
 * @returns {AppleLanguageModel} The configured Apple Intelligence model instance
 * 
 * @example
 * ```typescript
 * const model = createAppleModel();
 * const result = await generateText({
 *   model,
 *   prompt: "Hello, how are you?"
 * });
 * ```
 */
export function createAppleModel(): AppleLanguageModel {
    return apple();
}

/**
 * Type guard function to verify if an unknown object is an Apple Language Model.
 * 
 * This function performs runtime type checking to ensure that a given object
 * conforms to the AppleLanguageModel interface. It's useful for validation
 * and error handling when working with multiple provider types.
 * 
 * @param {unknown} model - The object to test
 * @returns {boolean} True if the object is an Apple Language Model, false otherwise
 * 
 * @example
 * ```typescript
 * const unknownModel = getSomeModel();
 * if (isAppleModel(unknownModel)) {
 *   // TypeScript now knows this is AppleLanguageModel
 *   console.log("This is an Apple Intelligence model");
 * }
 * ```
 */
export function isAppleModel(model: unknown): model is AppleLanguageModel {
    return typeof model === "object" && model !== null && "provider" in model && (model as { provider?: unknown }).provider === "apple";
}

/**
 * Tests the availability and functionality of Apple Intelligence on the current device.
 * 
 * This function performs a comprehensive check to determine if Apple Intelligence
 * can be used on the current device. It checks:
 * 1. Hardware compatibility (device model and chip)
 * 2. Software compatibility (iOS version)
 * 3. Provider availability and initialization
 * 
 * The test is non-destructive and safe to call at any time. It returns false
 * gracefully for any compatibility issues or initialization errors.
 * 
 * @returns {Promise<boolean>} True if Apple Intelligence is available and functional, false otherwise
 * 
 * @example
 * ```typescript
 * const isAvailable = await testAppleIntelligence();
 * if (isAvailable) {
 *   console.log("Apple Intelligence is ready to use!");
 * } else {
 *   console.log("Apple Intelligence not available on this device");
 * }
 * ```
 */
export async function testAppleIntelligence(): Promise<boolean> {
    try {
        // First check if the device hardware/software supports Apple Intelligence
        if (!isAppleIntelligenceCompatible()) {
            return false;
        }
        
        // Then try to create a model instance to verify the provider is working
        const model = createAppleModel();
        if (!model) {
            return false;
        }
        
        // If we reach here, Apple Intelligence is available
        return true;
    } catch (error) {
        // Any error during initialization indicates Apple Intelligence is not available
        return false;
    }
}
