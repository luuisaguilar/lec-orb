import React from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, GripVertical, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// Types
export type NcStatus = "draft" | "analysis" | "pending" | "open" | "done" | "cancel";

export type Nonconformity = {
    id: string;
    ref: string;
    title: string | null;
    description: string;
    status: NcStatus;
    severity_id: string | null;
    updated_at: string;
};

interface KanbanBoardProps {
    items: Nonconformity[];
    statuses: NcStatus[];
    statusLabels: Record<NcStatus, string>;
    statusBadges: Record<NcStatus, string>;
    onMove: (id: string, newStatus: NcStatus) => Promise<void>;
    onDetail: (id: string) => void;
    severityMap: Map<string, string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getSeverityStyles = (severityId: string | null, severityName: string | null) => {
    const name = severityName?.toLowerCase() || "";
    if (name.includes("crítica") || name.includes("critica")) return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    if (name.includes("alta")) return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (name.includes("media")) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
};

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function SortableNcCard({
    item,
    onDetail,
    severityMap,
    isOverlay = false,
}: {
    item: Nonconformity;
    onDetail: (id: string) => void;
    severityMap: Map<string, string>;
    isOverlay?: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        data: {
            type: "item",
            item,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    const severityName = item.severity_id ? severityMap.get(item.severity_id) || null : null;
    const severityClass = getSeverityStyles(item.severity_id, severityName);

    if (isDragging && !isOverlay) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="w-full h-32 rounded-xl border border-primary/20 bg-primary/5 opacity-40 backdrop-blur-sm"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "w-full text-left rounded-xl border border-slate-800 bg-slate-950/40 backdrop-blur-md p-3.5 hover:border-primary/40 transition-all group relative overflow-hidden",
                isOverlay && "rotate-3 scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-primary/50 bg-slate-900 z-50 cursor-grabbing"
            )}
        >
            {/* Subtle Gradient Glow */}
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-colors" />
            
            <div className="flex items-start justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2">
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-1 -ml-1 text-slate-600 hover:text-primary transition-colors cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">{item.ref}</p>
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDetail(item.id);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-primary hover:text-white text-slate-400 transition-all"
                >
                    <Eye className="h-3.5 w-3.5" />
                </button>
            </div>

            <p className="text-sm font-bold text-slate-100 mt-2.5 line-clamp-2 group-hover:text-white transition-colors">
                {item.title || "Sin título"}
            </p>
            
            <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                {item.description}
            </p>

            <div className="flex items-center justify-between mt-4 relative z-10">
                <div className="flex items-center gap-2">
                    {item.severity_id && (
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 h-4.5 border font-semibold", severityClass)}>
                            {severityName}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-slate-500 font-medium">
                    <Clock className="h-3 w-3 opacity-70" />
                    {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: es })}
                </div>
            </div>
        </div>
    );
}

// ─── Kanban Column ───────────────────────────────────────────────────────────

function KanbanColumn({
    id,
    title,
    count,
    items,
    statusBadges,
    onDetail,
    severityMap,
}: {
    id: NcStatus;
    title: string;
    count: number;
    items: Nonconformity[];
    statusBadges: Record<NcStatus, string>;
    onDetail: (id: string) => void;
    severityMap: Map<string, string>;
}) {
    return (
        <Card className="bg-slate-900/30 border-slate-800/50 backdrop-blur-xl flex flex-col h-[calc(100vh-320px)] min-h-[550px] shadow-inner">
            <CardHeader className="p-4 border-b border-slate-800/40 shrink-0 bg-slate-950/20">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <div className={cn("h-1.5 w-1.5 rounded-full", statusBadges[id].split(" ")[1] || "bg-primary")} />
                        {title}
                    </span>
                    <Badge variant="secondary" className="bg-slate-800/50 text-slate-400 text-[10px] font-mono px-2 h-5 border-none">
                        {count.toString().padStart(2, '0')}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex-1 overflow-hidden bg-linear-to-b from-transparent to-slate-950/10">
                <SortableContext id={id} items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3.5 h-full overflow-y-auto pr-1.5 custom-scrollbar pb-12">
                        {items.map((item) => (
                            <SortableNcCard
                                key={item.id}
                                item={item}
                                onDetail={onDetail}
                                severityMap={severityMap}
                            />
                        ))}
                        {items.length === 0 && (
                            <div className="h-32 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800/50 bg-slate-900/10 group transition-all hover:bg-slate-900/20">
                                <Sparkles className="h-5 w-5 text-slate-700 mb-2 group-hover:text-slate-500 transition-colors" />
                                <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest">Sin Pendientes</p>
                            </div>
                        )}
                    </div>
                </SortableContext>
            </CardContent>
        </Card>
    );
}

// ─── Main Board ──────────────────────────────────────────────────────────────

export default function SGCKanbanBoard({
    items,
    statuses,
    statusLabels,
    statusBadges,
    onMove,
    onDetail,
    severityMap,
}: KanbanBoardProps) {
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [activeItem, setActiveItem] = React.useState<Nonconformity | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        setActiveItem(active.data.current?.item as Nonconformity);
    };

    const handleDragOver = (_event: DragOverEvent) => {
        // Implementation for local reordering could go here
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveItem(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        let newStatus: NcStatus | null = null;

        if (statuses.includes(overId as NcStatus)) {
            newStatus = overId as NcStatus;
        } else {
            const overItem = items.find(i => i.id === overId);
            if (overItem) {
                newStatus = overItem.status;
            }
        }

        const currentItem = items.find(i => i.id === activeId);
        if (currentItem && newStatus && currentItem.status !== newStatus) {
            await onMove(activeId, newStatus);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-5 overflow-x-auto pb-8 custom-scrollbar scroll-smooth px-1">
                {statuses.map((status) => (
                    <div key={status} className="w-[320px] shrink-0">
                        <KanbanColumn
                            id={status}
                            title={statusLabels[status]}
                            count={items.filter(i => i.status === status).length}
                            items={items.filter(i => i.status === status)}
                            statusBadges={statusBadges}
                            onDetail={onDetail}
                            severityMap={severityMap}
                        />
                    </div>
                ))}
            </div>

            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: "0.4",
                        },
                    },
                }),
            }}>
                {activeId && activeItem ? (
                    <SortableNcCard
                        item={activeItem}
                        statusBadges={statusBadges}
                        onDetail={onDetail}
                        severityMap={severityMap}
                        isOverlay
                    />
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
