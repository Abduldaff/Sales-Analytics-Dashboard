export interface KpiMetric { label: string; value: number; display_value: string; change_percent?: number; trend: string }
export interface TrendPoint { date: string; revenue: number; profit: number }
export interface BreakdownItem { name: string; value: number; percentage: number }
export interface DashboardOverview { data_mode: string; kpis: KpiMetric[]; revenue_trend: TrendPoint[]; revenue_by_region: BreakdownItem[]; revenue_by_category: BreakdownItem[]; generated_at: string }
export interface DashboardFilters { regions: string[]; categories: string[]; customers: string[] }
