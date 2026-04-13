import * as XLSX from "xlsx";

/**
 * Exports movement data to a .xlsx file.
 * @param data Array of movement objects
 * @param fileName Name of the resulting file (without extension)
 */
export function exportToXLSX(data: any[], fileName: string = "caja-chica-report") {
    // 1. Map data to friendly column names
    const worksheetData = data.map((m, index) => ({
        "#": index + 1,
        "Fecha": m.date,
        "Empresa": m.organizations?.name || m.organizations?.slug || m.org_id, 
        "Concepto": m.concept,
        "Categoría": m.petty_cash_categories?.name || "Sin categoría",
        "Notas": m.notes || "",
        "Tipo": m.type === "INCOME" ? "Ingreso" : "Egreso",
        "Monto (MXN)": Number(m.amount)
    }));

    // 2. Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimientos");

    // 3. Trigger download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
