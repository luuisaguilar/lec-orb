"use client";

import { useMemo, useState } from "react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    defaultDropAnimationSideEffects,
    closestCorners,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import { GripVertical, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type CrmOpportunityStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export type CrmOpportunity = {
    id: string;
    title: string;
    stage: CrmOpportunityStage;
    expected_amount: number;
    probability: number;
    expected_close: string | null;
    contact_name?: string;
};

const STAGE_CONFIG: Record<CrmOpportunityStage, { name: string; color: string; order: number }> = {
    new: { name: 'Nuevo', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', order: 1 },
    qualified: { name: 'Calificado', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', order: 2 },
    proposal: { name: 'Propuesta', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', order: 3 },
    negotiation: { name: 'Negociación', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', order: 4 },
    won: { name: 'Ganado', color: 'bg-green-500/10 text-green-500 border-green-500/20', order: 5 },
    lost: { name: 'Perdido', color: 'bg-red-500/10 text-red-500 border-red-500/20', order: 6 },
};

type CrmKanbanBoardProps = {
    opportunities: CrmOpportunity[];
    onMoveOpportunity: (id: string, stage: CrmOpportunityStage) => Promise<void>;
    onEditOpportunity: (opp: CrmOpportunity) => void;
};

function stageDroppableId(stage: string) {
    return `crm-stage:${stage}` as const;
}

function oppDraggableId(id: string) {
    return `crm-opp:${id}` as const;
}

function parseStageId(overId: string | number): CrmOpportunityStage | null {
    const s = String(overId);
    if (s.startsWith("crm-stage:")) return s.slice(10) as CrmOpportunityStage;
    return null;
}

function parseOppId(activeId: string | number): string | null {
    const s = String(activeId);
    if (s.startsWith("crm-opp:")) return s.slice(8);
    return null;
}

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function DroppableStage({
    stage,
    children,
    totalAmount,
    count
}: {
    stage: CrmOpportunityStage;
    children: React.ReactNode;
    totalAmount: number;
    count: number;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: stageDroppableId(stage) });
    const config = STAGE_CONFIG[stage];

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex min-h-[500px] w-[260px] shrink-0 flex-col rounded-2xl border bg-slate-900/40 backdrop-blur-sm p-3.5 transition-all duration-200",
                isOver ? "ring-2 ring-indigo-500/50 bg-slate-800/60 border-indigo-500/30 shadow-lg shadow-indigo-500/10" : "border-white/5 shadow-inner"
            )}
        >
            <div className="mb-4 flex flex-col gap-1.5 px-1 border-b border-white/5 pb-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-bold tracking-wider uppercase text-foreground/90">{config.name}</span>
                    <Badge variant="outline" className={cn("text-xs font-bold px-2 py-0.5 rounded-full border-0", config.color)}>
                        {count}
                    </Badge>
                </div>
                <div className="text-sm font-semibold text-muted-foreground flex items-center">
                    <DollarSign className="w-4 h-4 mr-0.5 opacity-70" />
                    {formatCurrency(totalAmount).replace('$', '')}
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1 pb-2 scrollbar-thin scrollbar-thumb-white/10">{children}</div>
        </div>
    );
}

function DraggableOppCard({
    opp,
    onEdit,
}: {
    opp: CrmOpportunity;
    onEdit: (o: CrmOpportunity) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: oppDraggableId(opp.id),
        data: { opp },
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "cursor-grab rounded-xl border bg-card/80 backdrop-blur-md p-3.5 shadow-sm hover:shadow-md transition-all duration-200 active:cursor-grabbing group",
                isDragging ? "opacity-60 ring-2 ring-indigo-500/50 shadow-xl shadow-indigo-500/20" : "border-white/5 hover:border-indigo-500/30"
            )}
        >
            <div className="flex gap-2.5">
                <button
                    type="button"
                    className="mt-1 shrink-0 touch-none text-muted-foreground/30 hover:text-indigo-400 transition-colors"
                    {...listeners}
                    {...attributes}
                    aria-label="Arrastrar"
                >
                    <GripVertical className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1 text-left cursor-pointer" onClick={() => onEdit(opp)}>
                    {opp.contact_name ? (
                        <p className="text-sm font-semibold text-foreground/90 mb-0.5 truncate">{opp.contact_name}</p>
                    ) : null}
                    <p className="text-xs font-medium leading-snug text-indigo-400/90 group-hover:text-indigo-300 transition-colors mb-3 truncate">
                        {opp.title}
                    </p>
                    
                    <div className="flex flex-col gap-2 mt-2 pt-2.5 border-t border-white/5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center font-bold text-emerald-400 tracking-wide">
                                <DollarSign className="w-3.5 h-3.5 mr-0.5 opacity-80" />
                                {formatCurrency(opp.expected_amount).replace('$', '')}
                            </span>
                            <span className="flex items-center font-semibold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-500/20">
                                <TrendingUp className="w-3 h-3 mr-1 opacity-70" />
                                {opp.probability}%
                            </span>
                        </div>
                        {opp.expected_close && (
                            <div className="flex items-center text-[10px] text-muted-foreground/70 mt-1 font-medium">
                                <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                                {opp.expected_close}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: { active: { opacity: "0.5" } },
    }),
};

