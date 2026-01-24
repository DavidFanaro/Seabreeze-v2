/**
 * @file imageParser.ts
 * @purpose Parse and validate image URLs from markdown
 */

export interface MarkdownImage {
    url: string;
    alt: string;
    title?: string;
}

/**
 * Parse markdown image syntax: ![alt](url "title")
 */
export const parseImageSyntax = (content: string): MarkdownImage | null => {
    // Match: ![alt](url) or ![alt](url "title")
    const imageRegex = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/;
    const match = content.match(imageRegex);

    if (!match) return null;

    return {
        alt: match[1] || "",
        url: match[2],
        title: match[3],
    };
};

/**
 * Extract all images from markdown content
 */
export const extractAllImages = (
    content: string
): { images: MarkdownImage[]; positions: { start: number; end: number; raw: string }[] } => {
    const images: MarkdownImage[] = [];
    const positions: { start: number; end: number; raw: string }[] = [];

    // Global regex for finding all image patterns
    const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
        images.push({
            alt: match[1] || "",
            url: match[2],
            title: match[3],
        });
        positions.push({
            start: match.index,
            end: match.index + match[0].length,
            raw: match[0],
        });
    }

    return { images, positions };
};

/**
 * Validate if a URL is a valid image URL
 */
export const isValidImageUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);

        // Check protocol
        if (!["http:", "https:", "data:", "file:"].includes(parsed.protocol)) {
            return false;
        }

        // For data URLs, check if it's an image
        if (parsed.protocol === "data:") {
            return url.startsWith("data:image/");
        }

        // Check common image extensions
        const imageExtensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".webp",
            ".svg",
            ".bmp",
            ".ico",
            ".avif",
            ".heic",
            ".heif",
        ];
        const pathname = parsed.pathname.toLowerCase();

        // If it has an image extension, it's likely valid
        if (imageExtensions.some((ext) => pathname.endsWith(ext))) {
            return true;
        }

        // Also accept URLs without extensions (could be image APIs)
        return true;
    } catch {
        // Relative URLs or malformed URLs
        return url.startsWith("/") || url.startsWith("./") || url.startsWith("../");
    }
};

/**
 * Get image dimensions from URL (for aspect ratio calculation)
 * Returns a promise that resolves to dimensions or null
 */
export const getImageDimensions = (
    url: string
): Promise<{ width: number; height: number } | null> => {
    return new Promise((resolve) => {
        // This would typically use Image.getSize in React Native
        // For now, return null and let the component handle it
        resolve(null);
    });
};

/**
 * Generate a cache key for an image URL
 */
export const generateImageCacheKey = (url: string): string => {
    // Create a simple hash of the URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return `img_${Math.abs(hash).toString(36)}`;
};

/**
 * Check if URL is a data URL
 */
export const isDataUrl = (url: string): boolean => {
    return url.startsWith("data:");
};

/**
 * Check if URL is a local file URL
 */
export const isLocalUrl = (url: string): boolean => {
    return url.startsWith("file://") || url.startsWith("/") || url.startsWith("./");
};

/**
 * Get the file extension from a URL
 */
export const getImageExtension = (url: string): string | null => {
    try {
        if (isDataUrl(url)) {
            const mimeMatch = url.match(/data:image\/(\w+)/);
            return mimeMatch ? mimeMatch[1] : null;
        }

        const parsed = new URL(url);
        const pathname = parsed.pathname;
        const extMatch = pathname.match(/\.(\w+)$/);
        return extMatch ? extMatch[1].toLowerCase() : null;
    } catch {
        const extMatch = url.match(/\.(\w+)(?:[?#]|$)/);
        return extMatch ? extMatch[1].toLowerCase() : null;
    }
};
