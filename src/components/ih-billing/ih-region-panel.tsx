"use client";

import useSWR from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IhSummaryCards } from "./ih-summary-cards";
import { IhAlertsCard } from "./ih-alerts-card";
import { IhSessionsTable } from "./ih-sessions-table";
import { IhInvoicesTable } from "./ih-invoices-table";
import { IhPaymentsTable } from "./ih-payments-table";

const fetcher = (url: string) => fetch(url).then(r => r.json());

type RegionKey = "SONORA" | "BAJA_CALIFORNIA";

interface Props {
    region: RegionKey;
    year: string;
}

export function IhRegionPanel({ region, year }: Props) {
    const { data: summary, isLoading: loadingSummary, mutate: mutateSummary } = useSWR(
        `/api/v1/finance/ih/summary?year=${year}`,
        fetcher
    );

    const regionData = summary?.byRegion?.[region];

    return (
        <div className="flex flex-col gap-6">
            <IhSummaryCards data={regionData} loading={loadingSummary} />

            {regionData?.alerts?.length > 0 && (
                <IhAlertsCard alerts={regionData.alerts} />
            )}

            <Tabs defaultValue="sessions">
                <TabsList>
                    <TabsTrigger value="sessions">Sesiones</TabsTrigger>
                    <TabsTrigger value="invoices">Facturas</TabsTrigger>
                    <TabsTrigger value="payments">Pagos IH</TabsTrigger>
                </TabsList>
                <TabsContent value="sessions" className="mt-4">
                    <IhSessionsTable region={region} year={year} onMutate={mutateSummary} />
                </TabsContent>
                <TabsContent value="invoices" className="mt-4">
                    <IhInvoicesTable region={region} onMutate={mutateSummary} />
                </TabsContent>
                <TabsContent value="payments" className="mt-4">
                    <IhPaymentsTable region={region} onMutate={mutateSummary} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
