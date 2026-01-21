import { useEffect } from "react";
import { router } from "expo-router";

export default function GeneralSettings() {
    useEffect(() => {
        router.replace("/settings" as any);
    });

    return null;
}
