"use client";

import { Settings, Globe, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettings, type ThemeSetting } from "@/lib/contexts/settings-context";
import { useI18n, type Locale } from "@/lib/i18n";

const themeIcons: Record<ThemeSetting, typeof Sun> = {
    light: Sun,
    dark: Moon,
    system: Monitor,
};

export function SettingsDropdown() {
    const { locale, theme, updateSettings } = useSettings();
    const { t } = useI18n();

    const languages: { value: Locale; label: string }[] = [
        { value: "es-MX", label: t("settings.languageEs") },
        { value: "en-US", label: t("settings.languageEn") },
    ];

    const themes: { value: ThemeSetting; label: string }[] = [
        { value: "light", label: t("settings.themeLight") },
        { value: "dark", label: t("settings.themeDark") },
        { value: "system", label: t("settings.themeSystem") },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg transition-all duration-200 hover:bg-primary/12 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary [&_svg]:transition-transform hover:[&_svg]:scale-110"
                >
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">{t("nav.settings")}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                {/* Language Section */}
                <DropdownMenuLabel className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {t("settings.language")}
                </DropdownMenuLabel>
                <div className="px-2 py-1.5 space-y-1">
                    {languages.map((lang) => (
                        <button
                            key={lang.value}
                            onClick={() => updateSettings({ locale: lang.value })}
                            className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors ${locale === lang.value
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-accent hover:text-accent-foreground"
                                }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>

                <DropdownMenuSeparator />

                {/* Theme Section */}
                <DropdownMenuLabel className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    {t("settings.theme")}
                </DropdownMenuLabel>
                <div className="px-2 py-1.5 space-y-1">
                    {themes.map((themeOption) => {
                        const Icon = themeIcons[themeOption.value];
                        return (
                            <button
                                key={themeOption.value}
                                onClick={() => updateSettings({ theme: themeOption.value })}
                                className={`w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${theme === themeOption.value
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-accent hover:text-accent-foreground"
                                    }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {themeOption.label}
                            </button>
                        );
                    })}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
