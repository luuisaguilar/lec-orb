"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Loader2, GripVertical, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isCertifiedForExam, EXAMS, DEFAULT_COMPONENTS, getComponentsForExam } from "@/lib/exam-utils";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectLabel,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const ROLES = [
    { id: "EVALUATOR", name: "Speaking Evaluator" },
    { id: "INVIGILATOR", name: "Invigilator (Escrito)" },
    { id: "SUPERVISOR", name: "Supervisor" },
    { id: "ADMIN", name: "Admin (Center)" },
    { id: "REMOTE", name: "Remote Support" },
];

const createSessionSchema = z.object({
    exam_type: z.string().min(1, "El nivel es requerido"),
    date: z.date(),
    classrooms: z.array(z.object({
        name: z.string().min(1, "Nombre requerido"),
        capacity: z.number().min(1, "Mínimo 1")
    })).min(1, "Agrega al menos un salón"),
    parameters: z.object({
        start_time: z.string().min(1, "La hora de inicio es requerida"),
        examiners: z.number().min(1, "Mínimo 1 examinador"),
        break_duration: z.number().min(0, "Debe ser mayor o igual a 0")
    }),
    staff: z.array(z.object({
        applicator_id: z.string().min(1, "Selecciona un aplicador"),
        role: z.enum(['EVALUATOR', 'INVIGILATOR', 'SUPERVISOR', 'ADMIN', 'REMOTE'])
    })),
    speaking_date: z.date().optional().nullable(),
    delivery_mode: z.enum(['PAPER', 'DIGITAL']),
    component_order: z.array(z.object({
        id: z.string(),
        date: z.string().optional()
    }))
});

type FormValues = z.infer<typeof createSessionSchema>;

