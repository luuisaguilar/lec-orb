/**
 * Finance Types for LEC (Caja Chica & Presupuesto)
 * Based on Migration: 20240311_petty_cash_and_budget.sql
 */

export type MovementType = "INCOME" | "EXPENSE";

export interface PettyCashCategory {
    id: string;
    name: string;
    slug: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
}

export interface PettyCashSettings {
    id: string;
    org_id: string;
    year: number;
    initial_balance: number;
    created_at: string;
    updated_at: string;
    updated_by?: string;
}

export interface PettyCashMovement {
    id: string;
    org_id: string;
    category_id: string;
    date: string;
    concept: string;
    type: MovementType;
    amount: number;
    partial_amount?: number;
    receipt_url?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?: string;
    deleted_at?: string;
    
    // Joined data from Supabase (defaults to table name)
    petty_cash_categories?: PettyCashCategory;
}

export interface Budget {
    id: string;
    org_id: string;
    category_id: string;
    month: number;
    year: number;
    amount: number;
    updated_at: string;
    updated_by?: string;
    
    // Joined data
    petty_cash_categories?: PettyCashCategory;
}

export interface BudgetComparative {
    category_id: string;
    category_name: string;
    budgeted: number;
    actual: number;
    variation: number;
    variation_pct: number;
}

export interface BudgetEntry {
    org_id: string;
    category_id: string;
    month: number;
    year: number;
    amount: number;
}

export interface FinanceSummary {
    initial_balance: number;
    total_incomes: number;
    total_expenses: number;
    current_balance: number;
}
