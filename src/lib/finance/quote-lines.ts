export type FinanceLineInput = {
    quantity: number;
    unit_price: number;
    /** IVA fraction, default 0.16 */
    tax_rate?: number;
};

/** Sum line subtotals (qty × price) and tax (subtotal × tax_rate) from client-provided lines. */
export function totalsFromFinanceLines(items: FinanceLineInput[]): { subtotal: number; taxes: number } {
    let subtotal = 0;
    let taxes = 0;
    for (const it of items) {
        const q = Number(it.quantity);
        const p = Number(it.unit_price);
        if (!Number.isFinite(q) || !Number.isFinite(p) || q < 0 || p < 0) continue;
        const rate = it.tax_rate != null && Number.isFinite(Number(it.tax_rate)) ? Number(it.tax_rate) : 0.16;
        const lineSub = Math.round(q * p * 100) / 100;
        const lineTax = Math.round(lineSub * rate * 100) / 100;
        subtotal += lineSub;
        taxes += lineTax;
    }
    return {
        subtotal: Math.round(subtotal * 100) / 100,
        taxes: Math.round(taxes * 100) / 100,
    };
}
