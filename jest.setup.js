jest.mock('expo/fetch', () => ({
  fetch: jest.fn(),
}));

jest.mock('@react-native-ai/apple', () => ({
  apple: jest.fn(),
  createAppleProvider: jest.fn(),
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
  useSQLiteContext: jest.fn(),
}));

jest.mock('heroui-native', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');

  const Button = ({ children, isDisabled, onPress, testID, ...props }) => (
    React.createElement(
      Pressable,
      {
        ...props,
        accessibilityRole: 'button',
        disabled: isDisabled,
        onPress,
        testID,
      },
      children,
    )
  );

  const Spinner = (props) => React.createElement(Text, props, 'spinner');
  const Input = React.forwardRef((props, ref) => React.createElement(TextInput, { ...props, ref }));
  const TextArea = React.forwardRef((props, ref) => React.createElement(TextInput, { ...props, multiline: true, ref }));
  const TextField = ({ children, ...props }) => React.createElement(View, props, children);
  const HeroUINativeProvider = ({ children }) => children;

  Input.displayName = 'HeroUIInputMock';
  TextArea.displayName = 'HeroUITextAreaMock';

  return {
    __esModule: true,
    Button,
    Spinner,
    Input,
    TextArea,
    TextField,
    HeroUINativeProvider,
  };
});

jest.mock('react-native-keyboard-controller', () => ({
  KeyboardProvider: ({ children }) => children,
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
}));

jest.mock('react-native-worklets', () => ({}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { FlatList, View } = require('react-native');
  const identity = (value) => value;
  const AnimatedView = React.forwardRef(({ children, ...props }, ref) => (
    React.createElement(View, { ...props, ref }, children)
  ));
  const AnimatedFlatList = React.forwardRef((props, ref) => (
    React.createElement(FlatList, { ...props, ref })
  ));

  AnimatedView.displayName = 'AnimatedViewMock';
  AnimatedFlatList.displayName = 'AnimatedFlatListMock';

  class KeyframeMock {
    constructor() {}
    duration() { return this; }
    delay() { return this; }
    easing() { return this; }
  }

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      FlatList: AnimatedFlatList,
      createAnimatedComponent: identity,
    },
    View: AnimatedView,
    FlatList: AnimatedFlatList,
    createAnimatedComponent: identity,
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (updater) => (typeof updater === 'function' ? updater() : {}),
    withTiming: identity,
    withSpring: identity,
    interpolate: (value, input, output) => {
      if (!Array.isArray(input) || !Array.isArray(output) || input.length === 0 || output.length === 0) {
        return value;
      }

      if (value <= input[0]) return output[0];
      if (value >= input[input.length - 1]) return output[output.length - 1];

      for (let index = 1; index < input.length; index += 1) {
        if (value <= input[index]) {
          return output[index];
        }
      }

      return output[output.length - 1];
    },
    Easing: {
      in: identity,
      out: identity,
      inOut: identity,
      bezier: () => identity,
      linear: identity,
      ease: identity,
    },
    FadeIn: {
      duration: () => ({ springify: () => ({}) }),
    },
    FadeOut: {
      duration: () => ({}),
    },
    Keyframe: KeyframeMock,
    runOnJS: identity,
    runOnUI: identity,
  };
});

global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
