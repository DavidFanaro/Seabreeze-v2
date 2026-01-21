import { Platform } from "react-native";

export type DevicePlatform = "ios" | "android" | "web";

export interface DeviceInfo {
    platform: DevicePlatform;
    isIOS: boolean;
    isAppleIntelligenceCompatible: boolean;
}

const COMPATIBLE_IPHONE_MODELS = [
    "iPhone16,1",
    "iPhone16,2",
    "iPhone17,1",
    "iPhone17,2",
    "iPhone17,3",
    "iPhone17,4",
];

const COMPATIBLE_IPHONE_NAMES = [
    "iPhone 16",
    "iPhone 16 Plus",
    "iPhone 16 Pro",
    "iPhone 16 Pro Max",
    "iPhone 15 Pro",
    "iPhone 15 Pro Max",
];

const COMPATIBLE_IPAD_CHIPS = [
    "A17 Pro",
    "M1",
    "M2",
    "M3",
    "M4",
];

export function getDevicePlatform(): DevicePlatform {
    const platform = Platform.OS;
    if (platform === "ios") {
        return "ios";
    }
    if (platform === "android") {
        return "android";
    }
    return "web";
}

export function isIOS(): boolean {
    return Platform.OS === "ios";
}

export function isIPhone(): boolean {
    if (!isIOS()) {
        return false;
    }

    const model = getIOSModel();
    if (!model) {
        return false;
    }

    return model.startsWith("iPhone");
}

export function isIPad(): boolean {
    if (!isIOS()) {
        return false;
    }

    const model = getIOSModel();
    if (!model) {
        return false;
    }

    return model.startsWith("iPad");
}

export function getIOSModel(): string | null {
    if (!isIOS()) {
        return null;
    }

    try {
        const NativeModules = require("react-native").NativeModules;
        const deviceInfo = NativeModules.Constants || NativeModules.DeviceInfo;
        
        if (deviceInfo?.DeviceId) {
            return deviceInfo.DeviceId;
        }
        
        if (deviceInfo?.Model) {
            return deviceInfo.Model;
        }
        
        return null;
    } catch {
        return null;
    }
}

export function getIOSDeviceName(): string | null {
    const modelId = getIOSModel();
    if (!modelId) {
        return null;
    }

    const deviceNameMap: Record<string, string> = {
        "iPhone16,1": "iPhone 16",
        "iPhone16,2": "iPhone 16 Plus",
        "iPhone17,1": "iPhone 16 Pro",
        "iPhone17,2": "iPhone 16 Pro Max",
        "iPhone17,3": "iPhone 15 Pro",
        "iPhone17,4": "iPhone 15 Pro Max",
        "iPhone15,4": "iPhone 15 Pro",
        "iPhone15,5": "iPhone 15 Pro Max",
    };

    return deviceNameMap[modelId] || null;
}

export function getIPadChip(): string | null {
    if (!isIOS()) {
        return null;
    }

    try {
        const NativeModules = require("react-native").NativeModules;
        const deviceInfo = NativeModules.Constants || NativeModules.DeviceInfo;
        
        if (deviceInfo?.supportedInterfaceOrientations) {
            return detectIpadChipFromPlatformVersion(deviceInfo.platformVersion);
        }
        
        if (deviceInfo?.systemVersion) {
            return detectIpadChipFromPlatformVersion(deviceInfo.systemVersion);
        }
        
        return null;
    } catch {
        return null;
    }
}

function detectIpadChipFromPlatformVersion(platformVersion: string): string | null {
    if (!platformVersion) {
        return null;
    }

    const versionMatch = platformVersion.match(/^(\d+)\.(\d+)$/);
    if (!versionMatch) {
        return null;
    }

    const majorVersion = parseInt(versionMatch[1], 10);
    
    if (majorVersion >= 18) {
        return "M1";
    }
    if (majorVersion === 17) {
        return "A17 Pro";
    }
    
    return null;
}

export function isIPhoneCompatible(): boolean {
    if (!isIOS()) {
        return false;
    }

    const model = getIOSModel();
    if (!model) {
        return false;
    }

    return COMPATIBLE_IPHONE_MODELS.includes(model);
}

export function isIpadCompatible(): boolean {
    if (!isIOS()) {
        return false;
    }

    if (!isIPad()) {
        return false;
    }

    const chip = getIPadChip();
    if (!chip) {
        return false;
    }

    return COMPATIBLE_IPAD_CHIPS.includes(chip);
}

export function isAppleIntelligenceCompatible(): boolean {
    if (!isIOS()) {
        return false;
    }

    return isIPhoneCompatible() || isIpadCompatible();
}

export function getDeviceInfo(): DeviceInfo {
    return {
        platform: getDevicePlatform(),
        isIOS: isIOS(),
        isAppleIntelligenceCompatible: isAppleIntelligenceCompatible(),
    };
}
