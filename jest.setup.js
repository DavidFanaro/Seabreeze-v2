jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

jest.mock('@react-native-ai/apple', () => ({
  createApple: jest.fn(),
  createAnthropic: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(),
}));

jest.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: jest.fn(),
}));

jest.mock('ollama-ai-provider-v2', () => ({
  createOllama: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
  openDatabaseSync: jest.fn(),
}));

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardProvider: ({ children }) => children,
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
}));

global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