export function SortableItem(props: { id: string, name: string, date?: string, onDateChange: (date: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex flex-col gap-2 bg-background border rounded-md p-2 mb-2 shadow-sm">
            <div className="flex items-center gap-3">
                <div {...attributes} {...listeners} className="cursor-grab hover:text-primary opacity-50 hover:opacity-100">
                    <GripVertical className="h-5 w-5" />
                </div>
                <span className="font-medium text-sm flex-1">{props.name}</span>
            </div>
            <div className="pl-8 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Fecha:</span>
                <Input
                    type="date"
                    className="h-7 text-xs w-[130px] p-1"
                    value={props.date || ""}
                    onChange={(e) => props.onDateChange(e.target.value)}
                />
            </div>
        </div>
    );
}

interface AddSessionDialogProps {
    eventId: string;
    onSessionAdded?: () => void;
    initialData?: any;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    schoolHours?: { open: string; close: string } | null;
}

export function AddEventSessionDialog({ eventId, onSessionAdded, initialData, open: controlledOpen, onOpenChange, schoolHours }: AddSessionDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const [applicators, setApplicators] = useState<any[]>([]);
    const [components, setComponents] = useState<any[]>(DEFAULT_COMPONENTS);
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [speakingPopoverOpen, setSpeakingPopoverOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (open) {
            fetch("/api/v1/applicators").then(res => res.json()).then(data => {
                setApplicators(data.applicators || []);
            });
        }
    }, [open]);

    const form = useForm<FormValues>({
        resolver: zodResolver(createSessionSchema) as any,
        defaultValues: {
            exam_type: initialData?.exam_type || "",
            date: initialData?.date ? new Date(initialData.date) : new Date(),
            classrooms: initialData?.classrooms || [{ name: "Salón Principal", capacity: 15 }],
            parameters: initialData?.parameters || {
                start_time: "09:00",
                examiners: 1,
                break_duration: 10
            },
            staff: initialData?.staff || [],
            speaking_date: initialData?.speaking_date ? new Date(initialData.speaking_date + 'T12:00:00') : null,
            delivery_mode: initialData?.delivery_mode || 'PAPER',
            component_order: initialData?.component_order?.map((item: any) => ({
                id: typeof item === 'string' ? item : item.id,
                date: typeof item === 'string' ? undefined : item.date
            })) || DEFAULT_COMPONENTS.map(c => ({ id: c.id }))
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "staff",
    });

    // Reset components when exam type changes (only when not editing existing data)
    useEffect(() => {
        const subscription = form.watch((values, { name }) => {
            if (name === 'exam_type' && values.exam_type && !initialData) {
                const examComponents = getComponentsForExam(values.exam_type);
                setComponents(examComponents);
                form.setValue('component_order', examComponents.map(c => ({ id: c.id })));
            }
        });
        return () => subscription.unsubscribe();
    }, [form, initialData]);

    useEffect(() => {
        if (open) {
            const examType = initialData?.exam_type || '';
            const examComponents = getComponentsForExam(examType);
            if (initialData?.component_order) {
                const ordered = initialData.component_order.map((item: any) => {
                    const id = typeof item === 'string' ? item : item.id;
                    const date = typeof item === 'string' ? undefined : item.date;
                    const base = examComponents.find(c => c.id === id) || DEFAULT_COMPONENTS.find(c => c.id === id);
                    return base ? { ...base, date } : null;
                }).filter(Boolean);
                setComponents(ordered.length > 0 ? ordered : examComponents);
            } else {
                setComponents(examComponents);
            }
            form.reset({
                exam_type: initialData?.exam_type || "",
                date: initialData?.date ? new Date(initialData.date) : new Date(),
                classrooms: initialData?.classrooms || [{ name: "Salón Principal", capacity: 15 }],
                parameters: initialData?.parameters || {
                    start_time: "09:00",
                    examiners: 1,
                    break_duration: 10
                },
                staff: initialData?.staff || [],
                speaking_date: initialData?.speaking_date ? new Date(initialData.speaking_date + 'T12:00:00') : null,
                delivery_mode: initialData?.delivery_mode || "PAPER",
                component_order: initialData?.component_order?.map((item: any) => ({
                    id: typeof item === 'string' ? item : item.id,
                    date: typeof item === 'string' ? undefined : item.date
                })) || DEFAULT_COMPONENTS.map(c => ({ id: c.id }))
            });
        }
    }, [open, initialData, form]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setComponents((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over?.id);
                const newArray = arrayMove(items, oldIndex, newIndex);
                form.setValue("component_order", newArray.map(c => ({ id: c.id, date: c.date })));
                return newArray;
            });
        }
    };

    const handleComponentDateChange = (id: string, date: string) => {
        setComponents(items => {
            const newItems = items.map(c => c.id === id ? { ...c, date: date || undefined } : c);
            form.setValue("component_order", newItems.map(c => ({ id: c.id, date: c.date })));
            return newItems;
        });
    };

    const onSubmit = async (data: FormValues) => {
        try {
            if (schoolHours?.open && schoolHours?.close) {
                if (data.parameters.start_time < schoolHours.open || data.parameters.start_time > schoolHours.close) {
                    toast.error(`La hora de inicio está fuera del horario escolar de la sede (${schoolHours.open} - ${schoolHours.close})`);
                    return;
                }
            }

            const url = initialData ? `/api/v1/events/${eventId}/sessions/${initialData.id}` : `/api/v1/events/${eventId}/sessions`;
            const method = initialData ? "PATCH" : "POST";

            const payload = {
                ...data,
                date: data.date.toISOString().split('T')[0],
                speaking_date: data.speaking_date ? data.speaking_date.toISOString().split('T')[0] : null
            };

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorMessage = "Error al guardar la sesión";
                try {
                    const text = await response.text();
                    try {
                        const errorData = JSON.parse(text);
                        errorMessage = errorData.error || errorMessage;
                    } catch {
                        console.error("Non-JSON error response:", text);
                        errorMessage = `Error del servidor (${response.status})`;
                    }
                } catch { }

                throw new Error(errorMessage);
            }

            toast.success(initialData ? "Sesión actualizada" : "Sesión agregada correctamente");
            setOpen(false);
            if (onSessionAdded) onSessionAdded();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error al procesar la solicitud");
        }
    };

    const watchExamType = form.watch("exam_type");
    const certifiedApplicators = watchExamType
        ? applicators.filter(a => isCertifiedForExam(a, watchExamType))
        : applicators;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!initialData && (
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" /> Agregar Examen (Sesión)
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Editar Sesión" : "Agregar Sesión de Examen"}</DialogTitle>
                    <DialogDescription>
                        Añade un examen específico a este evento. Puedes personalizar la fecha, los parámetros y el orden en que se aplicarán las diferentes partes del examen.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Fila 1: Nivel y Fechas */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="exam_type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nivel del Examen</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar Nivel" />
                                                </SelectTrigger>
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
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col mt-[9px]">
                                        <FormLabel>Fecha Examen Escrito</FormLabel>
                                        <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PP", { locale: es }) : <span>Seleccionar fecha</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(val) => {
                                                        field.onChange(val);
                                                        if (val) setDatePopoverOpen(false);
                                                    }}
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
                                name="speaking_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col mt-[9px]">
                                        <FormLabel className="text-emerald-700 dark:text-emerald-400">Fecha Speaking (Opcional)</FormLabel>
                                        <Popover open={speakingPopoverOpen} onOpenChange={setSpeakingPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" className={cn("w-full pl-3 text-left font-normal border-emerald-200 dark:border-emerald-900", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PP", { locale: es }) : <span>Igual a escrito</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value || undefined}
                                                    onSelect={(val) => {
                                                        field.onChange(val);
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

                            <FormField
                                control={form.control}
                                name="delivery_mode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Modo de Aplicación</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className={cn(field.value === 'DIGITAL' ? "border-blue-500 bg-blue-50/50" : "")}>
                                                    <SelectValue placeholder="Seleccionar Modo" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="PAPER">Examen en Papel</SelectItem>
                                                <SelectItem value="DIGITAL">Examen Digital</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Fila 2: Orden y Parámetros */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Orden Cronológico DND */}
                            <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
                                <h4 className="font-medium text-sm border-b pb-2">Orden Cronológico del Examen</h4>
                                <p className="text-xs text-muted-foreground">Arrastra para ordenar cómo se desarrollará la aplicación y la evaluación oral.</p>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={components.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-2 mt-4">
                                            {components.map((c) => (
                                                <SortableItem
                                                    key={c.id}
                                                    id={c.id}
                                                    name={c.name}
                                                    date={c.date}
                                                    onDateChange={(date) => handleComponentDateChange(c.id, date)}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>

                            {/* Parámetros Básicos y Salones */}
                            <div className="space-y-4">
                                <div className="bg-muted/30 border rounded-lg p-4 space-y-4">
                                    <h4 className="font-medium text-sm border-b pb-2">Configuración Base</h4>

                                    <div className="grid grid-cols-3 gap-3">
                                        <FormField control={form.control} name="parameters.start_time" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Hora de Inicio</FormLabel>
                                                <FormControl><Input type="time" {...field} className="h-8" /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="parameters.examiners" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Evaluadores</FormLabel>
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
                                        <FormField control={form.control} name="parameters.break_duration" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs">Receso (min)</FormLabel>
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
                                </div>

                                {/* Aulas y Capacidad */}
                                <div className="bg-background/50 p-4 rounded-md border border-dashed">
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
                                                const currentClassrooms = form.getValues('classrooms') || [];
                                                form.setValue('classrooms', [...currentClassrooms, { name: "", capacity: 15 }]);
                                            }}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Aula
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        {form.watch('classrooms')?.map((_, classroomIndex) => (
                                            <div key={classroomIndex} className="flex gap-2 items-start">
                                                <FormField
                                                    control={form.control}
                                                    name={`classrooms.${classroomIndex}.name`}
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
                                                    name={`classrooms.${classroomIndex}.capacity`}
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
                                                        const current = form.getValues('classrooms');
                                                        if (current.length > 1) {
                                                            form.setValue('classrooms', current.filter((_, i) => i !== classroomIndex));
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-3 text-xs text-right text-muted-foreground">
                                        Niños Totales: <span className="font-bold text-foreground">
                                            {form.watch('classrooms')?.reduce((acc, curr) => acc + (curr.capacity || 0), 0) || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fila 3: Staff Asignado a la Sesión */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <div>
                                    <h4 className="font-medium text-sm">Personal Asignado</h4>
                                    <p className="text-xs text-muted-foreground">Asigna evaluadores y aplicadores específicamente a esta fecha/examen.</p>
                                </div>
                                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => append({ applicator_id: "", role: "INVIGILATOR" })}>
                                    <Plus className="h-4 w-4" /> Agregar
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {fields.map((field, index) => {
                                    const showWarning = false;

                                    return (
                                        <div key={field.id} className="flex flex-col bg-muted/20 p-2 rounded border gap-1">
                                            <div className="flex gap-3 items-start">
                                                <FormField control={form.control} name={`staff.${index}.applicator_id`} render={({ field: fProps }) => (
                                                    <FormItem className="flex-1">
                                                        <Select onValueChange={fProps.onChange} defaultValue={fProps.value} disabled={!watchExamType}>
                                                            <FormControl>
                                                                <SelectTrigger className={cn("h-9", showWarning && "border-amber-500 focus:ring-amber-500")}>
                                                                    <SelectValue placeholder={watchExamType ? "Selecciona Empleado" : "Selecciona nivel primero"} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {certifiedApplicators.length > 0 && (
                                                                    <SelectGroup>
                                                                        <SelectLabel className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-center font-bold">
                                                                            Aplicadores Disponibles
                                                                        </SelectLabel>
                                                                        {certifiedApplicators.map(app => (
                                                                            <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                                                                        ))}
                                                                    </SelectGroup>
                                                                )}
                                                                {certifiedApplicators.length === 0 && watchExamType && (
                                                                    <div className="p-2 text-sm text-center text-muted-foreground">No existen aplicadores certificados para este nivel</div>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />

                                                <FormField control={form.control} name={`staff.${index}.role`} render={({ field: fProps }) => (
                                                    <FormItem className="w-[180px]">
                                                        <Select onValueChange={fProps.onChange} defaultValue={fProps.value}>
                                                            <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Rol" /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                {ROLES.map(role => (
                                                                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />

                                                <Button type="button" variant="ghost" size="icon" className="text-destructive h-9 w-9 shrink-0" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {showWarning && (
                                                <div className="text-[11px] font-medium text-amber-600 dark:text-amber-500 flex items-center gap-1.5 ml-1">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    Advertencia: Asignado como Evaluador pero no cuenta con certificación estricta para este nivel.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {fields.length === 0 && (
                                    <div className="text-xs text-muted-foreground text-center py-4 border rounded border-dashed bg-muted/30">
                                        Sin personal asignado. Puedes generarlo después.
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="border-t pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={form.formState.isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {initialData ? "Guardar Cambios" : "Guardar Sesión"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
