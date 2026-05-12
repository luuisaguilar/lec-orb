"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const statusLabel: Record<string, string> = {
    PENDING: "Pendiente",
    APPROVED: "Aprobada",
    REJECTED: "Rechazada",
};

export default function CotizacionDetallePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data, isLoading } = useSWR(id ? `/api/v1/quotes/${id}` : null, fetcher);
    const quote = data?.quote;

    const total =
        quote?.total != null
            ? Number(quote.total)
            : Number(quote?.subtotal ?? 0) + Number(quote?.taxes ?? 0);

    async function convertToPo() {
        try {
            const res = await fetch(`/api/v1/quotes/${id}/convert-to-po`, { method: "POST" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(body.error || "No se pudo generar la orden");
                return;
            }
            toast.success("Orden de compra generada");
            router.push("/dashboard/ordenes");
        } catch {
            toast.error("Error de red");
        }
    }

    if (isLoading || !quote) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const items = (quote.quote_items as Record<string, unknown>[]) ?? [];

    return (
        <div className="flex-1 space-y-6 p-4 pt-6 md:p-8 max-w-4xl mx-auto">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/dashboard/cotizaciones">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <FileText className="h-7 w-7 text-muted-foreground" />
                            {quote.folio}
                        </h2>
                        <p className="text-muted-foreground text-sm">
                            {quote.provider || "Sin proveedor"} ·{" "}
                            {quote.created_at
                                ? format(parseISO(quote.created_at as string), "d MMM yyyy", { locale: es })
                                : ""}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge variant="secondary">{statusLabel[String(quote.status)] ?? quote.status}</Badge>
                    {quote.status === "APPROVED" && (
                        <Button type="button" onClick={convertToPo}>
                            Generar orden de compra
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Resumen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>
                        <span className="text-muted-foreground">Descripción: </span>
                        {(quote.description as string) || "—"}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                        <div>
                            <p className="text-muted-foreground text-xs">Subtotal</p>
                            <p className="font-semibold">${Number(quote.subtotal ?? 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Impuestos</p>
                            <p className="font-semibold">${Number(quote.taxes ?? 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Total</p>
                            <p className="font-semibold text-lg">${total.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">Moneda</p>
                            <p className="font-semibold">{(quote.currency as string) || "MXN"}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Partidas</CardTitle>
                </CardHeader>
                <CardContent>
                    {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin partidas registradas.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className="text-right">Cant.</TableHead>
                                    <TableHead className="text-right">P. unit.</TableHead>
                                    <TableHead className="text-right">IVA</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((row, idx) => {
                                    const q = Number(row.quantity ?? 0);
                                    const p = Number(row.unit_price ?? 0);
                                    const rate = Number(row.tax_rate ?? 0.16);
                                    const sub = Math.round(q * p * 100) / 100;
                                    return (
                                        <TableRow key={String(row.id ?? idx)}>
                                            <TableCell>{idx + 1}</TableCell>
                                            <TableCell className="font-medium">{String(row.description)}</TableCell>
                                            <TableCell className="text-right">{q}</TableCell>
                                            <TableCell className="text-right">${p.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{(rate * 100).toFixed(0)}%</TableCell>
                                            <TableCell className="text-right">${sub.toLocaleString()}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
