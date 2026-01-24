/**
 * @file store.types.ts
 * @purpose Store-related type definitions
 * @connects-to Zustand stores
 */

import type { ProviderId } from "./provider.types";

export interface AuthState {
  openaiApiKey: string;
  openrouterApiKey: string;
  ollamaBaseUrl: string;
}



export interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  hapticEnabled: boolean;
  autoGenerateTitles: boolean;
  messageFontSize: number;
}
