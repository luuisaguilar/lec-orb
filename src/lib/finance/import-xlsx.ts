import * as XLSX from "xlsx";

/**
 * Parses a legacy Excel file with sheets LEC, DISCOVER, URUS.
 * @param file File object from input
 * @param orgs Map of organization names to IDs
 * @param categories Map of category names to IDs
 */
export async function parseLegacyExcel(file: File, orgs: Record<string, string>, categories: Record<string, string>): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                
                const allMovements: any[] = [];
                const expectedSheets = ["LEC", "DISCOVER", "URUS"];

                workbook.SheetNames.forEach(sheetName => {
                    const normalizedSheet = sheetName.toUpperCase();
                    if (expectedSheets.includes(normalizedSheet)) {
                        const worksheet = workbook.Sheets[sheetName];
                        const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                        
                        // Map rows to movements
                        const movements = json.map(row => {
                            // Logic depends on the exact columns of legacy Excel, 
                            // typically: Fecha, Concepto, Categoría, Entrada, Salida
                            const type = row.Entrada > 0 ? "INCOME" : "EXPENSE";
                            const amount = type === "INCOME" ? row.Entrada : row.Salida;
                            
                            return {
                                org_id: orgs[normalizedSheet],
                                concept: row.Concepto,
                                categoryName: row.Categoría != null ? String(row.Categoría).trim() : "",
                                category_id: categories[row.Categoría],
                                amount: Number(amount),
                                date: row.Fecha,
                                type
                            };
                        }).filter(m => m.concept && m.amount > 0);
                        
                        allMovements.push(...movements);
                    }
                });

                resolve(allMovements);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}
