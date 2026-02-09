export const DEFAULT_CHAT_TITLE = "Chat";
export const UNTITLED_CHAT_LABEL = "Untitled chat";

export function normalizeTitleForPersistence(rawTitle: string): string | null {
  const trimmedTitle = rawTitle.trim();
  if (!trimmedTitle || trimmedTitle === DEFAULT_CHAT_TITLE) {
    return null;
  }

  return trimmedTitle;
}

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
