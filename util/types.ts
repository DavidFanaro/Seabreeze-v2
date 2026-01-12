export type MessageRole = "user" | "assistant";

export interface ChatMessage {
    id: string;
    role: MessageRole;
    message: string;
}

/**
 * Formats a date into a human-readable relative time string
 * e.g., "Just now", "5 min ago", "2 hours ago", "Yesterday", "Dec 15"
 */
export const formatRelativeTime = (date: Date | null | undefined): string => {
    if (!date) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
        return "Just now";
    } else if (diffMin < 60) {
        return `${diffMin} min ago`;
    } else if (diffHour < 24) {
        return diffHour === 1 ? "1 hour ago" : `${diffHour} hours ago`;
    } else if (diffDay === 1) {
        return "Yesterday";
    } else if (diffDay < 7) {
        return `${diffDay} days ago`;
    } else {
        // Format as "Dec 15" for older dates
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }
};
