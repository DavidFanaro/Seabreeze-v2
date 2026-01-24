/**
 * @file ImageComponent.tsx
 * @purpose Interactive image component with lazy loading, caching, fullscreen, and gallery
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    View,
    Image,
    TouchableOpacity,
    Modal,
    Dimensions,
    ActivityIndicator,
    Text,
    ScrollView,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Share,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/components/ui/ThemeProvider";
import useHapticFeedback from "@/hooks/useHapticFeedback";
import { createMarkdownStyles } from "../styles";
import { cacheImage, getCachedImagePath } from "../utils";
import { type MarkdownImage } from "../parsers";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GALLERY_THRESHOLD = 3;

interface ImageComponentProps {
    images: MarkdownImage[];
}

interface SingleImageProps {
    image: MarkdownImage;
    onPress: () => void;
}

interface FullscreenViewerProps {
    images: MarkdownImage[];
    initialIndex: number;
    visible: boolean;
    onClose: () => void;
}

/**
 * Single image with lazy loading
 */
const SingleImage: React.FC<SingleImageProps> = ({ image, onPress }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createMarkdownStyles(theme), [theme]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [localUri, setLocalUri] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState({ width: SCREEN_WIDTH - 32, height: 200 });

    useEffect(() => {
        let mounted = true;

        const loadImage = async () => {
            try {
                // Check cache first
                const cachedPath = await getCachedImagePath(image.url);
                if (cachedPath && mounted) {
                    setLocalUri(cachedPath);
                    setLoading(false);
                    return;
                }

                // Cache the image
                const result = await cacheImage(image.url);
                if (result && mounted) {
                    setLocalUri(result.localPath);
                }

                // Get actual image dimensions
                Image.getSize(
                    image.url,
                    (width, height) => {
                        if (mounted) {
                            const maxWidth = SCREEN_WIDTH - 32;
                            const aspectRatio = width / height;
                            const displayWidth = Math.min(width, maxWidth);
                            const displayHeight = displayWidth / aspectRatio;
                            setDimensions({
                                width: displayWidth,
                                height: Math.min(displayHeight, 400),
                            });
                        }
                    },
                    () => {
                        // Use default dimensions on error
                    }
                );

                if (mounted) {
                    setLoading(false);
                }
            } catch {
                if (mounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        loadImage();

        return () => {
            mounted = false;
        };
    }, [image.url]);

    const handleError = useCallback(() => {
        setError(true);
        setLoading(false);
    }, []);

    const handleLoad = useCallback(() => {
        setLoading(false);
    }, []);

    if (error) {
        return (
            <View
                style={[
                    styles.imageContainer,
                    {
                        backgroundColor: theme.colors.surface,
                        width: dimensions.width,
                        height: 100,
                        justifyContent: "center",
                        alignItems: "center",
                    },
                ]}
            >
                <SymbolView
                    name="exclamationmark.triangle"
                    size={24}
                    tintColor={theme.colors.textSecondary}
                />
                <Text style={{ color: theme.colors.textSecondary, marginTop: 8, fontSize: 12 }}>
                    Failed to load image
                </Text>
            </View>
        );
    }

    const imageSource = localUri ? { uri: localUri } : { uri: image.url };

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.imageContainer}>
            <Image
                source={imageSource as any}
                style={{
                    width: dimensions.width,
                    height: dimensions.height,
                    borderRadius: 8,
                }}
                resizeMode="contain"
                onError={handleError}
                onLoad={handleLoad}
            />
            {loading && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: theme.colors.surface,
                    }}
                >
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                </View>
            )}
            {image.alt && (
                <Text style={styles.imageCaption}>{image.alt}</Text>
            )}
        </TouchableOpacity>
    );
};

/**
 * Fullscreen image viewer with swipe navigation
 */
