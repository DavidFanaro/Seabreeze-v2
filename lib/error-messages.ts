import { ErrorCategory, ErrorClassification, classifyError } from "@/lib/providers/fallback-chain";
import { ProviderId } from "@/lib/types/provider-types";

/**
 * Action that the user can take to resolve an error
 */
export interface ErrorAction {
  id: string;
  label: string;
  description: string;
  actionType: "navigate" | "retry" | "switch" | "dismiss";
  navigateTo?: string;
  providerId?: ProviderId;
}

/**
 * User-friendly error with actions
 */
export interface UserFriendlyError {
  title: string;
  message: string;
  technicalDetails?: string;
  category: ErrorCategory;
  actions: ErrorAction[];
  severity: "info" | "warning" | "error";
}

/**
 * Map of error categories to user-friendly messages
 */
const ERROR_MESSAGES: Record<ErrorCategory, { title: string; message: string; severity: UserFriendlyError["severity"] }> = {
  configuration: {
    title: "Setup Required",
    message: "This provider needs to be configured before use.",
    severity: "warning",
  },
  network: {
    title: "Connection Issue",
    message: "Unable to connect to the AI service. Please check your internet connection.",
    severity: "warning",
  },
  rate_limit: {
    title: "Too Many Requests",
    message: "You've sent too many messages. Please wait a moment before trying again.",
    severity: "info",
  },
  authentication: {
    title: "Authentication Failed",
    message: "Your API key appears to be invalid. Please check your settings.",
    severity: "error",
  },
  model_not_found: {
    title: "Model Unavailable",
    message: "The selected model is not available. Please try a different model.",
    severity: "warning",
  },
  server_error: {
    title: "Service Unavailable",
    message: "The AI service is experiencing issues. Please try again later.",
    severity: "error",
  },
  timeout: {
    title: "Request Timed Out",
    message: "The request took too long. Please try again.",
    severity: "warning",
  },
  unknown: {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again.",
    severity: "error",
  },
};

/**
 * Get actions for a specific error category and provider
 */
function getActionsForError(
  category: ErrorCategory,
  currentProvider?: ProviderId
): ErrorAction[] {
  const actions: ErrorAction[] = [];

  switch (category) {
    case "configuration":
      if (currentProvider && currentProvider !== "apple") {
        actions.push({
          id: "go-to-settings",
          label: "Configure Provider",
          description: `Set up ${currentProvider} in settings`,
          actionType: "navigate",
          navigateTo: `/settings/${currentProvider}`,
        });
      }
      actions.push({
        id: "use-apple",
        label: "Use Apple Intelligence",
        description: "Switch to the built-in Apple AI",
        actionType: "switch",
        providerId: "apple",
      });
      break;

    case "authentication":
      if (currentProvider && currentProvider !== "apple") {
        actions.push({
          id: "check-api-key",
          label: "Check API Key",
          description: "Verify your API key is correct",
          actionType: "navigate",
          navigateTo: `/settings/${currentProvider}`,
        });
      }
      actions.push({
        id: "try-another",
        label: "Try Another Provider",
        description: "Switch to a different AI provider",
        actionType: "navigate",
        navigateTo: "/settings",
      });
      break;

    case "rate_limit":
      actions.push({
        id: "wait-retry",
        label: "Wait and Retry",
        description: "The rate limit will reset shortly",
        actionType: "retry",
      });
      actions.push({
        id: "try-another",
        label: "Try Another Provider",
        description: "Use a different AI provider",
        actionType: "switch",
        providerId: "apple",
      });
      break;

    case "network":
      actions.push({
        id: "retry",
        label: "Try Again",
        description: "Attempt to reconnect",
        actionType: "retry",
      });
      if (currentProvider !== "apple") {
        actions.push({
          id: "use-apple",
          label: "Use Offline AI",
          description: "Apple Intelligence works without internet",
          actionType: "switch",
          providerId: "apple",
        });
      }
      break;

    case "model_not_found":
      actions.push({
        id: "change-model",
        label: "Change Model",
        description: "Select a different model",
        actionType: "navigate",
        navigateTo: "/settings",
      });
      break;

    case "server_error":
    case "timeout":
      actions.push({
        id: "retry",
        label: "Try Again",
        description: "The issue may be temporary",
        actionType: "retry",
      });
      if (currentProvider !== "apple") {
        actions.push({
          id: "use-apple",
          label: "Use Apple Intelligence",
          description: "Try the local AI instead",
          actionType: "switch",
          providerId: "apple",
        });
      }
      break;

    case "unknown":
    default:
      actions.push({
        id: "retry",
        label: "Try Again",
        description: "Attempt the operation again",
        actionType: "retry",
      });
      actions.push({
        id: "dismiss",
        label: "Dismiss",
        description: "Close this message",
        actionType: "dismiss",
      });
      break;
  }

  return actions;
}

