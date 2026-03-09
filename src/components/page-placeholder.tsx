"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n, type DictionaryKey } from "@/lib/i18n";
import { Construction } from "lucide-react";

interface PagePlaceholderProps {
    titleKey: DictionaryKey;
}

export function PagePlaceholder({ titleKey }: PagePlaceholderProps) {
    const { t } = useI18n();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t(titleKey)}</h2>
            </div>
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-muted-foreground">
                        <Construction className="h-5 w-5" />
                        {t("common.comingSoon")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {t("common.comingSoonDesc")}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
