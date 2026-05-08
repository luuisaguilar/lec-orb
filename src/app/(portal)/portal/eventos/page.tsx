import { portalApiGet } from "@/lib/portal/server-fetch";
import { PortalEventAssignments, type PortalEventAssignment } from "@/components/portal/portal-event-assignments";
import { Badge } from "@/components/ui/badge";

type EventAssignmentsResponse = {
    assignments: PortalEventAssignment[];
    pendingCount: number;
};

export default async function PortalEventosPage() {
    const res = await portalApiGet<EventAssignmentsResponse>("/api/v1/portal/event-assignments");

    if (!res.ok) {
        if (res.status === 401) {
            return (
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                    Debes iniciar sesión para ver tus asignaciones a eventos.
                </div>
            );
        }
        if (res.status === 403) {
            return (
                <div className="rounded-md border p-8 text-center text-muted-foreground">
                    Tu usuario no está vinculado a un aplicador.
                </div>
            );
        }
        return (
            <div className="rounded-md border p-8 text-center text-muted-foreground">
                No se pudieron cargar las asignaciones: {res.message}
            </div>
        );
    }

    const assignments = res.data.assignments ?? [];
    const pendingCount = res.data.pendingCount ?? 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mis eventos</h1>
                    <p className="text-muted-foreground">
                        Revisa tus asignaciones y confirma si podrás participar. El evento no se puede publicar desde
                        operaciones hasta que todas las confirmaciones estén completas.
                    </p>
                </div>
                {pendingCount > 0 && (
                    <Badge variant="outline" className="w-fit border-amber-500/50 text-amber-700 dark:text-amber-400">
                        {pendingCount} pendiente{pendingCount === 1 ? "" : "s"}
                    </Badge>
                )}
            </div>

            <PortalEventAssignments assignments={assignments} />
        </div>
    );
}
