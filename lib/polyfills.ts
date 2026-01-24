/**
 * Polyfills required for Vercel AI SDK streaming in React Native/Expo
 * 
 * These polyfills provide TextEncoderStream, TextDecoderStream, and structuredClone
 * which are needed for the AI SDK to properly process streaming responses.
 * 
 * This file must be imported as the FIRST import in app/_layout.tsx
 */

import { Platform } from "react-native";

const polyfillGlobal = <T>(name: string, getValue: () => T): void => {
    const globalObject = globalThis as Record<string, unknown>;

    if (typeof globalObject[name] === "undefined") {
        globalObject[name] = getValue();
    }
};

if (Platform.OS !== "web") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TextEncoderStream, TextDecoderStream } = require("@stardazed/streams-text-encoding");

    // Only polyfill structuredClone if it doesn't exist
    if (typeof (globalThis as Record<string, unknown>).structuredClone === "undefined") {
        polyfillGlobal("structuredClone", () => {
            return <T>(value: T): T => {
                if (value === undefined) return undefined as T;
                if (value === null) return null as T;
                return JSON.parse(JSON.stringify(value));
            };
        });
    }

    polyfillGlobal("TextEncoderStream", () => TextEncoderStream);
    polyfillGlobal("TextDecoderStream", () => TextDecoderStream);
}

export {};
