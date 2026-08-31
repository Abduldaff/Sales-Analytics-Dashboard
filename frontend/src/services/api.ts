import axios from "axios";
import type { DashboardFilters, DashboardOverview } from "../types/dashboard";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1", timeout: 10_000 });
export const getDashboardOverview = async (params?: { region?: string; category?: string; customer?: string }): Promise<DashboardOverview> => (await api.get("/dashboard/overview", { params })).data;
export const getDashboardFilters = async (): Promise<DashboardFilters> => (await api.get("/dashboard/filters")).data;
