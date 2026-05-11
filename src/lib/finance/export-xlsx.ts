import * as XLSX from "xlsx";

/**
 * Exports movement data to a .xlsx file.
 * @param data Array of movement objects
 * @param fileName Name of the resulting file (without extension)
 */
export function exportToXLSX(data: any[], fileName: string = "caja-chica-report") {
    // 1. Map data to friendly column names
    const worksheetData = data.map((m, index) => {
        const isV2 = m.movement_date != null && (m.amount_in != null || m.amount_out != null);
        const catV2 =
            m.budget_lines?.budget_items?.budget_categories?.name ||
            m.budget_lines?.budget_items?.name;
        const income = isV2 ? Number(m.amount_in || 0) : m.type === "INCOME" ? Number(m.amount) : 0;
        const expense = isV2 ? Number(m.amount_out || 0) : m.type === "EXPENSE" ? Number(m.amount) : 0;
        return {
            "#": index + 1,
            "Fecha": isV2 ? m.movement_date : m.date,
            "Empresa": m.organizations?.name || m.organizations?.slug || m.org_id,
            "Concepto": m.concept,
            "Categoría": catV2 || m.petty_cash_categories?.name || "Sin categoría",
            "Notas": m.notes || m.metadata?.notes || "",
            "Tipo": income > 0 ? "Ingreso" : "Egreso",
            "Entrada (MXN)": income > 0 ? income : "",
            "Salida (MXN)": expense > 0 ? expense : "",
        };
    });

    // 2. Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimientos");

    // 3. Trigger download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
