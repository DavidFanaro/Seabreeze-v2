/**
 * @file constants.ts
 * @purpose Centralized app constants and configuration values
 * @connects-to Application-wide usage for consistent values
 */

/**
 * Layout constants for UI spacing and dimensions.
 */
export const LAYOUT = {
  /** Top padding for message list to account for header */
  MESSAGE_LIST_PADDING_TOP: 125,
} as const;

/**
 * Cache configuration for performance optimization.
 */
export const CACHE = {
  /** TTL for cached provider instances (5 minutes) */
  PROVIDER_TTL_MS: 5 * 60 * 1000,
  /** Maximum number of providers to keep in cache */
  MAX_CACHED_PROVIDERS: 10,
} as const;
