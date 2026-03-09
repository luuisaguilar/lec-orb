"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Play, Download, Edit, Plus, Send, Trash2, GripVertical, CheckCircle2 } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AddEventSessionDialog } from "@/components/events/add-session-dialog";
import { isCertifiedForExam, getCityZone, getComponentsForExam } from "@/lib/exam-utils";
import { CalculatorPanel } from "@/components/events/calculator-panel";


export default function SessionPlannerPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;
    const sessionId = params.sessionId as string;

    const [event, setEvent] = useState<any>(null);
    const [session, setSession] = useState<any>(null);
    const [slots, setSlots] = useState<any[]>([]);
    const [originalSlots, setOriginalSlots] = useState<any[]>([]);
    const [allApplicators, setAllApplicators] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deletedSlotIds, setDeletedSlotIds] = useState<string[]>([]);

    // New UI states
    const [view, setView] = useState<'list' | 'allocation'>('list');
    const [applicatorFilter, setApplicatorFilter] = useState<'all' | 'presencial' | 'remoto'>('all');
    const [hasUnsavedQuickAssign, setHasUnsavedQuickAssign] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Re-using the event fetcher which includes sessions and slots, we just filter it.
            const response = await fetch(`/api/v1/events/${eventId}`);
            if (response.ok) {
                const data = await response.json();
                setEvent(data.event);

                const currentSession = data.event.sessions?.find((s: any) => s.id === sessionId);
                if (currentSession) {
                    setSession(currentSession);
                    // Filter slots for this specific session
                    const sessionSlots = (data.event.slots || []).filter((s: any) => s.session_id === sessionId);
                    setSlots(sessionSlots);
                    setOriginalSlots(JSON.parse(JSON.stringify(sessionSlots)));
                    setHasUnsavedQuickAssign(false); // clear unsaved flag on fresh data
                } else {
                    toast.error("Sesión no encontrada en este evento.");
                }
            }
        } catch (error) {
            console.error("Error fetching planner data:", error);
            toast.error("Error al cargar la sesión");
        } finally {
            setIsLoading(false);
        }
    }, [eventId, sessionId]);

    useEffect(() => {
        fetchData();
        fetch("/api/v1/applicators").then(res => res.json()).then(data => {
            setAllApplicators(data.applicators || []);
        });
    }, [fetchData]);

    const handleSlotApplicatorChange = (slotId: string, applicatorId: string) => {
        setSlots(slots.map(slot => {
            if (slot.id === slotId) {
                return { ...slot, applicator_id: applicatorId, status: applicatorId !== "none" ? "CONFIRMED" : "PENDING" };
            }
            return slot;
        }));
    };

    const handleTimeChange = (slotId: string, field: 'start_time' | 'end_time', value: string) => {
        setSlots(slots.map(slot => {
            if (slot.id === slotId) {
                return { ...slot, [field]: value };
            }
            return slot;
        }));
    };

    const handleAddBreak = () => {
        const newBreak = {
            id: `temp-${Date.now()}`, // Temporary ID for UI tracking
            session_id: sessionId,
            event_id: eventId,
            is_break: true,
            start_time: slots.length > 0 ? slots[slots.length - 1].end_time : "09:00",
            end_time: "00:00", // Will be set manually by user
            component: "RECESO",
            candidates: [],
            slot_number: slots.length + 1,
            is_new: true
        };
        setSlots([...slots, newBreak]);
    };



    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSlots((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                const reordered = arrayMove(items, oldIndex, newIndex);
                return reordered.map((s, i) => ({ ...s, slot_number: i + 1 }));
            });
        }
    };

    const handleDeleteSlot = (id: string, is_new?: boolean) => {
        setSlots(slots.filter(s => s.id !== id));
        if (!is_new) {
            setDeletedSlotIds(prev => [...prev, id]);
        }
    };

    const handlePublishEvent = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/v1/events/${eventId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: 'PUBLISHED' })
            });

            if (response.ok) {
                toast.success("Evento publicado exitosamente");
                setEvent({ ...event, status: 'PUBLISHED' });
            } else {
                toast.error("Error al publicar el evento");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión al publicar");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSchedule = async () => {
        setIsSaving(true);
        try {
            const updates = slots
                .filter(slot => !slot.is_new && (
                    slot.applicator_id !== originalSlots.find(o => o.id === slot.id)?.applicator_id ||
                    slot.status !== originalSlots.find(o => o.id === slot.id)?.status ||
                    slot.start_time !== originalSlots.find(o => o.id === slot.id)?.start_time ||
                    slot.end_time !== originalSlots.find(o => o.id === slot.id)?.end_time ||
                    slot.slot_number !== originalSlots.find(o => o.id === slot.id)?.slot_number
                ))
                .map(s => ({
                    id: s.id,
                    applicator_id: s.applicator_id === "none" ? null : s.applicator_id,
                    status: s.status,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    slot_number: s.slot_number
                }));

            const inserts = slots
                .filter(slot => slot.is_new)
                .map(s => ({
                    session_id: s.session_id,
                    component: s.component,
                    date: session.date,
                    slot_number: s.slot_number,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    is_break: s.is_break,
                    candidates: []
                }));

            if (updates.length === 0 && inserts.length === 0) {
                setIsSaving(false);
                toast.info("No hay cambios para guardar.");
                return;
            }

            const payload = {
                ...(updates.length > 0 && { updates }),
                ...(inserts.length > 0 && { inserts }),
                ...(deletedSlotIds.length > 0 && { deletes: deletedSlotIds })
            };

            const response = await fetch(`/api/v1/events/${eventId}/slots`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setDeletedSlotIds([]); // clear local deletes
                setHasUnsavedQuickAssign(false); // clear unsaved flag
                fetchData();
                toast.success("Horario guardado exitosamente");
            } else {
                toast.error("Error al guardar el horario en la base de datos");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRecalculate = async () => {
        setIsRecalculating(true);
        try {
            const response = await fetch(`/api/v1/events/${eventId}/sessions/${sessionId}/recalculate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}) // API will use session parameters
            });

            if (response.ok) {
                toast.success("Horario recalculado exitosamente");
                fetchData();
            } else {
                const err = await response.json();
                toast.error(err.error || "Error al recalcular el horario");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión al recalcular");
        } finally {
            setIsRecalculating(false);
        }
    };

    const handleDownloadCSV = () => {
        if (!slots || slots.length === 0) {
            toast.info("No hay horario para descargar");
            return;
        }

        const headers = ["Slot", "Tipo", "Horario", "Candidatos", "Aplicador", "Estado"];

        const rows = slots.map(slot => {
            if (slot.is_break) {
                return [slot.slot_number, "RECESO", `${slot.start_time} - ${slot.end_time}`, "-", "-", "-"];
            }

            let applicatorName = "Sin Asignar";
            if (slot.applicator_id) {
                const assignedStaff = event.staff?.find((s: any) => s.applicator.id === slot.applicator_id);
                if (assignedStaff) {
                    applicatorName = assignedStaff.applicator.name;
                }
            }
            const candidates = slot.candidates.join(", ");

            return [
                slot.slot_number,
                slot.component || "SPEAKING",
                `${slot.start_time} - ${slot.end_time}`,
                `"${candidates}"`,
                `"${applicatorName}"`,
                slot.status
            ];
        });

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Horario_Sesion_${session.exam_type}_${session.date}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleQuickAssign = () => {
        if (!sessionStaff || sessionStaff.length === 0) {
            toast.error("No hay personal pre-asignado a esta sesión. Agrégalos en 'Parámetros' primero.");
            return;
        }

        // Helper: get the real applicator UUID from a staff record
        const getApplicatorId = (s: any): string | null =>
            s.applicator_id ?? s.applicator?.id ?? null;

        const evaluators = sessionStaff.filter((s: any) => s.role?.toUpperCase() === 'EVALUATOR');
        const invigilators = sessionStaff.filter((s: any) => s.role?.toUpperCase() === 'INVIGILATOR');
        const others = sessionStaff.filter((s: any) => !['EVALUATOR', 'INVIGILATOR'].includes(s.role?.toUpperCase()));

        let assignedCount = 0;

        setSlots((prev: any[]) => {
            const newSlots = [...prev];
            const poolIndices: Record<string, number> = { evals: 0, others: 0 };

            newSlots.forEach((slot, idx) => {
                if (slot.is_break) return;

                const comp = (slot.component || 'speaking').toLowerCase();
                let pool: any[] = [];

                if (comp.includes('speaking')) {
                    pool = evaluators.length > 0 ? evaluators : sessionStaff;
                    const assigned = pool[poolIndices.evals % pool.length];
                    const appId = getApplicatorId(assigned);
                    if (appId) {
                        newSlots[idx] = { ...slot, applicator_id: appId, status: 'CONFIRMED' };
                        assignedCount++;
                    }
                    poolIndices.evals++;
                } else {
                    pool = (invigilators.length > 0 || others.length > 0) ? [...invigilators, ...others] : sessionStaff;
                    const assigned = pool[poolIndices.others % pool.length];
                    const appId = getApplicatorId(assigned);
                    if (appId) {
                        newSlots[idx] = { ...slot, applicator_id: appId, status: 'CONFIRMED' };
                        assignedCount++;
                    }
                    poolIndices.others++;
                }
            });

            return newSlots;
        });

        if (assignedCount > 0) {
            setHasUnsavedQuickAssign(true);
            toast.success(`${assignedCount} turno(s) asignados automáticamente. Recuerda guardar los cambios.`);
        } else {
            toast.warning("No se pudo asignar ningún turno. Verifica que el personal tenga IDs válidos.");
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando planner detallado...</div>;
    }

    if (!session || !event) {
        return <div className="p-8 text-center text-destructive">Sesión no encontrada.</div>;
    }

    // Staff pre-assigned to this session during event creation
    const certifiedApplicators = allApplicators.filter((a: any) => isCertifiedForExam(a, session.exam_type));
    const sessionStaff = (event.staff || []).filter((s: any) => s.session_id === sessionId);
    // Zone-based grouping
    const schoolZone = getCityZone(event.school?.city);
    // Resolve applicator IDs safely (API may return them directly or via nested object)
    const assignedIds = sessionStaff.map((s: any) => s.applicator_id ?? s.applicator?.id).filter(Boolean);
    const presencialApplicators = (schoolZone && assignedIds.length > 0)
        ? certifiedApplicators.filter(a => a.location_zone === schoolZone && assignedIds.includes(a.id))
        : [];
    const remotoApplicators = (assignedIds.length > 0)
        ? certifiedApplicators.filter(a => (schoolZone ? a.location_zone !== schoolZone : true) && assignedIds.includes(a.id))
        : [];

    // Build enriched session object for the edit dialog — includes pre-loaded staff
    const sessionWithStaff = {
        ...session,
        staff: sessionStaff.map((s: any) => ({ applicator_id: s.applicator_id ?? s.applicator?.id, role: s.role }))
    };

    // Timetable date-split
    const hasDifferentSpeakingDate = session.speaking_date && session.speaking_date !== session.date;
    const speakingComponents = ['speaking', 'SPEAKING'];
    const writtenDateSlots = hasDifferentSpeakingDate
        ? slots.filter((s: any) => !speakingComponents.includes(s.component) || s.is_break)
        : slots;
    const speakingDateSlots = hasDifferentSpeakingDate
        ? slots.filter((s: any) => speakingComponents.includes(s.component) && !s.is_break)
        : [];

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => router.push(`/dashboard/eventos/planner/${eventId}`)} className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium text-muted-foreground">Volver a Resumen de Sesiones</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        Planner Detallado
                        <Badge variant="outline" className="text-lg bg-primary/10 text-primary uppercase">{session.exam_type}</Badge>
                    </h2>
                </div>

                <div className="flex gap-2">
                    {event.status !== 'PUBLISHED' && (
                        <Button
                            variant="secondary"
                            className="gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                            onClick={handlePublishEvent}
                            disabled={isSaving}
                        >
                            <Send className="h-4 w-4" />
                            Publicar Evento
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleDownloadCSV} className="gap-2">
                        <Download className="h-4 w-4" /> Exportar CSV
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleQuickAssign}
                        className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900"
                    >
                        <Play className="h-4 w-4" /> Asignación Rápida
                    </Button>
                    <Button variant="default" onClick={handleSaveSchedule} disabled={isSaving} className="gap-2">
                        <Save className="h-4 w-4" /> {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            </div>

            {/* Unsaved Quick-Assign Banner */}
            {hasUnsavedQuickAssign && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span className="font-medium">Tienes asignaciones pendientes de guardar.</span>
                    <span className="text-amber-700 dark:text-amber-400">Haz clic en <strong>Guardar Cambios</strong> para persistir la asignación rápida.</span>
                    <Button
                        size="sm"
                        onClick={handleSaveSchedule}
                        disabled={isSaving}
                        className="ml-auto gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                    >
                        <Save className="h-3.5 w-3.5" />
                        {isSaving ? "Guardando..." : "Guardar ahora"}
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-6 items-start">

                {/* Control Panel Sidebar */}
                <div className="space-y-6 sticky top-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-lg">Parámetros</CardTitle>
                                <CardDescription>Generación de horarios.</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(true)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b pb-1">
                                    <span className="text-muted-foreground">Examen escrito:</span>
                                    <span className="font-medium">{session.date ? new Date(session.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}</span>
                                </div>
                                {session.speaking_date && session.speaking_date !== session.date && (
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-muted-foreground">Fecha Oral (Speaking):</span>
                                        <span className="font-medium text-emerald-600">{new Date(session.speaking_date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-b pb-1">
                                    <span className="text-muted-foreground">Alumnos:</span>
                                    <span className="font-medium">{session.parameters?.candidates_count}</span>
                                </div>
                                <div className="flex justify-between border-b pb-1">
                                    <span className="text-muted-foreground">Evaluadores:</span>
                                    <span className="font-medium">{session.parameters?.examiners}</span>
                                </div>
                                <div className="flex justify-between border-b pb-1">
                                    <span className="text-muted-foreground">Receso:</span>
                                    <span className="font-medium">{session.parameters?.break_duration} min</span>
                                </div>
                                {event.school?.operating_hours?.open && (
                                    <div className="flex justify-between border-b pb-1 text-amber-600 dark:text-amber-400">
                                        <span>Horario sede:</span>
                                        <span className="font-medium">{event.school.operating_hours.open} — {event.school.operating_hours.close}</span>
                                    </div>
                                )}
                            </div>

                            <Button
                                className="w-full gap-2 mt-4"
                                onClick={handleRecalculate}
                                disabled={isRecalculating}
                            >
                                <Play className="h-4 w-4" />
                                {slots.length > 0 ? "Regenerar Horarios" : "Generar Horarios"}
                            </Button>
                        </CardContent>

                        {/* 🧮 Calculator Panel */}
                        <CalculatorPanel
                            initialExamType={session.exam_type}
                            initialCandidates={session.parameters?.candidates_count || 0}
                            initialExaminers={session.parameters?.examiners || 1}
                            initialStartTime={session.parameters?.start_time || '09:00'}
                        />
                    </Card>
                </div>

                {/* Main Content Area */}
                <Card className="overflow-hidden">
                    <CardHeader className="pb-0 bg-muted/20 border-b">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
                            <div>
                                <CardTitle className="text-xl">Editor de Turnos</CardTitle>
                                <CardDescription className="mt-1">
                                    Asigna tu personal y ajusta los tiempos.
                                </CardDescription>
                            </div>

                            <div className="flex items-center gap-2 bg-muted p-1 rounded-md">
                                <button
                                    onClick={() => setView('list')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${view === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Lista (Drag & Drop)
                                </button>
                                <button
                                    onClick={() => setView('allocation')}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${view === 'allocation' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    Asignación (Por Salón)
                                </button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {slots.length === 0 ? (
                            <div className="text-center py-12 m-6 text-muted-foreground border-2 border-dashed rounded-lg">
                                No se ha generado el horario para esta sesión.
                            </div>
                        ) : view === 'list' ? (
                            <div className="p-6">
                                <div className="flex justify-end mb-4">
                                    <Button variant="outline" size="sm" onClick={handleAddBreak} className="gap-2">
                                        <Plus className="h-4 w-4" /> Agregar Receso
                                    </Button>
                                </div>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <div className="overflow-x-auto rounded-lg border">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                                <tr>
                                                    <th className="px-4 py-3 rounded-tl-md">Nro / Order</th>
                                                    <th className="px-4 py-3">Componente</th>
                                                    <th className="px-4 py-3">Horario</th>
                                                    <th className="px-4 py-3">Candidatos</th>
                                                    <th className="px-4 py-3">Aplicador Asignado</th>
                                                    <th className="px-4 py-3 rounded-tr-md">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {/* Written date section header */}
                                                {hasDifferentSpeakingDate && (
                                                    <tr className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-sm font-bold">
                                                        <td colSpan={6} className="px-4 py-2">
                                                            📝 Examen Escrito — {new Date(session.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </td>
                                                    </tr>
                                                )}
                                                <SortableContext items={writtenDateSlots.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                                                    {writtenDateSlots.map((slot: any) => (
                                                        <SortableSlotRow
                                                            key={slot.id}
                                                            slot={slot}
                                                            certifiedApplicators={certifiedApplicators}
                                                            sessionStaff={sessionStaff}
                                                            schoolZone={schoolZone}
                                                            presencialApplicators={presencialApplicators}
                                                            remotoApplicators={remotoApplicators}
                                                            handleTimeChange={handleTimeChange}
                                                            handleSlotApplicatorChange={handleSlotApplicatorChange}
                                                            handleDeleteSlot={handleDeleteSlot}
                                                        />
                                                    ))}
                                                </SortableContext>

                                                {/* Speaking date section (only when different date) */}
                                                {hasDifferentSpeakingDate && speakingDateSlots.length > 0 && (
                                                    <>
                                                        <tr className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                                                            <td colSpan={6} className="px-4 py-2">
                                                                🎤 Evaluación Oral (Speaking) — {new Date(session.speaking_date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                            </td>
                                                        </tr>
                                                        <SortableContext items={speakingDateSlots.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                                                            {speakingDateSlots.map((slot: any) => (
                                                                <SortableSlotRow
                                                                    key={slot.id}
                                                                    slot={slot}
                                                                    certifiedApplicators={certifiedApplicators}
                                                                    sessionStaff={sessionStaff}
                                                                    schoolZone={schoolZone}
                                                                    presencialApplicators={presencialApplicators}
                                                                    remotoApplicators={remotoApplicators}
                                                                    handleTimeChange={handleTimeChange}
                                                                    handleSlotApplicatorChange={handleSlotApplicatorChange}
                                                                    handleDeleteSlot={handleDeleteSlot}
                                                                />
                                                            ))}
                                                        </SortableContext>
                                                    </>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </DndContext>
                            </div>
                        ) : (
                            <AllocationView
                                session={session}
                                slots={slots}
                                setSlots={setSlots}
                                applicatorFilter={applicatorFilter}
                                setApplicatorFilter={setApplicatorFilter}
                                schoolZone={schoolZone}
                                certifiedApplicators={certifiedApplicators}
                                presencialApplicators={presencialApplicators}
                                remotoApplicators={remotoApplicators}
                                sessionStaff={sessionStaff}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            {isEditDialogOpen && session && (
                <AddEventSessionDialog
                    eventId={eventId}
                    initialData={sessionWithStaff}
                    schoolHours={event?.school?.operating_hours}
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onSessionAdded={() => {
                        fetchData();
                        toast.info("Parámetros actualizados. No olvides Recalcular Horarios si cambiaste horas o componentes.");
                    }}
                />
            )}
        </div>
    );
}

function SortableSlotRow({
    slot,
    certifiedApplicators,
    sessionStaff,
    schoolZone,
    presencialApplicators,
    remotoApplicators,
    handleTimeChange,
    handleSlotApplicatorChange,
    handleDeleteSlot
}: {
    slot: any,
    certifiedApplicators: any[],
    sessionStaff: any[],
    schoolZone: string | null,
    presencialApplicators: any[],
    remotoApplicators: any[],
    handleTimeChange: (id: string, field: 'start_time' | 'end_time', val: string) => void,
    handleSlotApplicatorChange: (id: string, val: string) => void,
    handleDeleteSlot: (id: string, is_new?: boolean) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        ...(isDragging ? {
            position: 'relative',
            zIndex: 50,
            opacity: 0.8,
            boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
        } : {})
    } as React.CSSProperties;

    // The break row
    if (slot.is_break) {
        return (
            <tr ref={setNodeRef} style={style} className={`bg-amber-50 dark:bg-amber-950/20 ${isDragging ? 'border border-primary' : ''}`}>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <button {...attributes} {...listeners} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1">
                            <GripVertical className="h-4 w-4" />
                        </button>
                        <span className="text-muted-foreground w-6 h-6 flex items-center justify-center bg-muted/60 rounded-full text-xs font-medium border border-border/50">
                            {slot.slot_number}
                        </span>
                    </div>
                </td>
                <td className="px-4 py-3 font-medium text-amber-700 dark:text-amber-400">
                    Break / Receso
                </td>
                <td className="px-4 py-3 text-amber-700 dark:text-amber-400 font-mono">
                    <div className="flex items-center gap-2">
                        <input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) => handleTimeChange(slot.id, 'start_time', e.target.value)}
                            className="bg-transparent border border-amber-200 dark:border-amber-800 rounded px-1 min-w-0 w-24 h-7 focus:ring-1 focus:ring-amber-500 outline-none"
                        />
                        <span>-</span>
                        <input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) => handleTimeChange(slot.id, 'end_time', e.target.value)}
                            className="bg-transparent border border-amber-200 dark:border-amber-800 rounded px-1 min-w-0 w-24 h-7 focus:ring-1 focus:ring-amber-500 outline-none"
                        />
                    </div>
                </td>
                <td colSpan={2} className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSlot(slot.id, slot.is_new)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </td>
            </tr>
        );
    }

    // Normal slot row
    return (
        <tr ref={setNodeRef} style={style} className={`hover:bg-muted/30 transition-colors bg-background ${isDragging ? 'border border-primary' : ''}`}>
            <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-2">
                    <button {...attributes} {...listeners} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1">
                        <GripVertical className="h-4 w-4" />
                    </button>
                    <span className="text-muted-foreground w-6 h-6 flex items-center justify-center bg-muted/60 rounded-full text-xs font-medium border border-border/50">
                        {slot.slot_number}
                    </span>
                </div>
            </td>
            <td className="px-4 py-3 font-medium">
                <Badge variant="outline" className="uppercase text-[10px] tracking-widest">{slot.component || 'SPEAKING'}</Badge>
            </td>
            <td className="px-4 py-3 font-mono whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => handleTimeChange(slot.id, 'start_time', e.target.value)}
                        className="bg-transparent border border-input rounded px-1 min-w-0 w-24 h-7 focus:ring-1 focus:ring-primary outline-none"
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => handleTimeChange(slot.id, 'end_time', e.target.value)}
                        className="bg-transparent border border-input rounded px-1 min-w-0 w-24 h-7 focus:ring-1 focus:ring-primary outline-none"
                    />
                </div>
            </td>
            <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                    {slot.candidates.map((c: string) => (
                        <span key={c} className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                </div>
            </td>
            <td className="px-4 py-3 min-w-[200px]">
                <Select
                    value={slot.applicator_id || "none"}
                    onValueChange={(val) => handleSlotApplicatorChange(slot.id, val)}
                >
                    <SelectTrigger className="h-8">
                        <SelectValue placeholder="Sin Asignar" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none" className="text-muted-foreground italic">Sin Asignar</SelectItem>
                        {/* Session pre-assigned staff */}
                        {sessionStaff.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="bg-primary/10 text-primary">
                                    Personal de esta Sesión
                                </SelectLabel>
                                {sessionStaff.map((s: any) => (
                                    <SelectItem key={s.applicator?.id || s.applicator_id} value={s.applicator?.id || s.applicator_id}>
                                        {s.applicator?.name || s.applicator_id}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                        {sessionStaff.length > 0 && (presencialApplicators.length > 0 || remotoApplicators.length > 0) && <SelectSeparator />}
                        {/* Presencial group */}
                        {presencialApplicators.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                    📍 Presencial — {schoolZone}
                                </SelectLabel>
                                {presencialApplicators.map(app => (
                                    <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                        {/* Remoto group */}
                        {remotoApplicators.length > 0 && (
                            <>
                                {presencialApplicators.length > 0 && <SelectSeparator />}
                                <SelectGroup>
                                    <SelectLabel className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                        🖥️ Remoto
                                    </SelectLabel>
                                    {remotoApplicators.map(app => (
                                        <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                                    ))}
                                </SelectGroup>
                            </>
                        )}
                        {certifiedApplicators.length === 0 && (
                            <div className="p-2 text-sm text-center text-muted-foreground">No hay aplicadores autorizados para este nivel</div>
                        )}
                    </SelectContent>
                </Select>
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    {slot.status === 'CONFIRMED' ? (
                        <div className="flex items-center text-emerald-600 dark:text-emerald-400 gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Confirmado
                        </div>
                    ) : (
                        <div className="flex items-center text-muted-foreground gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-amber-500" /> Pendiente
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
}

// ── Cambridge-style Allocation View ──────────────────────────────────────────

function AllocationView({
    session, slots, setSlots,
    applicatorFilter, setApplicatorFilter,
    schoolZone, certifiedApplicators, presencialApplicators, remotoApplicators,
    sessionStaff
}: any) {

    // Calculate components summary
    const components = getComponentsForExam(session.exam_type);
    const summary = components.map(comp => {
        const compSlots = slots.filter((s: any) => s.component?.toLowerCase() === comp.id.toLowerCase() && !s.is_break);
        const allocated = compSlots.filter((s: any) => s.applicator_id && s.applicator_id !== 'none').length;
        const total = compSlots.length;
        return {
            id: comp.id,
            name: comp.name,
            total,
            allocated,
            unallocated: total - allocated
        };
    }).filter(s => s.total > 0);

    const filteredApplicators = applicatorFilter === 'all' ? certifiedApplicators
        : applicatorFilter === 'presencial' ? presencialApplicators
            : remotoApplicators;

    // Distribute slots to rooms deterministically (Pending classroom_id mapping in slots)

    const handleGlobalAssign = (componentId: string, applicatorId: string) => {
        setSlots((prev: any[]) => prev.map(slot => {
            if (slot.component?.toLowerCase() === componentId.toLowerCase() && !slot.is_break) {
                return { ...slot, applicator_id: applicatorId, status: applicatorId !== "none" ? "CONFIRMED" : "PENDING" };
            }
            return slot;
        }));
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/20">
            {/* Header controls */}
            <div className="flex items-center justify-between p-4 border-b bg-background">
                <div className="flex gap-2 bg-muted p-1 rounded-md text-sm">
                    <button onClick={() => setApplicatorFilter('all')} className={cn("px-3 py-1 rounded-sm transition-colors", applicatorFilter === 'all' && "bg-background shadow-sm font-medium")}>Todos</button>
                    <button onClick={() => setApplicatorFilter('presencial')} className={cn("px-3 py-1 rounded-sm transition-colors", applicatorFilter === 'presencial' && "bg-background shadow-sm font-medium tracking-tight text-emerald-600 dark:text-emerald-400")}>📍 Presencial</button>
                    <button onClick={() => setApplicatorFilter('remoto')} className={cn("px-3 py-1 rounded-sm transition-colors", applicatorFilter === 'remoto' && "bg-background shadow-sm font-medium text-blue-600 dark:text-blue-400")}>🖥️ Remoto</button>
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* Allocation Summary Table */}
                <div className="rounded-md border bg-background overflow-hidden shadow-sm">
                    <div className="bg-slate-100 dark:bg-slate-900 border-b px-4 py-2">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Summary of current allocation</h3>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#5c5c5c] text-white">
                            <tr>
                                <th className="px-4 py-2 font-medium w-8"></th>
                                <th className="px-4 py-2 font-medium">Component</th>
                                <th className="px-4 py-2 font-medium text-center">Unallocated</th>
                                <th className="px-4 py-2 font-medium text-center">Allocated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {summary.map((comp) => (
                                <tr key={comp.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-2 text-center text-muted-foreground">▸</td>
                                    <td className="px-4 py-2">{comp.name}</td>
                                    <td className="px-4 py-2 text-center">{comp.unallocated}</td>
                                    <td className="px-4 py-2 text-center">{comp.allocated}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Assignment Panels by Component */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold px-1">Asignar Aplicadores Registrados</h3>

                    {summary.map((comp) => {
                        // Find common currently assigned applicator for this component
                        const compSlots = slots.filter((s: any) => s.component?.toLowerCase() === comp.id.toLowerCase() && !s.is_break);
                        const firstAppId = compSlots.length > 0 ? compSlots[0].applicator_id : "none";
                        const allSame = compSlots.every((s: any) => s.applicator_id === firstAppId);
                        const displayVal = allSame ? (firstAppId || "none") : "mixed";

                        return (
                            <div key={comp.id} className="rounded-md border bg-background overflow-hidden shadow-sm flex flex-col lg:flex-row">
                                <div className="bg-slate-100 dark:bg-slate-900 p-4 lg:w-1/3 border-b lg:border-b-0 lg:border-r flex flex-col justify-center">
                                    <h4 className="font-bold flex items-center justify-between">
                                        {comp.name}
                                        <Badge variant={comp.unallocated === 0 ? "default" : "secondary"} className={comp.unallocated === 0 ? "bg-emerald-500" : ""}>
                                            {comp.allocated}/{comp.total}
                                        </Badge>
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1">{compSlots.length} turnos programados</p>
                                </div>
                                <div className="p-4 lg:w-2/3 flex items-center gap-4">
                                    <div className="flex-1 max-w-md">
                                        <Label className="text-xs mb-1.5 block text-muted-foreground">Asignación global (All Venues)</Label>
                                        <Select
                                            value={displayVal === "mixed" ? "" : displayVal}
                                            onValueChange={(val) => handleGlobalAssign(comp.id, val)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder={displayVal === "mixed" ? "Múltiples aplicadores asignados..." : "Selecciona un aplicador..."} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none" className="text-muted-foreground italic">Desasignar todos (Sin Asignar)</SelectItem>
                                                <SelectSeparator />

                                                {/* Session pre-assigned staff group (Crucial fix: show what user chose originally) */}
                                                {sessionStaff.length > 0 && (
                                                    <SelectGroup>
                                                        <SelectLabel className="bg-primary/10 text-primary text-xs">Personal de esta Sesión</SelectLabel>
                                                        {sessionStaff.map((s: any) => (
                                                            <SelectItem key={s.applicator?.id || s.applicator_id} value={s.applicator?.id || s.applicator_id}>
                                                                {s.applicator?.name || s.applicator_id}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                )}
                                                {sessionStaff.length > 0 && <SelectSeparator />}

                                                {/* Filtered applicators list */}
                                                {applicatorFilter !== 'remoto' && presencialApplicators.length > 0 && (
                                                    <SelectGroup>
                                                        <SelectLabel className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs">📍 Presencial — {schoolZone}</SelectLabel>
                                                        {presencialApplicators.map((app: any) => (
                                                            <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                )}

                                                {applicatorFilter !== 'presencial' && remotoApplicators.length > 0 && (
                                                    <>
                                                        {applicatorFilter !== 'remoto' && presencialApplicators.length > 0 && <SelectSeparator />}
                                                        <SelectGroup>
                                                            <SelectLabel className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs">🖥️ Remoto</SelectLabel>
                                                            {remotoApplicators.map((app: any) => (
                                                                <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    </>
                                                )}

                                                {filteredApplicators.length === 0 && (
                                                    <div className="p-2 text-xs text-center text-muted-foreground">No hay aplicadores disponibles en este filtro</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {displayVal === "mixed" && (
                                            <p className="text-[10px] text-amber-600 mt-1">⚠️ Seleccionar un aplicador aquí sobreescribirá las asignaciones individuales de la vista de Lista.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {summary.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">No hay turnos válidos generados para asignar.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
