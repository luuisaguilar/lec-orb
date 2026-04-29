"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IhRegionPanel } from "@/components/ih-billing/ih-region-panel";

export default function IhBillingPage() {
    const [year, setYear] = useState(new Date().getFullYear().toString());

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Cuentas por Cobrar IH</h1>
                    <p className="text-sm text-muted-foreground">
                        Sesiones Cambridge aplicadas · Facturas a IH · Pagos recibidos
                    </p>
                </div>
                <select
                    value={year}
                    onChange={e => setYear(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                    {[2026, 2025, 2024, 2023].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            <Tabs defaultValue="sonora">
                <TabsList>
                    <TabsTrigger value="sonora">Sonora</TabsTrigger>
                    <TabsTrigger value="bc">Baja California</TabsTrigger>
                </TabsList>
                <TabsContent value="sonora" className="mt-4">
                    <IhRegionPanel region="SONORA" year={year} />
                </TabsContent>
                <TabsContent value="bc" className="mt-4">
                    <IhRegionPanel region="BAJA_CALIFORNIA" year={year} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
