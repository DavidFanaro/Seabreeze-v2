/**
 * @file chat-title.ts
 * @purpose Chat title normalization for storage and display
 * @connects-to useTitleGeneration hook, database schema
 */

export const DEFAULT_CHAT_TITLE = "Chat";

export const UNTITLED_CHAT_LABEL = "Untitled chat";

/**
 * Normalizes title for database storage.
 * Returns null if title is empty or equals default - these don't need storing.
 */
export function normalizeTitleForPersistence(rawTitle: string): string | null {
  const trimmedTitle = rawTitle.trim();
  if (!trimmedTitle || trimmedTitle === DEFAULT_CHAT_TITLE) {
    return null;
  }

  return trimmedTitle;
}

/**
 * Converts raw title from storage to display-friendly label.
 * Handles null/undefined and empty strings by returning placeholder.
 */
export function getChatTitleForDisplay(rawTitle: string | null | undefined): string {
  if (typeof rawTitle !== "string") {
    return UNTITLED_CHAT_LABEL;
  }

  const trimmedTitle = rawTitle.trim();
  if (!trimmedTitle || trimmedTitle === DEFAULT_CHAT_TITLE) {
    return UNTITLED_CHAT_LABEL;
  }

  return trimmedTitle;
}
