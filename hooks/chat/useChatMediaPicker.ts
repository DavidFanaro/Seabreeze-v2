import { useCallback, useState } from "react";
import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";

import {
    asDataUri,
    isModelSupportedImageType,
    MAX_CHAT_ATTACHMENTS,
    MAX_CHAT_ATTACHMENT_BYTES,
    normalizePickerAsset,
} from "@/lib/chat-attachments";
import type { ChatAttachment } from "@/types/chat.types";

interface UseChatMediaPickerOptions {
    isInputLocked: boolean;
}

interface UseChatMediaPickerReturn {
    pendingAttachments: ChatAttachment[];
    clearPendingAttachments: () => void;
    handleRemoveAttachment: (attachmentId: string) => void;
    handleTakePhoto: () => Promise<void>;
    handleChooseFromLibrary: () => Promise<void>;
}

interface CameraLaunchResolution {
    title: string;
    message: string;
    allowLibraryFallback: boolean;
    allowOpenSettings: boolean;
}

function mapCameraLaunchError(error: unknown): CameraLaunchResolution {
    const message = error instanceof Error ? error.message : "";
    const normalized = message.toLowerCase();

    if (
        normalized.includes("camera not available on simulator")
        || normalized.includes("camera unavailable")
        || normalized.includes("no camera")
    ) {
        return {
            title: "Camera unavailable",
            message: "This device does not have an available camera. Choose from Library instead.",
            allowLibraryFallback: true,
            allowOpenSettings: false,
        };
    }

    if (
        normalized.includes("missing camera")
        || normalized.includes("camera permission")
        || normalized.includes("camera roll permission")
        || normalized.includes("user rejected permissions")
        || normalized.includes("permission")
    ) {
        return {
            title: "Camera permission required",
            message: "Allow camera access in Settings to take photos.",
            allowLibraryFallback: false,
            allowOpenSettings: true,
        };
    }

    return {
        title: "Unable to open camera",
        message: "Could not open the camera right now. Please try again.",
        allowLibraryFallback: false,
        allowOpenSettings: false,
    };
}