/**
 * Convert a raw error into a user-friendly error object
 * 
 * @param error - The raw error (can be Error, string, or unknown)
 * @param currentProvider - The provider that caused the error (optional)
 * @returns UserFriendlyError with helpful message and actions
 */
export function getHumanReadableError(
  error: unknown,
  currentProvider?: ProviderId
): UserFriendlyError {
  const classification = classifyError(error);
  const baseMessage = ERROR_MESSAGES[classification.category];
  const actions = getActionsForError(classification.category, currentProvider);

  return {
    title: baseMessage.title,
    message: baseMessage.message,
    technicalDetails: classification.message,
    category: classification.category,
    actions,
    severity: baseMessage.severity,
  };
}

/**
 * Get a simple error message string for inline display
 * 
 * @param error - The raw error
 * @returns A user-friendly message string
 */
export function getSimpleErrorMessage(error: unknown): string {
  const classification = classifyError(error);
  const baseMessage = ERROR_MESSAGES[classification.category];
  return baseMessage.message;
}

/**
 * Format an error for display in a chat message
 * 
 * @param error - The raw error
 * @param currentProvider - The provider that caused the error
 * @returns Formatted message suitable for chat display
 */
export function formatErrorForChat(
  error: unknown,
  currentProvider?: ProviderId
): string {
  const friendly = getHumanReadableError(error, currentProvider);
  
  let message = `**${friendly.title}**\n\n${friendly.message}`;
  
  // Add suggestion based on severity
  if (friendly.severity === "warning" && friendly.actions.length > 0) {
    const primaryAction = friendly.actions[0];
    message += `\n\n*Suggestion: ${primaryAction.description}*`;
  }
  
  return message;
}

/**
 * Check if an error should show a retry button
 */
export function shouldShowRetry(error: unknown): boolean {
  const classification = classifyError(error);
  return classification.isRetryable;
}

/**
 * Check if an error should suggest switching providers
 */
export function shouldSuggestFallback(error: unknown): boolean {
  const classification = classifyError(error);
  return classification.shouldFallback;
}

/**
 * Get provider-specific error hints
 */
export function getProviderErrorHint(
  error: unknown,
  provider: ProviderId
): string | null {
  const classification = classifyError(error);

  switch (provider) {
    case "ollama":
      if (classification.category === "network") {
        return "Make sure Ollama is running and the URL is correct. Try 'http://localhost:11434' for local setups.";
      }
      break;

    case "openai":
      if (classification.category === "authentication") {
        return "Your OpenAI API key may have expired or been revoked. Check your OpenAI dashboard.";
      }
      if (classification.category === "rate_limit") {
        return "You may have exceeded your OpenAI API quota. Check your usage limits.";
      }
      break;

    case "openrouter":
      if (classification.category === "authentication") {
        return "Check that your OpenRouter API key is valid and has sufficient credits.";
      }
      break;

    case "apple":
      if (classification.category === "server_error") {
        return "Apple Intelligence may not be available on this device. Check your iOS/macOS version.";
      }
      break;
  }

  return null;
}
