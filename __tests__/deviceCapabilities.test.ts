import { Platform, NativeModules } from "react-native";
import {
    getDevicePlatform,
    isIOS,
    isIPhone,
    isIPad,
    getIOSModel,
    getIOSDeviceName,
    getIPadChip,
    isIPhoneCompatible,
    isIpadCompatible,
    isAppleIntelligenceCompatible,
    getDeviceInfo,
} from "@/lib/deviceCapabilities";

jest.mock("react-native", () => {
    const actual = jest.requireActual("react-native");
    return {
        ...actual,
        Platform: {
            OS: "ios",
            select: jest.fn(),
        },
        NativeModules: {
            Constants: {
                DeviceId: "iPhone17,1",
                Model: "iPhone 16 Pro",
                systemVersion: "18.0",
            },
        },
    };
});

describe("deviceCapabilities", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        NativeModules.Constants.DeviceId = "iPhone17,1";
        NativeModules.Constants.Model = "iPhone 16 Pro";
        NativeModules.Constants.systemVersion = "18.0";
    });

    describe("getDevicePlatform", () => {
        test("returns ios for iOS platform", () => {
            (Platform.OS as any) = "ios";
            expect(getDevicePlatform()).toBe("ios");
        });

        test("returns android for Android platform", () => {
            (Platform.OS as any) = "android";
            expect(getDevicePlatform()).toBe("android");
        });

        test("returns web for web platform", () => {
            (Platform.OS as any) = "web";
            expect(getDevicePlatform()).toBe("web");
        });
    });

    describe("isIPhone", () => {
        test("returns true for iPhone device", () => {
            NativeModules.Constants.DeviceId = "iPhone17,1";
            expect(isIPhone()).toBe(true);
        });

        test("returns false for iPad device", () => {
            NativeModules.Constants.DeviceId = "iPad14,1";
            expect(isIPhone()).toBe(false);
        });

        test("returns false for non-iOS device", () => {
            (Platform.OS as any) = "android";
            expect(isIPhone()).toBe(false);
        });
    });

    describe("isIPad", () => {
        test("returns true for iPad device", () => {
            NativeModules.Constants.DeviceId = "iPad14,1";
            expect(isIPad()).toBe(true);
        });

        test("returns false for iPhone device", () => {
            NativeModules.Constants.DeviceId = "iPhone17,1";
            expect(isIPad()).toBe(false);
        });

        test("returns false for non-iOS device", () => {
            (Platform.OS as any) = "android";
            expect(isIPad()).toBe(false);
        });
    });

    describe("isIOS", () => {
        test("returns true for iOS platform", () => {
            (Platform.OS as any) = "ios";
            expect(isIOS()).toBe(true);
        });

        test("returns false for Android platform", () => {
            (Platform.OS as any) = "android";
            expect(isIOS()).toBe(false);
        });

        test("returns false for web platform", () => {
            (Platform.OS as any) = "web";
            expect(isIOS()).toBe(false);
        });
    });

    describe("getIOSModel", () => {
        test("returns model ID for iOS device", () => {
            (Platform.OS as any) = "ios";
            expect(getIOSModel()).toBe("iPhone17,1");
        });

        test("returns null for non-iOS device", () => {
            (Platform.OS as any) = "android";
            expect(getIOSModel()).toBeNull();
        });
    });

    describe("getIOSDeviceName", () => {
        test("returns iPhone 16 Pro name", () => {
            const NativeModules = require("react-native").NativeModules;
            NativeModules.Constants.DeviceId = "iPhone17,1";
            const result = getIOSDeviceName();
            expect(result).toBe("iPhone 16 Pro");
        });

        test("returns iPhone 16 name", () => {
            const NativeModules = require("react-native").NativeModules;
            NativeModules.Constants.DeviceId = "iPhone16,1";
            expect(getIOSDeviceName()).toBe("iPhone 16");
        });

        test("returns iPhone 15 Pro name", () => {
            const NativeModules = require("react-native").NativeModules;
            NativeModules.Constants.DeviceId = "iPhone17,3";
            expect(getIOSDeviceName()).toBe("iPhone 15 Pro");
        });

        test("returns null for unknown model ID", () => {
            const NativeModules = require("react-native").NativeModules;
            NativeModules.Constants.DeviceId = "iPhone99,9";
            expect(getIOSDeviceName()).toBeNull();
        });

        test("returns null when DeviceId is null", () => {
            const NativeModules = require("react-native").NativeModules;
            NativeModules.Constants.DeviceId = null;
            expect(getIOSDeviceName()).toBeNull();
        });
    });

    describe("getIPadChip", () => {
        test("returns M1 for iPadOS 18+", () => {
            (Platform.OS as any) = "ios";
            const NativeModules = require("react-native").NativeModules;
            NativeModules.Constants.systemVersion = "18.0";
            expect(getIPadChip()).toBe("M1");
        });

        test("returns A17 Pro for iPadOS 17", () => {
            (Platform.OS as any) = "ios";
            const NativeModules = require("react-native").NativeModules;
            NativeModules.Constants.systemVersion = "17.0";
            expect(getIPadChip()).toBe("A17 Pro");
        });

        test("returns null for iPadOS 16", () => {
            (Platform.OS as any) = "ios";
            const NativeModules = require("react-native").NativeModules;
            NativeModules.Constants.systemVersion = "16.0";
            expect(getIPadChip()).toBeNull();
        });

        test("returns null for non-iOS device", () => {
            (Platform.OS as any) = "android";
            expect(getIPadChip()).toBeNull();
        });

        test("returns null for invalid version string", () => {
            (Platform.OS as any) = "ios";
            const NativeModules = require("react-native").NativeModules;
            NativeModules.Constants.systemVersion = "invalid";
            expect(getIPadChip()).toBeNull();
        });
    });

    describe("isIPhoneCompatible", () => {
        beforeEach(() => {
            (Platform.OS as any) = "ios";
        });

        const compatibleModels = [
            "iPhone16,1",
            "iPhone16,2",
            "iPhone17,1",
            "iPhone17,2",
            "iPhone17,3",
            "iPhone17,4",
        ];

        compatibleModels.forEach((model) => {
            test(`returns true for ${model}`, () => {
                const NativeModules = require("react-native").NativeModules;
                NativeModules.Constants.DeviceId = model;
                expect(isIPhoneCompatible()).toBe(true);
            });
        });

        const incompatibleModels = [
            "iPhone15,1",
            "iPhone14,1",
            "iPhone99,9",
            null,
        ];

        incompatibleModels.forEach((model) => {
            test(`returns false for ${model || "null"}`, () => {
                const NativeModules = require("react-native").NativeModules;
                NativeModules.Constants.DeviceId = model;
                expect(isIPhoneCompatible()).toBe(false);
            });
        });

        test("returns false for non-iOS device", () => {
            (Platform.OS as any) = "android";
            expect(isIPhoneCompatible()).toBe(false);
        });
    });

    describe("isIpadCompatible", () => {
        beforeEach(() => {
            (Platform.OS as any) = "ios";
        });

        test("returns true for M1 chip", () => {
            NativeModules.Constants.DeviceId = "iPad14,1";
            NativeModules.Constants.systemVersion = "18.0";
            expect(isIpadCompatible()).toBe(true);
        });

        test("returns true for A17 Pro chip", () => {
            NativeModules.Constants.DeviceId = "iPad14,1";
            NativeModules.Constants.systemVersion = "17.0";
            expect(isIpadCompatible()).toBe(true);
        });

        test("returns true for M2 chip (iOS 18+)", () => {
            NativeModules.Constants.DeviceId = "iPad14,1";
            NativeModules.Constants.systemVersion = "18.0";
            expect(isIpadCompatible()).toBe(true);
        });

        test("returns false for iPadOS 16 or lower", () => {
            NativeModules.Constants.DeviceId = "iPad14,1";
            NativeModules.Constants.systemVersion = "16.0";
            expect(isIpadCompatible()).toBe(false);
        });

        test("returns false for non-iOS device", () => {
            (Platform.OS as any) = "android";
            expect(isIpadCompatible()).toBe(false);
        });
    });

    describe("isAppleIntelligenceCompatible", () => {
        beforeEach(() => {
            (Platform.OS as any) = "ios";
        });

        test("returns true for compatible iPhone", () => {
            NativeModules.Constants.DeviceId = "iPhone17,1";
            expect(isAppleIntelligenceCompatible()).toBe(true);
        });

        test("returns true for compatible iPad", () => {
            NativeModules.Constants.DeviceId = "iPad14,1";
            NativeModules.Constants.systemVersion = "18.0";
            expect(isAppleIntelligenceCompatible()).toBe(true);
        });

        test("returns false for incompatible iPhone", () => {
            NativeModules.Constants.DeviceId = "iPhone15,1";
            NativeModules.Constants.systemVersion = "17.0";
            expect(isAppleIntelligenceCompatible()).toBe(false);
        });

        test("returns false for non-iOS device", () => {
            (Platform.OS as any) = "android";
            expect(isAppleIntelligenceCompatible()).toBe(false);
        });
    });

    describe("getDeviceInfo", () => {
        test("returns correct info for compatible iPhone", () => {
            (Platform.OS as any) = "ios";
            const NativeModules = require("react-native").NativeModules;
            NativeModules.Constants.DeviceId = "iPhone17,1";
            
            const info = getDeviceInfo();
            expect(info.platform).toBe("ios");
            expect(info.isIOS).toBe(true);
            expect(info.isAppleIntelligenceCompatible).toBe(true);
        });

        test("returns correct info for Android device", () => {
            (Platform.OS as any) = "android";
            
            const info = getDeviceInfo();
            expect(info.platform).toBe("android");
            expect(info.isIOS).toBe(false);
            expect(info.isAppleIntelligenceCompatible).toBe(false);
        });

        test("returns correct info for web platform", () => {
            (Platform.OS as any) = "web";
            
            const info = getDeviceInfo();
            expect(info.platform).toBe("web");
            expect(info.isIOS).toBe(false);
            expect(info.isAppleIntelligenceCompatible).toBe(false);
        });
    });
});