const FullscreenViewer: React.FC<FullscreenViewerProps> = ({
    images,
    initialIndex,
    visible,
    onClose,
}) => {
    const { theme } = useTheme();
    const { triggerSuccess, triggerPress } = useHapticFeedback();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (visible) {
            setCurrentIndex(initialIndex);
            // Scroll to initial image
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                    x: initialIndex * SCREEN_WIDTH,
                    animated: false,
                });
            }, 100);
        }
    }, [visible, initialIndex]);

    const handleScroll = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const offsetX = event.nativeEvent.contentOffset.x;
            const newIndex = Math.round(offsetX / SCREEN_WIDTH);
            if (newIndex !== currentIndex && newIndex >= 0 && newIndex < images.length) {
                setCurrentIndex(newIndex);
            }
        },
        [currentIndex, images.length]
    );

    const handleSave = useCallback(async () => {
        try {
            const currentImage = images[currentIndex];
            await Share.share({
                url: currentImage.url,
                message: currentImage.alt || "Check out this image",
            });
            triggerSuccess();
        } catch {
            // User cancelled or error
        }
    }, [currentIndex, images, triggerSuccess]);

    const handleShare = useCallback(async () => {
        try {
            const currentImage = images[currentIndex];
            await Share.share({
                url: currentImage.url,
                message: currentImage.alt || "Check out this image",
            });
            triggerPress("light");
        } catch {
            // User cancelled or error
        }
    }, [currentIndex, images, triggerPress]);

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: theme.colors.overlay }}>
                {/* Header */}
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: 60,
                        paddingHorizontal: 20,
                        paddingBottom: 20,
                    }}
                >
                    <TouchableOpacity onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                        <SymbolView name="xmark" size={24} tintColor={theme.colors.overlayForeground} />
                    </TouchableOpacity>
                    {images.length > 1 && (
                        <Text style={{ color: theme.colors.overlayForeground, fontSize: 16 }}>
                            {currentIndex + 1} / {images.length}
                        </Text>
                    )}
                    <View style={{ flexDirection: "row", gap: 20 }}>
                        <TouchableOpacity onPress={handleShare} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                            <SymbolView name="square.and.arrow.up" size={22} tintColor={theme.colors.overlayForeground} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                            <SymbolView name="square.and.arrow.down" size={22} tintColor={theme.colors.overlayForeground} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Image carousel */}
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    style={{ flex: 1 }}
                >
                    {images.map((image, index) => (
                        <View
                            key={index}
                            style={{
                                width: SCREEN_WIDTH,
                                height: SCREEN_HEIGHT - 200,
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <Image
                                source={{ uri: image.url }}
                                style={{
                                    width: SCREEN_WIDTH - 20,
                                    height: SCREEN_HEIGHT - 250,
                                }}
                                resizeMode="contain"
                            />
                        </View>
                    ))}
                </ScrollView>

                {/* Caption */}
                {images[currentIndex]?.alt && (
                    <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
                        <Text
                            style={{
                                color: theme.colors.overlayForeground,
                                fontSize: 14,
                                textAlign: "center",
                                opacity: 0.8,
                            }}
                        >
                            {images[currentIndex].alt}
                        </Text>
                    </View>
                )}

                {/* Pagination dots */}
                {images.length > 1 && images.length <= 10 && (
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "center",
                            paddingBottom: 40,
                            gap: 8,
                        }}
                    >
                        {images.map((_, index) => (
                            <View
                                key={index}
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor:
                                        index === currentIndex
                                            ? theme.colors.accent
                                            : "rgba(255,255,255,0.3)",
                                }}
                            />
                        ))}
                    </View>
                )}
            </View>
        </Modal>
    );
};

/**
 * Gallery view for 3+ images
 */
const GalleryView: React.FC<{ images: MarkdownImage[]; onImagePress: (index: number) => void }> = ({
    images,
    onImagePress,
}) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createMarkdownStyles(theme), [theme]);

    const imageSize = (SCREEN_WIDTH - 48) / 3;

    return (
        <View style={styles.galleryContainer}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                {images.map((image, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => onImagePress(index)}
                        activeOpacity={0.8}
                        style={{
                            width: imageSize,
                            height: imageSize,
                            borderRadius: theme.borderRadius.sm,
                            overflow: "hidden",
                        }}
                    >
                        <Image
                            source={{ uri: image.url }}
                            style={{
                                width: "100%",
                                height: "100%",
                            }}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

/**
 * Main image component - handles single images and galleries
 */
export const ImageComponent: React.FC<ImageComponentProps> = ({ images }) => {
    const [fullscreenVisible, setFullscreenVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const handleImagePress = useCallback((index: number) => {
        setSelectedIndex(index);
        setFullscreenVisible(true);
    }, []);

    const handleClose = useCallback(() => {
        setFullscreenVisible(false);
    }, []);

    if (images.length === 0) return null;

    // Gallery mode for 3+ images
    if (images.length >= GALLERY_THRESHOLD) {
        return (
            <>
                <GalleryView images={images} onImagePress={handleImagePress} />
                <FullscreenViewer
                    images={images}
                    initialIndex={selectedIndex}
                    visible={fullscreenVisible}
                    onClose={handleClose}
                />
            </>
        );
    }

    // Single or dual image mode
    return (
        <>
            {images.map((image, index) => (
                <SingleImage
                    key={index}
                    image={image}
                    onPress={() => handleImagePress(index)}
                />
            ))}
            <FullscreenViewer
                images={images}
                initialIndex={selectedIndex}
                visible={fullscreenVisible}
                onClose={handleClose}
            />
        </>
    );
};