export function useChatMediaPicker(
    options: UseChatMediaPickerOptions,
): UseChatMediaPickerReturn {
    const { isInputLocked } = options;
    const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);

    const clearPendingAttachments = useCallback(() => {
        setPendingAttachments([]);
    }, []);

    const handleRemoveAttachment = useCallback((attachmentId: string) => {
        setPendingAttachments((current) => (
            current.filter((attachment) => attachment.id !== attachmentId)
        ));
    }, []);

    const processSelectedAssets = useCallback((assets: ImagePicker.ImagePickerAsset[]) => {
        const skippedUnsupportedImages: string[] = [];
        const normalized = assets.flatMap((asset, index) => {
            const nextAttachment = normalizePickerAsset(asset, index);

            if (nextAttachment.kind === "image") {
                if (typeof asset.base64 === "string" && asset.base64.length > 0) {
                    return [{
                        ...nextAttachment,
                        uri: asDataUri(asset.base64, "image/jpeg"),
                        mediaType: "image/jpeg",
                    }];
                }

                if (!isModelSupportedImageType(nextAttachment.mediaType)) {
                    skippedUnsupportedImages.push(nextAttachment.fileName ?? "image");
                    return [];
                }
            }

            return [nextAttachment];
        });

        if (skippedUnsupportedImages.length > 0) {
            Alert.alert(
                "Unsupported image format",
                "Some images were skipped. Supported formats are JPEG, PNG, GIF, and WEBP.",
            );
        }

        const acceptedAttachments = normalized.filter((attachment) => (
            typeof attachment.fileSize !== "number"
            || attachment.fileSize <= MAX_CHAT_ATTACHMENT_BYTES
        ));

        if (acceptedAttachments.length < normalized.length) {
            Alert.alert(
                "File too large",
                "Each attachment must be 30 MB or smaller.",
            );
        }

        if (acceptedAttachments.length === 0) {
            return;
        }

        setPendingAttachments((current) => ([
            ...current,
            ...acceptedAttachments,
        ].slice(0, MAX_CHAT_ATTACHMENTS)));
    }, []);

    const openAppSettings = useCallback(() => {
        void Linking.openSettings().catch((error) => {
            console.warn("[Chat] Failed to open app settings:", error);
        });
    }, []);

    const ensureCameraPermission = useCallback(async () => {
        let permission = await ImagePicker.getCameraPermissionsAsync();

        if (!permission.granted && permission.canAskAgain) {
            permission = await ImagePicker.requestCameraPermissionsAsync();
        }

        return permission;
    }, []);

    const launchLibraryPicker = useCallback(async (remainingSlots: number) => {
        let result: ImagePicker.ImagePickerResult;

        try {
            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images", "videos"] as ImagePicker.MediaType[],
                allowsMultipleSelection: true,
                selectionLimit: remainingSlots,
                base64: true,
                quality: 1,
            });
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Could not open your media library.";

            Alert.alert("Unable to open media library", message);
            return;
        }

        if (result.canceled || result.assets.length === 0) {
            return;
        }

        processSelectedAssets(result.assets);
    }, [processSelectedAssets]);

    const launchCameraPicker = useCallback(async (remainingSlots: number) => {
        let permission: Awaited<ReturnType<typeof ImagePicker.getCameraPermissionsAsync>>;

        try {
            permission = await ensureCameraPermission();
        } catch (error) {
            console.warn("[Chat] Failed to check camera permission:", error);
            Alert.alert(
                "Unable to access camera",
                "Could not verify camera permissions right now. Please try again.",
            );
            return;
        }

        if (!permission.granted) {
            if (permission.canAskAgain) {
                Alert.alert(
                    "Camera permission required",
                    "Allow camera access to take photos in chat.",
                );
                return;
            }

            Alert.alert(
                "Camera permission required",
                "Camera access is disabled. Enable it in Settings to take photos in chat.",
                [
                    {
                        text: "Not now",
                        style: "cancel",
                    },
                    {
                        text: "Open Settings",
                        onPress: openAppSettings,
                    },
                ],
            );
            return;
        }

        let result: ImagePicker.ImagePickerResult;

        try {
            result = await ImagePicker.launchCameraAsync({
                mediaTypes: ["images"] as ImagePicker.MediaType[],
                allowsEditing: false,
                base64: true,
                quality: 1,
            });
        } catch (error) {
            console.warn("[Chat] launchCameraAsync failed:", error);
            const resolution = mapCameraLaunchError(error);
            const actions: {
                text: string;
                style?: "default" | "cancel" | "destructive";
                onPress?: () => void;
            }[] = [];

            if (resolution.allowLibraryFallback && remainingSlots > 0) {
                actions.push({
                    text: "Choose from Library",
                    onPress: () => {
                        void launchLibraryPicker(remainingSlots);
                    },
                });
            }

            if (resolution.allowOpenSettings) {
                actions.push({
                    text: "Open Settings",
                    onPress: openAppSettings,
                });
            }

            actions.push({
                text: "OK",
                style: "cancel",
            });

            Alert.alert(resolution.title, resolution.message, actions);
            return;
        }

        if (result.canceled || result.assets.length === 0) {
            return;
        }

        processSelectedAssets(result.assets);
    }, [ensureCameraPermission, launchLibraryPicker, openAppSettings, processSelectedAssets]);

    const handleTakePhoto = useCallback(async () => {
        if (isInputLocked) {
            return;
        }

        if (pendingAttachments.length >= MAX_CHAT_ATTACHMENTS) {
            Alert.alert(
                "Attachment limit reached",
                `You can attach up to ${MAX_CHAT_ATTACHMENTS} items per message.`,
            );
            return;
        }

        const remainingSlots = MAX_CHAT_ATTACHMENTS - pendingAttachments.length;
        await launchCameraPicker(remainingSlots);
    }, [isInputLocked, launchCameraPicker, pendingAttachments.length]);

    const handleChooseFromLibrary = useCallback(async () => {
        if (isInputLocked) {
            return;
        }

        if (pendingAttachments.length >= MAX_CHAT_ATTACHMENTS) {
            Alert.alert(
                "Attachment limit reached",
                `You can attach up to ${MAX_CHAT_ATTACHMENTS} items per message.`,
            );
            return;
        }

        const remainingSlots = MAX_CHAT_ATTACHMENTS - pendingAttachments.length;
        await launchLibraryPicker(remainingSlots);
    }, [isInputLocked, launchLibraryPicker, pendingAttachments.length]);

    return {
        pendingAttachments,
        clearPendingAttachments,
        handleRemoveAttachment,
        handleTakePhoto,
        handleChooseFromLibrary,
    };
}
