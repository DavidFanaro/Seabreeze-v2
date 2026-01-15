/**
 * @file constants.ts
 * @purpose Centralized app constants and configuration values
 * @connects-to Application-wide usage for consistent values
 */

export const LAYOUT = {
  MESSAGE_LIST_PADDING_TOP: 125,
} as const;

export const CACHE = {
  PROVIDER_TTL_MS: 5 * 60 * 1000,
  MAX_CACHED_PROVIDERS: 10,
} as const;
