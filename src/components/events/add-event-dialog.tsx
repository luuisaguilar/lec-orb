"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useI18n } from "@/lib/i18n";
import { Plus, Trash2, CalendarIcon, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isCertifiedForExam, EXAMS, getCityZone } from "@/lib/exam-utils";
import { CreateSchoolDialog } from "@/components/schools/create-school-dialog";


import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectLabel, SelectSeparator, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";


const ROLES = [
    { id: "EVALUATOR", name: "Speaking Evaluator" },
    { id: "INVIGILATOR", name: "Invigilator (Escrito)" },
    { id: "SUPERVISOR", name: "Supervisor" },
    { id: "ADMIN", name: "Admin (Center)" },
    { id: "REMOTE", name: "Remote Support" },
];

const createEventSchema = z.object({
    title: z.string().min(2, "El título es requerido"),
    school_id: z.string().min(1, "La sede es requerida"),
    sessions: z.array(z.object({
        exam_type: z.string().min(1, "Selecciona examen"),
        date: z.date(),
        speaking_date: z.date().optional().nullable(),
        parameters: z.object({
            start_time: z.string().min(1, "Hora requerida"),
            examiners: z.number().min(1, "Mínimo 1"),
            break_duration: z.number().min(0, "Mínimo 0")
        }),
        classrooms: z.array(z.object({
            name: z.string().min(1, "Nombre requerido"),
            capacity: z.number().min(1, "Mínimo 1")
        })).min(1, "Agrega al menos un salón"),
        staff: z.array(z.object({
            applicator_id: z.string().min(1, "Selecciona aplicador"),
            role: z.enum(['EVALUATOR', 'INVIGILATOR', 'SUPERVISOR', 'ADMIN', 'REMOTE'])
        }))
    })).min(1, "Agrega al menos una sesión")
});

type FormValues = z.infer<typeof createEventSchema>;

