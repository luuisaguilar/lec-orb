import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";

type NonconformityStat = {
    created_at: string | null;
    detection_date: string | null;
    updated_at: string | null;
    status: string | null;
    severity_id: string | null;
    stage_id: string | null;
};

type CapaStat = {
    status: string | null;
    deadline_at: string | null;
    completed_at: string | null;
};

type RiskStat = {
    severity: string | null;
    probability: string | null;
    status: string | null;
};

export const GET = withAuth(async (req, { supabase, member }) => {
    // 1. Lead Time NCs (Average days to close)
    // We try to select both legacy and new columns to be resilient
    const { data: ncData, error: ncError } = await supabase
        .from("sgc_nonconformities")
        .select("created_at, status, severity_id, stage_id, detection_date, updated_at")
        .eq("org_id", member.org_id);

    if (ncError) {
        console.error("SGC Stats NC Error:", ncError);
        return NextResponse.json({ error: ncError.message }, { status: 500 });
    }

    const ncs: NonconformityStat[] = (ncData ?? []) as NonconformityStat[];
    const closedNcs = ncs.filter((nc) => nc.status === "done");
    const avgLeadTime = closedNcs.length > 0
        ? closedNcs.reduce((acc, nc) => {
            const start = new Date(nc.detection_date || nc.created_at).getTime();
            const end = new Date(nc.updated_at).getTime();
            return acc + (end - start) / (1000 * 60 * 60 * 24);
        }, 0) / closedNcs.length
        : 0;

    // 2. CAPA Compliance
    const { data: capaData, error: capaError } = await supabase
        .from("sgc_actions")
        .select("status, deadline_at, completed_at")
        .eq("org_id", member.org_id);

    if (capaError) {
        console.error("SGC Stats CAPA Error:", capaError);
        return NextResponse.json({ error: capaError.message }, { status: 500 });
    }

    const capas: CapaStat[] = (capaData ?? []) as CapaStat[];
    const totalCapas = capas.length;
    const completedCapas = capas.filter((c) => c.status === "done").length;
    const onTimeCapas = capas.filter((c) => {
        if (c.status !== "done") return false;
        if (!c.deadline_at || !c.completed_at) return true;
        return new Date(c.completed_at) <= new Date(c.deadline_at);
    }).length;

    // 3. Risks Summary - corrected table and column names
    const { data: riskData, error: riskError } = await supabase
        .from("risk_assessments")
        .select("severity, probability, status")
        .eq("org_id", member.org_id);

    if (riskError) {
        console.warn("SGC Stats Risk Error (likely missing table):", riskError.message);
    }

    const risks: RiskStat[] = (riskData ?? []) as RiskStat[];

    // Helper to convert risk levels to scores (matching sgc-risks.tsx logic)
    const getScore = (val: string | null) => {
        if (!val) return 3;
        const num = parseInt(val.replace(/[^\d]/g, ""), 10);
        if (!isNaN(num)) return num;
        const low = val.toLowerCase();
        if (low.includes("crit") || low.includes("alta")) return 8;
        if (low.includes("media")) return 5;
        if (low.includes("baja")) return 2;
        return 4;
    };

    // 4. Group by Stage/Severity for NCs
    const ncBySeverity = ncs.reduce<Record<string, number>>((acc, nc) => {
        const sev = nc.severity_id || 'unassigned';
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
    }, {});

    const ncByStatus = ncs.reduce<Record<string, number>>((acc, nc) => {
        const status = nc.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    return NextResponse.json({
        summary: {
            totalNc: ncs.length,
            openNc: ncs.filter((nc) => nc.status !== "done" && nc.status !== "cancel").length,
            avgLeadTime: Math.round(avgLeadTime * 10) / 10,
            capaCompliance: totalCapas > 0 ? Math.round((completedCapas / totalCapas) * 100) : 100,
            capaOnTimeRate: completedCapas > 0 ? Math.round((onTimeCapas / completedCapas) * 100) : 100,
        },
        ncBySeverity,
        ncByStatus,
        capas: {
            total: totalCapas,
            completed: completedCapas,
            pending: totalCapas - completedCapas,
        },
        risks: {
            total: risks.length,
            critical: risks.filter((r) => {
                const s = getScore(r.severity);
                const p = getScore(r.probability);
                return (s * p) >= 15; // Adjusted threshold or logic as needed
            }).length,
        }
    });
}, { module: "sgc", action: "view" });