export function CrmKanbanBoard({ opportunities, onMoveOpportunity, onEditOpportunity }: CrmKanbanBoardProps) {
    const [activeOpp, setActiveOpp] = useState<CrmOpportunity | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor)
    );

    const stages = useMemo(() => 
        (Object.keys(STAGE_CONFIG) as CrmOpportunityStage[]).sort((a, b) => STAGE_CONFIG[a].order - STAGE_CONFIG[b].order),
    []);

    const oppsByStage = useMemo(() => {
        const map = new Map<CrmOpportunityStage, CrmOpportunity[]>();
        for (const s of stages) map.set(s, []);
        for (const o of opportunities) {
            // Same fallback as pipeline table: unknown DB values must not vanish from the board.
            const stage: CrmOpportunityStage = stages.includes(o.stage) ? o.stage : "new";
            const list = map.get(stage);
            if (list) list.push({ ...o, stage });
        }
        for (const [, list] of map) {
            list.sort((a, b) => new Date(b.expected_close || 0).getTime() - new Date(a.expected_close || 0).getTime());
        }
        return map;
    }, [stages, opportunities]);

    const stageTotals = useMemo(() => {
        const totals = new Map<CrmOpportunityStage, number>();
        for (const s of stages) {
            const list = oppsByStage.get(s) ?? [];
            const sum = list.reduce((acc, curr) => acc + Number(curr.expected_amount), 0);
            totals.set(s, sum);
        }
        return totals;
    }, [stages, oppsByStage]);

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveOpp(null);
        if (!over) return;

        const oppId = parseOppId(active.id);
        if (!oppId) return;

        const opp = opportunities.find((o) => o.id === oppId);
        if (!opp) return;

        let targetStage: CrmOpportunityStage | null = parseStageId(over.id);
        if (!targetStage) {
            const overOppId = parseOppId(over.id);
            if (overOppId) {
                const other = opportunities.find((o) => o.id === overOppId);
                targetStage = other?.stage ?? null;
            }
        }

        if (!targetStage || targetStage === opp.stage) return;

        try {
            await onMoveOpportunity(oppId, targetStage);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "No se pudo mover la oportunidad.");
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={({ active }) => {
                const id = parseOppId(active.id);
                const t = id ? opportunities.find((x) => x.id === id) ?? null : null;
                setActiveOpp(t);
            }}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveOpp(null)}
        >
            <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-1">
                {stages.map((stage) => (
                    <DroppableStage 
                        key={stage} 
                        stage={stage} 
                        totalAmount={stageTotals.get(stage) || 0}
                        count={oppsByStage.get(stage)?.length || 0}
                    >
                        {(oppsByStage.get(stage) ?? []).map((o) => (
                            <DraggableOppCard key={o.id} opp={o} onEdit={onEditOpportunity} />
                        ))}
                    </DroppableStage>
                ))}
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeOpp ? (
                    <div className="w-80 cursor-grabbing rounded-xl border border-indigo-500/30 bg-card p-3 shadow-xl ring-2 ring-indigo-500/50">
                        <p className="text-sm font-semibold">{activeOpp.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatCurrency(activeOpp.expected_amount)}</p>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
