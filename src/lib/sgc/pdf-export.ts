"use client";

import jsPDF from "jspdf";
import "jspdf-autotable";

type MaybeString = string | null | undefined;

type AuditCheckExport = {
  clause_id: string;
  title: string;
  question: string;
  status: string;
  notes?: MaybeString;
  next_audit_date?: MaybeString;
};

type AuditManagerExport = {
  full_name?: MaybeString;
} | null | undefined;

export type AuditPdfPayload = {
  ref: string;
  title: string;
  state: string;
  audit_date?: MaybeString;
  created_at?: MaybeString;
  audit_manager?: AuditManagerExport;
  checks?: AuditCheckExport[];
  cars?: Array<{
    car_code: string;
    finding_clause_id: string;
    finding_title: string;
    description: string;
    status: string;
    root_cause?: MaybeString;
    action_plan?: MaybeString;
  }>;
};

export type ReviewPdfPayload = {
  ref: string;
  title: string;
  state: string;
  review_date?: MaybeString;
  policy?: MaybeString;
  changes?: MaybeString;
  conclusion?: MaybeString;
};

function fmtDate(value?: MaybeString) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function safeFilenamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function exportAuditToPdf(audit: AuditPdfPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INFORME DE AUDITORÍA INTERNA SGC", margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Referencia: ${audit.ref}`, margin, 22);

  let y = 38;
  doc.setTextColor(22, 22, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(audit.title, margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fecha: ${fmtDate(audit.audit_date ?? audit.created_at)}`, margin, y);
  doc.text(`Estatus: ${audit.state}`, margin + 60, y);
  doc.text(`Responsable: ${audit.audit_manager?.full_name || "No asignado"}`, margin + 100, y);
  y += 10;

  // Checklist Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("1. RESULTADOS DEL CHECKLIST", margin, y);
  y += 2;

  const checks = audit.checks ?? [];
  const checkRows = checks.map((check) => [
    check.clause_id || "-",
    check.title || "-",
    check.status || "-",
    (check.notes || "").trim() || "-",
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [["Cláusula", "Hallazgo", "Estatus", "Notas"]],
    body: checkRows.length ? checkRows : [["-", "Sin checklist registrado", "-", "-"]],
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // CARs (Findings) Table
  if (audit.cars && audit.cars.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("2. SOLICITUDES DE ACCIÓN CORRECTIVA (CAR)", margin, y);
    y += 2;

    const carRows = audit.cars.map(car => [
      car.car_code,
      `Cláusula ${car.finding_clause_id}: ${car.finding_title}`,
      car.status,
      car.description
    ]);

    (doc as any).autoTable({
      startY: y,
      head: [["Código", "Referencia", "Estado", "Descripción"]],
      body: carRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [153, 27, 27] }, // Dark red for CARs
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Detailed CAR Analysis if available
    audit.cars.forEach(car => {
      if (car.root_cause || car.action_plan) {
        if (y > 230) {
          doc.addPage();
          y = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`Análisis CAR: ${car.car_code}`, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        if (car.root_cause) {
          doc.text("Causa Raíz:", margin, y);
          const rcLines = doc.splitTextToSize(car.root_cause, pageWidth - margin * 2 - 20);
          doc.text(rcLines, margin + 20, y);
          y += rcLines.length * 4 + 4;
        }
        if (car.action_plan) {
          doc.text("Plan Acción:", margin, y);
          const apLines = doc.splitTextToSize(car.action_plan, pageWidth - margin * 2 - 20);
          doc.text(apLines, margin + 20, y);
          y += apLines.length * 4 + 6;
        }
      }
    });
  }

  const file = `AUD_${safeFilenamePart(audit.ref)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(file);
}

export type NcPdfPayload = {
  ref: string;
  title: string;
  status: string;
  description: string;
  analysis?: MaybeString;
  action_plan?: MaybeString;
  evaluation?: MaybeString;
  severity?: MaybeString;
  stage?: MaybeString;
  created_at: string;
  updated_at: string;
  origins?: string[];
  causes?: string[];
  actions?: Array<{ ref: string; title: string; status: string }>;
};

export function exportNcToPdf(nc: NcPdfPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header Background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REPORTE DE NO CONFORMIDAD SGC", margin, 14);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Referencia: ${nc.ref}`, margin, 22);

  let y = 38;
  
  // Title
  doc.setTextColor(22, 22, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(nc.title || "Sin título", margin, y);
  y += 7;

  // Metadata Grid
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Estado: ${nc.status}`, margin, y);
  doc.text(`Severidad: ${nc.severity || "N/A"}`, margin + 60, y);
  doc.text(`Etapa: ${nc.stage || "N/A"}`, margin + 120, y);
  y += 5;
  doc.text(`Creado: ${fmtDate(nc.created_at)}`, margin, y);
  doc.text(`Actualizado: ${fmtDate(nc.updated_at)}`, margin + 60, y);
  y += 10;

  // Sections
  const drawSection = (title: string, content: string) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title, margin, y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(content || "Sin contenido registrado.", pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 8;
  };

  drawSection("1. DESCRIPCIÓN DEL HALLAZGO", nc.description);
  drawSection("2. ANÁLISIS DE CAUSA RAÍZ", nc.analysis || "");
  drawSection("3. PLAN DE ACCIÓN / CORRECCIONES", nc.action_plan || "");
  drawSection("4. EVALUACIÓN DE EFICACIA / CIERRE", nc.evaluation || "");

  // Origins and Causes
  if ((nc.origins?.length ?? 0) > 0 || (nc.causes?.length ?? 0) > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("5. CLASIFICACIÓN", margin, y);
    y += 5;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    if (nc.origins?.length) {
      doc.text(`Orígenes: ${nc.origins.join(", ")}`, margin, y);
      y += 5;
    }
    if (nc.causes?.length) {
      doc.text(`Causas: ${nc.causes.join(", ")}`, margin, y);
      y += 5;
    }
    y += 5;
  }

  // Actions Table
  if (nc.actions && nc.actions.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("6. ACCIONES CAPA VINCULADAS", margin, y);
    y += 2;

    (doc as any).autoTable({
      startY: y,
      head: [["Ref", "Título", "Estado"]],
      body: nc.actions.map(a => [a.ref, a.title, a.status]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [51, 65, 85] }
    });
  }

  const fileName = `NC_${safeFilenamePart(nc.ref)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

export function exportReviewToPdf(review: ReviewPdfPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ACTA DE REVISION DIRECTIVA SGC", margin, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Referencia: ${review.ref}`, margin, 22);

  let y = 38;
  doc.setTextColor(22, 22, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(review.title, margin, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Fecha: ${fmtDate(review.review_date)}`, margin, y);
  doc.text(`Estatus: ${review.state}`, margin + 60, y);
  y += 7;

  const sections: Array<[string, string]> = [
    ["1. Politica y Objetivos", (review.policy || "").trim() || "Sin contenido"],
    ["2. Cambios y Desempeno", (review.changes || "").trim() || "Sin contenido"],
    ["3. Conclusiones", (review.conclusion || "").trim() || "Sin contenido"],
  ];

  sections.forEach(([title, content]) => {
    if (y > 250) {
      doc.addPage();
      y = 18;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, margin, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(content, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4.5 + 6;
  });

  const file = `REV_${safeFilenamePart(review.ref)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(file);
}
