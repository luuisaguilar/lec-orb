"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { useTheme } from "next-themes";
import { I18nContext, type Locale } from "@/lib/i18n";

export type ThemeSetting = "light" | "dark" | "system";

interface UserSettings {
    locale: Locale;
    theme: ThemeSetting;
}

interface SettingsContextValue extends UserSettings {
    updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
    isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
    locale: "es-MX",
    theme: "system",
    updateSettings: async () => { },
    isLoading: true,
});

export function useSettings() {
    return useContext(SettingsContext);
}

const STORAGE_KEY = "lec-user-settings";

function getLocalSettings(): UserSettings {
    if (typeof window === "undefined") {
        return { locale: "es-MX", theme: "system" };
    }
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch {
        // ignore
    }
    return { locale: "es-MX", theme: "system" };
}

function saveLocalSettings(settings: UserSettings) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // ignore
    }
}

export function UserSettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<UserSettings>(() =>
        getLocalSettings()
    );
    const [isLoading, setIsLoading] = useState(true);
    const { setTheme } = useTheme();

    // Load settings from API on mount
    useEffect(() => {
        async function loadSettings() {
            try {
                const res = await fetch("/api/v1/settings");
                if (res.ok) {
                    const data = await res.json();
                    const loaded: UserSettings = {
                        locale: data.locale || "es-MX",
                        theme: data.theme || "system",
                    };
                    setSettings(loaded);
                    saveLocalSettings(loaded);
                }
            } catch {
                // Use local fallback — already set
            } finally {
                setIsLoading(false);
            }
        }
        loadSettings();
    }, [setTheme]);

    // Theme synchronization is now handled selectively within updateSettings

    const updateSettings = useCallback(
        async (updates: Partial<UserSettings>) => {
            const newSettings = { ...settings, ...updates };
            setSettings(newSettings);
            saveLocalSettings(newSettings);

            if (updates.theme) {
                setTheme(updates.theme);
            }

            // Persist to API (fire-and-forget with error handling)
            try {
                await fetch("/api/v1/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(newSettings),
                });
            } catch {
                // Already saved locally as fallback
            }
        },
        [settings, setTheme]
    );

    return (
        <SettingsContext.Provider
            value={{ ...settings, updateSettings, isLoading }}
        >
            <I18nContext.Provider value={settings.locale}>
                {children}
            </I18nContext.Provider>
        </SettingsContext.Provider>
    );
}
