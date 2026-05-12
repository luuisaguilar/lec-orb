/** Roles that can manage funds, replenishments, and budget catalog (matches DB fn_is_finance_admin intent). */
export function isFinanceAdminRole(role: string | null | undefined): boolean {
    return role === "admin" || role === "finance_admin";
}
