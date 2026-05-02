import jsPDF from 'jspdf';
import 'jspdf-autotable';
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
 * Generates a professional Job Profile PDF for a given organizational node.
 */
export async function generateJobProfilePDF(node: OrgNode) {
  // Initialize jsPDF (A4 format)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 1. ASYNC ASSETS LOADING
  // In a real environment, this would be an absolute URL or a path from public
  const logoBase64 = await imageUrlToBase64('/lec_logo_pack/lec_logo_full.png');

  // 2. STYLING CONFIG
  const primaryColor = [59, 130, 246]; // #3b82f6
  const secondaryColor = [15, 23, 42]; // #0f172a
  
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = margin;

  // 3. HEADER SECTION
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, currentY, 40, 10);
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('SISTEMA DE GESTIÓN DE CALIDAD', pageWidth - margin, currentY + 5, { align: 'right' });
  doc.text('RRHH-F-01 | v2.1', pageWidth - margin, currentY + 10, { align: 'right' });

  currentY += 25;

  // Title Box
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(margin, currentY, pageWidth - (margin * 2), 15, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('FICHA TÉCNICA DE PERFIL DE PUESTO', pageWidth / 2, currentY + 10, { align: 'center' });

  currentY += 25;

  // 4. GENERAL INFORMATION TABLE
  (doc as any).autoTable({
    startY: currentY,
    head: [[{ content: 'IDENTIFICACIÓN DEL PUESTO', colSpan: 2, styles: { halign: 'left', fillColor: primaryColor } }]],
    body: [
      ['Título del Puesto:', node.role],
      ['Titular Actual:', node.name],
      ['Área / Departamento:', node.area],
      ['Nivel Jerárquico:', node.type.toUpperCase()],
      ['Reporta a:', 'Dirección General'], // In a real app, this would be dynamic
    ],
    theme: 'grid',
    headStyles: { fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 5. MISSION SECTION
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('MISIÓN DEL PUESTO', margin, currentY);
  
  currentY += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(60);
  const missionLines = doc.splitTextToSize(node.mission || 'Sin misión definida.', pageWidth - (margin * 2));
  doc.text(missionLines, margin, currentY);

  currentY += (missionLines.length * 5) + 10;

  // 6. RESPONSIBILITIES TABLE
  const responsibilities = typeof node.responsibilities === 'string' 
    ? node.responsibilities.split('\n').filter(r => r.trim()) 
    : (node.responsibilities || []);

  (doc as any).autoTable({
    startY: currentY,
    head: [[{ content: 'FUNCIONES Y RESPONSABILIDADES CLAVE', styles: { fillColor: primaryColor } }]],
    body: responsibilities.map((res, i) => [`${i + 1}. ${res.trim()}`]),
    theme: 'striped',
    headStyles: { fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // 7. REQUIREMENTS GRID
  (doc as any).autoTable({
    startY: currentY,
    head: [[{ content: 'PERFIL Y REQUISITOS', colSpan: 2, styles: { fillColor: primaryColor } }]],
    body: [
      ['Educación:', node.education || 'N/A'],
      ['Experiencia:', node.experience || 'N/A'],
      ['Idiomas:', node.languages || 'N/A'],
      ['Conocimientos:', node.knowledge || 'N/A'],
    ],
    theme: 'grid',
    headStyles: { fontStyle: 'bold', fontSize: 10 },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    margin: { left: margin, right: margin }
  });

  // 8. FOOTER / SIGNATURES
  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(200);
  doc.line(margin, footerY, 80, footerY);
  doc.line(pageWidth - margin - 60, footerY, pageWidth - margin, footerY);
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Firma del Interesado', 50, footerY + 5, { align: 'center' });
  doc.text('Autorización Dirección', pageWidth - 50, footerY + 5, { align: 'center' });

  // 9. OUTPUT
  const fileName = `Perfil_${node.role.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  return {
    blob: doc.output('blob'),
    fileName
  };
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
