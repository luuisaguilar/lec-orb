import Link from "next/link";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function IeltsPlaceholderPage() {
    return (
        <div className="space-y-6 p-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
                <Languages className="h-10 w-10 text-muted-foreground" />
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">IELTS</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Módulo en preparación dentro de Coordinación de exámenes.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Próximamente</CardTitle>
                    <CardDescription>
                        Aquí podrás gestionar sesiones, resultados y logística IELTS cuando el equipo lo active.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/eventos">Ir a eventos</Link>
                    </Button>
                    <Button variant="ghost" asChild>
                        <Link href="/dashboard">Volver al inicio</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