function SessionItem({
    form,
    index,
    removeSession,
    applicators,
    schoolZone,
    schoolId
}: {
    form: UseFormReturn<FormValues>;
    index: number;
    removeSession: (idx: number) => void;
    applicators: any[];
    schoolZone: string | null;
    schoolId: string | null;
}) {
    const [busyStaffIds, setBusyStaffIds] = useState<string[]>([]);
    const [, setIsFetchingAvailability] = useState(false);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [speakingPopoverOpen, setSpeakingPopoverOpen] = useState(false);
    const { fields: staffFields, append: appendStaff, remove: removeStaff } = useFieldArray({
        control: form.control,
        name: `sessions.${index}.staff`
    });

    const watchExamType = form.watch(`sessions.${index}.exam_type`);

    const certifiedApplicators = watchExamType
        ? applicators.filter(a => isCertifiedForExam(a, watchExamType))
        : applicators;

    // Split by zone: presencial = same zone as school, remoto = other zones
    const presencialApplicators = schoolZone
        ? certifiedApplicators.filter(a => a.location_zone === schoolZone)
        : [];
    const remotoApplicators = schoolZone
        ? certifiedApplicators.filter(a => a.location_zone !== schoolZone)
        : certifiedApplicators;

    const classrooms = form.watch(`sessions.${index}.classrooms`) || [];
    const totalCandidates = classrooms.reduce((sum: number, c: any) => sum + (Number(c.capacity) || 0), 0);
    const suggestedInvigilators = Math.ceil(totalCandidates / 25);

    const watchDate = form.watch(`sessions.${index}.date`);
    const watchSpeakingDate = form.watch(`sessions.${index}.speaking_date`);

    useEffect(() => {
        const fetchAvailability = async () => {
            if (!watchDate) return;
            setIsFetchingAvailability(true);
            try {
                const dates = [format(watchDate, "yyyy-MM-dd")];
                if (watchSpeakingDate) dates.push(format(watchSpeakingDate, "yyyy-MM-dd"));

                const results = await Promise.all(dates.map(d =>
                    fetch(`/api/v1/events/staff-availability?date=${d}`).then(res => res.json())
                ));

                const allBusy = results.reduce((acc, curr) => [...acc, ...(curr.busyStaffIds || [])], []);
                setBusyStaffIds(Array.from(new Set(allBusy)) as string[]);
            } catch (err) {
                console.error("Error checking availability:", err);
            } finally {
                setIsFetchingAvailability(false);
            }
        };

        fetchAvailability();
    }, [watchDate, watchSpeakingDate]);

    const isLocked = !schoolId || !watchExamType;

    return (
        <div className="p-4 bg-muted/20 border rounded-lg relative space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
                <h4 className="font-semibold text-primary">Sesión #{index + 1}</h4>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-8 px-2 bg-background hover:bg-destructive/10"
                    onClick={() => removeSession(index)}
                >
                    <Trash2 className="h-4 w-4 mr-1" /> Eliminar Sesión
                </Button>
            </div>

            <div className="flex gap-4 items-start">
                <FormField
                    control={form.control}
                    name={`sessions.${index}.exam_type`}
                    render={({ field: fProps }) => (
                        <FormItem className="flex-1">
                            <FormLabel className="text-xs font-semibold">Nivel (Examen)</FormLabel>
                            <Select onValueChange={fProps.onChange} defaultValue={fProps.value}>
                                <FormControl>
                                    <SelectTrigger className="h-9 w-full bg-background"><SelectValue placeholder="Selecciona Nivel" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {EXAMS.map(exam => (
                                        <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name={`sessions.${index}.date`}
                    render={({ field: fProps }) => (
                        <FormItem className="w-[180px] flex flex-col justify-end">
                            <FormLabel className="text-xs font-semibold">Fecha Escrito</FormLabel>
                            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" className={cn("h-9 pl-3 text-left font-normal bg-background", !fProps.value && "text-muted-foreground")}>
                                            {fProps.value ? format(fProps.value, "PP", { locale: es }) : <span>Seleccionar</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={fProps.value}
                                        onSelect={(val) => {
                                            fProps.onChange(val);
                                            if (val) setDatePopoverOpen(false);
                                        }}
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name={`sessions.${index}.speaking_date`}
                    render={({ field: fProps }) => (
                        <FormItem className="w-[180px] flex flex-col justify-end">
                            <FormLabel className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Fecha Speaking</FormLabel>
                            <Popover open={speakingPopoverOpen} onOpenChange={setSpeakingPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant="outline" className={cn("h-9 pl-3 text-left font-normal bg-background border-emerald-200 dark:border-emerald-900", !fProps.value && "text-muted-foreground")}>
                                            {fProps.value ? format(fProps.value, "PP", { locale: es }) : <span className="text-xs">Igual a escrito</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={fProps.value || undefined}
                                        onSelect={(val) => {
                                            fProps.onChange(val);
                                            if (val) setSpeakingPopoverOpen(false);
                                        }}
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Configuración Base */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-background/50 p-3 rounded border border-dashed">
                <FormField control={form.control} name={`sessions.${index}.parameters.start_time`} render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs">Hora Inicio</FormLabel>
                        <FormControl><Input type="time" {...field} className="h-8" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name={`sessions.${index}.parameters.examiners`} render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs">Evaluadores Orales</FormLabel>
                        <FormControl>
                            <Input
                                type="number"
                                min={1}
                                {...field}
                                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                className="h-8"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name={`sessions.${index}.parameters.break_duration`} render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-xs">Receso Int. (min)</FormLabel>
                        <FormControl>
                            <Input
                                type="number"
                                min={0}
                                {...field}
                                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                className="h-8"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            {/* CLASSROOMS */}
            <div className="bg-background/50 p-3 rounded-md border border-dashed">
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                    <h5 className="font-medium text-xs text-muted-foreground flex items-center gap-2">
                        Aulas y Capacidad
                    </h5>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                            const currentClassrooms = form.getValues(`sessions.${index}.classrooms`) || [];
                            form.setValue(`sessions.${index}.classrooms`, [...currentClassrooms, { name: "", capacity: 15 }]);
                        }}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Aula
                    </Button>
                </div>

                <div className="space-y-2">
                    {form.watch(`sessions.${index}.classrooms`)?.map((_, classroomIndex) => (
                        <div key={classroomIndex} className="flex gap-2 items-start">
                            <FormField
                                control={form.control}
                                name={`sessions.${index}.classrooms.${classroomIndex}.name`}
                                render={({ field: fProps }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder="Ej. Aula 101" {...fProps} className="h-8 text-xs" />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`sessions.${index}.classrooms.${classroomIndex}.capacity`}
                                render={({ field: fProps }) => (
                                    <FormItem className="w-24">
                                        <FormControl>
                                            <Input type="number" min={1} {...fProps} onChange={e => fProps.onChange(e.target.valueAsNumber || 0)} className="h-8 text-xs" />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => {
                                    const current = form.getValues(`sessions.${index}.classrooms`);
                                    if (current.length > 1) {
                                        form.setValue(`sessions.${index}.classrooms`, current.filter((_, i) => i !== classroomIndex));
                                    }
                                }}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Total capacity sum */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
                    <span className="text-xs text-muted-foreground">Total candidatos (suma de aulas):</span>
                    <span className="text-xs font-bold text-primary">
                        {(form.watch(`sessions.${index}.classrooms`) || []).reduce(
                            (sum: number, c: any) => sum + (Number(c.capacity) || 0), 0
                        )} alumnos
                    </span>
                </div>
            </div>

            {/* STAFF / APLICADORES */}
            <div className="bg-background/50 p-3 rounded-md border border-dashed space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h5 className="font-medium text-xs text-foreground">Personal Asignado</h5>
                            {totalCandidates > 0 && (
                                <Badge variant="secondary" className="text-[10px] h-5 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200">
                                    Requerido: {suggestedInvigilators} Invigilator{suggestedInvigilators !== 1 ? 's' : ''} (1:25)
                                </Badge>
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">Asigna aplicadores para esta sesión.</p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isLocked}
                        onClick={() => appendStaff({ applicator_id: "", role: "INVIGILATOR" })}
                    >
                        <Plus className="h-3 w-3 mr-1" /> Personal
                    </Button>
                </div>

                {isLocked && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-900 flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                            Selecciona Sede y Examen para habilitar la asignación de personal.
                        </span>
                    </div>
                )}

                <div className="space-y-2">
                    {staffFields.map((field, sIndex) => {
                        const selectedAppId = form.watch(`sessions.${index}.staff.${sIndex}.applicator_id`);
                        const applicator = applicators.find(a => a.id === selectedAppId);

                        const isNotCertified = watchExamType && applicator && !isCertifiedForExam(applicator, watchExamType);
                        const isBusy = selectedAppId && busyStaffIds.includes(selectedAppId);

                        const showWarning = isNotCertified || isBusy;

                        return (
                            <div key={field.id} className="flex flex-col bg-muted/30 p-2 rounded gap-1 border border-background">
                                <div className="flex gap-2 items-start">
                                    <FormField control={form.control} name={`sessions.${index}.staff.${sIndex}.applicator_id`} render={({ field: fProps }) => (
                                        <FormItem className="flex-1">
                                            <Select onValueChange={fProps.onChange} defaultValue={fProps.value} disabled={!watchExamType}>
                                                <FormControl>
                                                    <SelectTrigger className={cn("h-8 text-xs", showWarning && "border-amber-500 focus:ring-amber-500")}>
                                                        <SelectValue placeholder={watchExamType ? "Selecciona Empleado" : "Selecciona nivel primero"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {/* Presencial group */}
                                                    {presencialApplicators.length > 0 && (
                                                        <SelectGroup>
                                                            <SelectLabel className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs text-center font-bold">
                                                                📍 Presencial — {schoolZone}
                                                            </SelectLabel>
                                                            {presencialApplicators.map(app => (
                                                                <SelectItem key={app.id} value={app.id} className="text-xs">{app.name}</SelectItem>
                                                            ))}
                                                        </SelectGroup>
                                                    )}
                                                    {/* Remoto group */}
                                                    {remotoApplicators.length > 0 && (
                                                        <>
                                                            {presencialApplicators.length > 0 && <SelectSeparator />}
                                                            <SelectGroup>
                                                                <SelectLabel className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs text-center font-bold">
                                                                    🖥️ Remoto
                                                                </SelectLabel>
                                                                {remotoApplicators.map(app => (
                                                                    <SelectItem key={app.id} value={app.id} className="text-xs">{app.name}</SelectItem>
                                                                ))}
                                                            </SelectGroup>
                                                        </>
                                                    )}
                                                    {certifiedApplicators.length === 0 && watchExamType && (
                                                        <div className="p-2 text-xs text-center text-muted-foreground">No existen aplicadores asignados a este nivel.</div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name={`sessions.${index}.staff.${sIndex}.role`} render={({ field: fProps }) => (
                                        <FormItem className="w-[140px]">
                                            <Select onValueChange={fProps.onChange} defaultValue={fProps.value}>
                                                <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Rol" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {ROLES.map(role => (
                                                        <SelectItem key={role.id} value={role.id} className="text-xs">{role.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />

                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8 shrink-0 hover:bg-destructive/10" onClick={() => removeStaff(sIndex)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                {showWarning && (
                                    <div className="text-[10px] font-medium text-amber-600 dark:text-amber-500 flex flex-col gap-0.5 mt-0.5">
                                        {isNotCertified && (
                                            <div className="flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" />
                                                ⚠️ Certificación: No autorizado para {watchExamType?.toUpperCase()}
                                            </div>
                                        )}
                                        {isBusy && (
                                            <div className="flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" />
                                                ⚠️ Conflicto: Ya tiene otro evento en esta fecha
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}


export function AddEventDialog({ onEventAdded, initialData, open: controlledOpen, onOpenChange }: { onEventAdded?: () => void, initialData?: any, open?: boolean, onOpenChange?: (open: boolean) => void }) {
    const { t } = useI18n();
    const router = useRouter();
    const [internalOpen, setInternalOpen] = useState(false);

    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;
    const [schools, setSchools] = useState<any[]>([]);
    const [applicators, setApplicators] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [showCreateSchool, setShowCreateSchool] = useState(false);


    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                setIsLoadingData(true);
                try {
                    const [schoolsRes, appRes] = await Promise.all([
                        fetch("/api/v1/schools"),
                        fetch("/api/v1/applicators")
                    ]);

                    if (schoolsRes.ok) {
                        const data = await schoolsRes.json();
                        setSchools(data.schools || []);
                    }
                    if (appRes.ok) {
                        const data = await appRes.json();
                        setApplicators(data.applicators || []);
                    }
                } catch (error) {
                    console.error("Error fetching event dependencies:", error);
                } finally {
                    setIsLoadingData(false);
                }
            };
            fetchData();
        }
    }, [open]);

    const form = useForm<FormValues>({
        resolver: zodResolver(createEventSchema) as any,
        defaultValues: {
            title: initialData?.title || "",
            school_id: initialData?.school_id || "",
            sessions: [{
                exam_type: "",
                date: new Date(),
                speaking_date: null,
                parameters: { start_time: "09:00", examiners: 1, break_duration: 10 },
                classrooms: [{ name: "Salón Principal", capacity: 15 }],
                staff: []
            }]
        },
    });

    const { fields: sessionFields, append: appendSession, remove: removeSession } = useFieldArray({
        control: form.control,
        name: "sessions"
    });

    // Derive the school zone from the selected school city
    const watchedSchoolId = form.watch("school_id");
    const selectedSchool = schools.find((s: any) => s.id === watchedSchoolId);
    const schoolZone = getCityZone(selectedSchool?.city);

    useEffect(() => {
        if (open && !initialData) {
            form.reset({
                title: "",
                school_id: "",
                sessions: [{
                    exam_type: "",
                    date: new Date(),
                    speaking_date: null,
                    parameters: { start_time: "09:00", examiners: 1, break_duration: 10 },
                    classrooms: [{ name: "Salón Principal", capacity: 15 }],
                    staff: []
                }]
            });
        }
    }, [open, initialData, form]);

    const onSubmit = async (data: FormValues) => {
        try {
            if (selectedSchool?.operating_hours?.open && selectedSchool?.operating_hours?.close) {
                const { open: schoolOpen, close: schoolClose } = selectedSchool.operating_hours;
                for (let i = 0; i < data.sessions.length; i++) {
                    const session = data.sessions[i];
                    if (session.parameters.start_time < schoolOpen || session.parameters.start_time > schoolClose) {
                        toast.error(`La hora de inicio de la sesión ${i + 1} está fuera del horario escolar (${schoolOpen} - ${schoolClose})`);
                        return;
                    }
                }
            }

            const payload = {
                ...data,
                sessions: data.sessions.map(s => {
                    const candidates_count = (s.classrooms || []).reduce((t, c) => t + (c.capacity || 0), 0);
                    return {
                        ...s,
                        date: s.date.toISOString().split('T')[0],
                        speaking_date: s.speaking_date ? s.speaking_date.toISOString().split('T')[0] : null,
                        parameters: {
                            ...s.parameters,
                            candidates_count
                        }
                    };
                })
            };

            const isEditing = !!initialData;
            // For now, editing via this dialog only modifies the shell events table.
            // Full session edits are done in the detailed planner dialog.
            const url = isEditing ? `/api/v1/events/${initialData.id}` : "/api/v1/events";
            const method = isEditing ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(isEditing ? {
                    title: payload.title,
                    school_id: payload.school_id
                } : payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error al guardar evento");
            }

            const responseData = await response.json();

            form.reset();
            setOpen(false);
            if (onEventAdded) onEventAdded();

            if (isEditing) {
                toast.success("Evento actualizado");
            } else {
                const newEventId = responseData.event?.id || responseData.id;
                toast.success("Evento creado. Abriendo planner...");
                if (newEventId) {
                    router.push(`/dashboard/eventos/planner/${newEventId}`);
                } else {
                    router.refresh();
                }
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Hubo un error al crear el evento.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!initialData && controlledOpen === undefined && (
                <DialogTrigger asChild>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Crear Evento
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? t("common.edit") : "Nuevo Evento Integrado"}</DialogTitle>
                    <DialogDescription>
                        {initialData
                            ? "Edita la configuración base del Evento. Para editar horarios de sesiones, entra al Planner Detallado."
                            : "Asigna la sede, crea las sesiones y delega el personal (applicators) a cada examen."}
                    </DialogDescription>
                </DialogHeader>

                {isLoadingData ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Título del Evento</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej. Cambridge Spring 2024 - Instituto Norte" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="school_id"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Sede (Colegio Objetivo)</FormLabel>
                                            <Select
                                                onValueChange={(val) => {
                                                    if (val === "__new__") {
                                                        setShowCreateSchool(true);
                                                    } else {
                                                        field.onChange(val);
                                                    }
                                                }}
                                                defaultValue={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar sede" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectLabel>Sedes registradas</SelectLabel>
                                                        {schools.map(school => (
                                                            <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                    <SelectSeparator />
                                                    <SelectItem value="__new__" className="text-primary font-medium">
                                                        <Plus className="inline h-3 w-3 mr-1" />
                                                        Registrar nueva sede
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {!initialData && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div>
                                            <h4 className="font-medium text-sm">Sesiones / Exámenes</h4>
                                            <p className="text-xs text-muted-foreground">Configura los exámenes, salones y personal certificado que asistirá.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {sessionFields.map((field, sessionIndex) => (
                                            <SessionItem
                                                key={field.id}
                                                form={form}
                                                index={sessionIndex}
                                                removeSession={removeSession}
                                                applicators={applicators}
                                                schoolZone={schoolZone}
                                                schoolId={watchedSchoolId}
                                            />
                                        ))}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-14 border-dashed border-2 hover:bg-muted/50 hover:text-primary transition-colors text-muted-foreground mt-4 font-medium tracking-wide"
                                        onClick={() => appendSession({
                                            exam_type: "",
                                            date: new Date(),
                                            parameters: { start_time: "09:00", examiners: 1, break_duration: 10 },
                                            classrooms: [{ name: "Salón Principal", capacity: 15 }],
                                            staff: []
                                        })}
                                    >
                                        <Plus className="h-5 w-5 mr-2" /> Agregar Nueva Sesión / Examen
                                    </Button>
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    disabled={form.formState.isSubmitting}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {initialData ? "Guardar Cambios" : "Crear Evento Oficial"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
            <CreateSchoolDialog
                open={showCreateSchool}
                onOpenChange={setShowCreateSchool}
                onCreated={(school) => {
                    setSchools(prev => [...prev, school]);
                    form.setValue("school_id", school.id);
                    setShowCreateSchool(false);
                }}
            />
        </Dialog>
    );
}
