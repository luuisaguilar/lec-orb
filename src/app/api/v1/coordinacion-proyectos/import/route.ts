import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-handler";
import { logAudit } from "@/lib/audit/log";
import { CP_MODULE, importBodySchema, programProjectCreateSchema, examSalesLineCreateSchema } from "@/lib/coordinacion-proyectos/schemas";

function firstDayOfMonthFromLabel(label: unknown, defaultYear: number): string | null {
    if (typeof label !== "string") return null;
    const t = label.trim().toUpperCase();
    const months: Record<string, string> = {
        ENE: "01",
        FEB: "02",
        MAR: "03",
        ABR: "04",
        MAY: "05",
        JUN: "06",
        JUL: "07",
        AGO: "08",
        SEP: "09",
        OCT: "10",
        NOV: "11",
        DIC: "12",
    };
    const key = t.slice(0, 3);
    const mo = months[key];
    if (!mo) return null;
    return `${defaultYear}-${mo}-01`;
}

function num(v: unknown): number | null {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export const POST = withAuth(async (req, { supabase, user, member }) => {
    const body = await req.json();
    const parsed = importBodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const year = new Date().getFullYear();
    let inserted = 0;
    const errors: string[] = [];

    if (parsed.data.entity === "program_projects") {
        const { data: depts } = await supabase
            .from("lec_cp_departments")
            .select("id, name")
            .eq("org_id", member.org_id);
        const deptByName = new Map((depts ?? []).map((d: { id: string; name: string }) => [d.name.toLowerCase(), d.id]));

        const { data: products } = await supabase
            .from("lec_cp_product_services")
            .select("id, name")
            .eq("org_id", member.org_id);
        const prodByName = new Map(
            (products ?? []).map((d: { id: string; name: string }) => [d.name.toLowerCase(), d.id]),
        );

        for (const raw of parsed.data.rows) {
            const r = raw as Record<string, unknown>;
            const mes = r.Mes ?? r.mes ?? r.MES;
            const period_month = firstDayOfMonthFromLabel(mes, year) ?? `${year}-01-01`;
            const deptName = String(r.Departamento ?? r.departamento ?? "").trim();
            const department_id = deptByName.get(deptName.toLowerCase()) ?? null;
            const desc = String(r.Descripción ?? r.descripcion ?? r.description ?? "").trim();
            if (!desc) {
                errors.push("Fila sin descripción");
                continue;
            }
            const client_type = String(r["Tipo de cliente"] ?? r.client_type ?? "Institución").trim() || "Institución";
            const prodLabel = String(r["Producto/Servicio"] ?? r.product_service ?? "").trim();
            const product_service_id = prodByName.get(prodLabel.toLowerCase()) ?? null;
            const beneficiaries_count = Math.round(num(r.Beneficiados ?? r.beneficiaries) ?? 0);
            const revenue_amount = num(r.Ingreso ?? r.ingreso ?? r.revenue);
            const sizeRaw = String(r.Tamaño ?? r.size ?? "").trim().toUpperCase();
            const size_code = ["MI", "C", "M", "G"].includes(sizeRaw) ? sizeRaw : null;

            const candidate = programProjectCreateSchema.safeParse({
                period_month,
                department_id,
                description: desc,
                client_type,
                product_service_id,
                product_service_label: product_service_id ? null : prodLabel || null,
                beneficiaries_count,
                revenue_amount,
                size_code,
            });
            if (!candidate.success) {
                errors.push(candidate.error.issues.map((i) => i.message).join("; "));
                continue;
            }

            const row = {
                ...candidate.data,
                org_id: member.org_id,
                created_by: user.id,
                updated_by: user.id,
            };
            const { error } = await supabase.from("lec_program_projects").insert(row);
            if (error) errors.push(error.message);
            else inserted += 1;
        }
    } else {
        const { data: types } = await supabase.from("lec_cp_exam_types").select("id, name").eq("org_id", member.org_id);
        const typeByName = new Map((types ?? []).map((d: { id: string; name: string }) => [d.name.toLowerCase(), d.id]));

        for (const raw of parsed.data.rows) {
            const r = raw as Record<string, unknown>;
            const mes = r.exam_month ?? r.Mes ?? r.mes;
            let exam_month: string | null = null;
            if (typeof mes === "string" && /^\d{4}-\d{2}-\d{2}/.test(mes)) {
                exam_month = mes.slice(0, 10);
            } else {
                exam_month = firstDayOfMonthFromLabel(mes, year) ?? `${year}-01-01`;
            }
            const candidateName = String(
                r.candidate_or_institution ??
                    r["Nombre del candidato / institución"] ??
                    r.Nombre ??
                    "",
            ).trim();
            if (!candidateName) {
                errors.push("Fila sin candidato/institución");
                continue;
            }
            const examLabel = String(r["Examen solicitado"] ?? r.examen ?? r.exam_type_label ?? "").trim();
            const exam_type_id = typeByName.get(examLabel.toLowerCase()) ?? null;

            const candidate = examSalesLineCreateSchema.safeParse({
                exam_month,
                candidate_or_institution: candidateName,
                exam_type_id,
                exam_type_label: exam_type_id ? null : examLabel || null,
                quantity: Math.round(num(r["Cantidad aplicados"] ?? r.quantity) ?? 1) || 1,
                amount: num(r["Monto acumulado"] ?? r.monto ?? r.amount),
                confirmation: (r.Confirmación ?? r.confirmacion ?? null) as string | null,
                email: (r["Correo electrónico"] ?? r.email ?? null) as string | null,
                phone: (r.Celular ?? r.phone ?? null) as string | null,
            });
            if (!candidate.success) {
                errors.push(candidate.error.issues.map((i) => i.message).join("; "));
                continue;
            }

            const row = {
                ...candidate.data,
                org_id: member.org_id,
                created_by: user.id,
                updated_by: user.id,
            };
            const { error } = await supabase.from("lec_exam_sales_lines").insert(row);
            if (error) errors.push(error.message);
            else inserted += 1;
        }
    }

    if (inserted > 0) {
        await logAudit(supabase, {
            org_id: member.org_id,
            table_name: parsed.data.entity === "program_projects" ? "lec_program_projects" : "lec_exam_sales_lines",
            record_id: "bulk-import",
            action: "INSERT",
            new_data: { import: true, entity: parsed.data.entity, inserted } as Record<string, unknown>,
            performed_by: user.id,
        });
    }

    return NextResponse.json({ inserted, errors: errors.slice(0, 50) });
}, { module: CP_MODULE, action: "edit" });
