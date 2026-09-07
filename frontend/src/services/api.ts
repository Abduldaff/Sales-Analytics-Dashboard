import axios from "axios";
import type { DashboardFilters, DashboardOverview } from "../types/dashboard";

const tokenKey = "vantage_access_token";
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1", timeout: 10_000 });
api.interceptors.request.use((config) => {
	const token = localStorage.getItem(tokenKey);
	if (token) config.headers.Authorization = `Bearer ${token}`;
	return config;
});
export const getDashboardOverview = async (params?: { region?: string; category?: string; customer?: string; start_date?: string; end_date?: string }, signal?: AbortSignal): Promise<DashboardOverview> => (await api.get("/dashboard/overview", { params, signal })).data;
export const getDashboardFilters = async (): Promise<DashboardFilters> => (await api.get("/dashboard/filters")).data;
export const login = async (email: string, password: string): Promise<string> => {
	const body = new URLSearchParams({ username: email, password });
	const response = await api.post("/auth/token", body, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
	localStorage.setItem(tokenKey, response.data.access_token);
	return response.data.access_token;
};
export const register = async (fullName: string, email: string, password: string): Promise<string> => {
	const response = await api.post("/auth/register", { full_name: fullName, email, password });
	localStorage.setItem(tokenKey, response.data.access_token);
	return response.data.access_token;
};
export const getCurrentUser = async (): Promise<{ email: string; full_name: string; role: string }> => (await api.get("/auth/me")).data;
export const logout = () => localStorage.removeItem(tokenKey);
export const getStoredToken = () => localStorage.getItem(tokenKey);
