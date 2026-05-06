import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrgNode } from '@/lib/data/hr';

/**
 * Utility to convert an image URL to a Base64 string.
 * Necessary for jsPDF to render images reliably in production.
 */
async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to Base64:', error);
    return null;
  }
}

/**
 * Helper: check if we need a new page and add one if so
 */
function ensureSpace(doc: jsPDF, currentY: number, needed: number, margin: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + needed > pageHeight - 25) {
    doc.addPage();
    return margin;
  }
  return currentY;
}

/**
 * Generates a professional Job Profile PDF for a given organizational node.
 * Follows the original LEC Excel template structure (RRHH-F-01).
 */
export async function generateJobProfilePDF(node: OrgNode) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const logoBase64 = await imageUrlToBase64('/lec_logo_pack/lec_logo_full.png');

  const primaryColor: [number, number, number] = [59, 130, 246];
  const headerColor: [number, number, number] = [15, 23, 42];
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ─── HEADER ───
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, y, 38, 10);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
  doc.text('PERFIL DE PUESTOS', margin + 45, y + 7);

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Revisión: 4', pageWidth - margin, y + 4, { align: 'right' });
  doc.text('RRHH-F-01', pageWidth - margin, y + 8, { align: 'right' });

  y += 14;

  // ISO references
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text('Ref. ISO 9001:2015 – 5.3, 7.1.2, 7.1.6, 7.2', margin, y);
  y += 3.5;
  doc.text('Ref. ISO 21001:2018 – 5.3, 7.1.6.1, 7.1.2.2', margin, y);

  y += 8;

  // ─── INFORMACIÓN GENERAL ───
  autoTable(doc, {
    startY: y,
    head: [[{ content: 'INFORMACIÓN GENERAL', colSpan: 2, styles: { halign: 'left', fillColor: headerColor, textColor: [255, 255, 255] } }]],
    body: [
      ['NOMBRE DEL PUESTO', node.role],
      ['PUESTO AL QUE REPORTA', node.parentId || 'N/A'],
      ['TITULAR ACTUAL', node.name || 'Vacante / Por asignar'],
      ['NIVEL JERÁRQUICO', node.type.toUpperCase()],
      ['ÁREA', node.area],
    ],
    theme: 'grid',
    headStyles: { fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [241, 245, 249] } },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── MISIÓN DEL PUESTO ───
  y = ensureSpace(doc, y, 30, margin);
  autoTable(doc, {
    startY: y,
    head: [[{ content: 'MISIÓN DEL PUESTO', styles: { fillColor: primaryColor, textColor: [255, 255, 255] } }]],
    body: [[node.mission || 'Sin misión definida.']],
    theme: 'grid',
    headStyles: { fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, fontStyle: 'italic' },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── DATOS PERSONALES ───
  y = ensureSpace(doc, y, 25, margin);
  autoTable(doc, {
    startY: y,
    head: [[{ content: 'DATOS PERSONALES', colSpan: 4, styles: { fillColor: headerColor, textColor: [255, 255, 255] } }]],
    body: [
      ['SEXO', node.sex || 'Indistinto', 'AÑOS DE EXPERIENCIA', node.experience || 'N/A'],
      ['DISPONIBILIDAD PARA VIAJAR', node.travel || 'N/A', '', ''],
    ],
    theme: 'grid',
    headStyles: { fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, fillColor: [241, 245, 249] },
      2: { fontStyle: 'bold', cellWidth: 45, fillColor: [241, 245, 249] },
    },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── EDUCACIÓN ───
  y = ensureSpace(doc, y, 25, margin);
  autoTable(doc, {
    startY: y,
    head: [[{ content: 'EDUCACIÓN', colSpan: 2, styles: { fillColor: primaryColor, textColor: [255, 255, 255] } }]],
    body: [
      ['ESCOLARIDAD', node.education || 'N/A'],
      ['ESPECIALIDAD', node.specialty || 'N/A'],
    ],
    theme: 'grid',
    headStyles: { fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, fillColor: [241, 245, 249] } },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── CONOCIMIENTOS ───
  const knowledgeText = node.knowledge || 'N/A';
  y = ensureSpace(doc, y, 20, margin);
  autoTable(doc, {
    startY: y,
    head: [[{ content: 'CONOCIMIENTOS', styles: { fillColor: headerColor, textColor: [255, 255, 255] } }]],
    body: [[knowledgeText]],
    theme: 'grid',
    headStyles: { fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── HABILIDADES ───
  const skillsText = node.skills || 'N/A';
  y = ensureSpace(doc, y, 20, margin);
  autoTable(doc, {
    startY: y,
    head: [[{ content: 'HABILIDADES', styles: { fillColor: primaryColor, textColor: [255, 255, 255] } }]],
    body: [[skillsText]],
    theme: 'grid',
    headStyles: { fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── IDIOMAS ───
  y = ensureSpace(doc, y, 15, margin);
  autoTable(doc, {
    startY: y,
    head: [[{ content: 'IDIOMAS', styles: { fillColor: headerColor, textColor: [255, 255, 255] } }]],
    body: [[node.languages || 'N/A']],
    theme: 'grid',
    headStyles: { fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── RESPONSABILIDADES ───
  const responsibilities = typeof node.responsibilities === 'string'
    ? node.responsibilities.split('\n').filter(r => r.trim())
    : (node.responsibilities || []);

  y = ensureSpace(doc, y, 30, margin);
  autoTable(doc, {
    startY: y,
    head: [[{ content: 'RESPONSABILIDADES', styles: { fillColor: primaryColor, textColor: [255, 255, 255] } }]],
    body: responsibilities.map((res, i) => [`${i + 1}. ${res.trim()}`]),
    theme: 'striped',
    headStyles: { fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: margin, right: margin },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── OTROS ROLES (if available) ───
  // Read from OrgNode extended props if present
  const otherRoles = (node as any).otherRoles;
  if (otherRoles) {
    y = ensureSpace(doc, y, 20, margin);
    autoTable(doc, {
      startY: y,
      head: [[{ content: 'OTROS ROLES QUE PUEDE DESEMPEÑAR', styles: { fillColor: headerColor, textColor: [255, 255, 255] } }]],
      body: [[otherRoles]],
      theme: 'grid',
      headStyles: { fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── ATRIBUTOS DESEADOS (if available) ───
  const attributes = (node as any).attributes;
  if (attributes) {
    y = ensureSpace(doc, y, 20, margin);
    autoTable(doc, {
      startY: y,
      head: [[{ content: 'ATRIBUTOS DESEADOS', styles: { fillColor: primaryColor, textColor: [255, 255, 255] } }]],
      body: [[attributes]],
      theme: 'grid',
      headStyles: { fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ─── FIRMAS ───
  y = ensureSpace(doc, y, 40, margin);
  const sigY = y + 5;
  autoTable(doc, {
    startY: sigY,
    head: [[
      { content: 'REVISADO POR:', styles: { fillColor: [241, 245, 249], textColor: [0, 0, 0] } },
      { content: 'FECHA:', styles: { fillColor: [241, 245, 249], textColor: [0, 0, 0] } },
    ]],
    body: [
      ['', ''],
      [{ content: 'APROBADO POR:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: 'FECHA:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      ['', ''],
      [{ content: 'AUTORIZADO POR:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }, { content: 'FECHA:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }],
      ['', ''],
    ],
    theme: 'grid',
    headStyles: { fontStyle: 'bold', fontSize: 8, fillColor: [241, 245, 249], textColor: [0, 0, 0] },
    bodyStyles: { fontSize: 8, minCellHeight: 12 },
    margin: { left: margin, right: margin },
  });

  // ─── FOOTER ───
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160);
    doc.text(
      `Languages Education Consulting — Perfil de Puesto — Pág. ${i}/${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  const fileName = `Perfil_${node.role.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  return { blob: doc.output('blob'), fileName };
}

/**
 * Generates a Job Profile PDF from the profile view data (used in hr-profiles.tsx).
 */
export async function generateJobProfilePDFFromView(profile: {
  id: string;
  title: string;
  holderName?: string;
  reportsTo: string[];
  mission: string;
  sex?: string;
  experience?: string;
  travel?: string;
  education?: string;
  specialty?: string;
  knowledge?: string;
  skills?: string;
  languages?: string;
  responsibilities: string;
  otherRoles?: string;
  attributes?: string;
  processId?: string;
}) {
  // Map profile view to OrgNode shape for reuse
  const node: OrgNode & { otherRoles?: string; attributes?: string } = {
    id: profile.id,
    role: profile.title,
    name: profile.holderName || 'Vacante / Por asignar',
    area: profile.id,
    parentId: profile.reportsTo?.[0] || undefined,
    type: 'operative',
    mission: profile.mission,
    sex: profile.sex,
    experience: profile.experience,
    travel: profile.travel,
    education: profile.education,
    specialty: profile.specialty,
    knowledge: profile.knowledge,
    skills: profile.skills,
    languages: profile.languages,
    responsibilities: profile.responsibilities,
    processId: profile.processId,
    otherRoles: profile.otherRoles,
    attributes: profile.attributes,
  };

  return generateJobProfilePDF(node);
}

/**
 * Uploads a generated PDF to the Supabase Storage bucket 'sgc-documents'.
 */
export async function uploadPDFToSGC(supabase: any, blob: Blob, path: string) {
  const { data, error } = await supabase.storage
    .from('sgc-documents')
    .upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) throw error;
  return data;
}
