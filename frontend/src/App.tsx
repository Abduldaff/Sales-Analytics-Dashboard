import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDashboardFilters, getDashboardOverview } from "./services/api";
import type { DashboardFilters, DashboardOverview } from "./types/dashboard";

const nav = ["Overview", "Sales analytics", "Customers", "Products", "Forecasts", "Anomalies", "Reports"];
const colors = ["#7c6cff", "#22c7a8", "#ffb14a", "#f2697c"];

const moduleDescriptions: Record<string, string> = {
  "Sales analytics": "Explore performance across the active region and category selection.",
  Customers: "Customer intelligence, segmentation, lifetime value, and churn risk will appear here.",
  Products: "Compare product contribution, margin, units sold, and returns.",
  Forecasts: "Forecast jobs and confidence bands will be available after model training.",
  Anomalies: "Surface unusual sales movements and transactions for review.",
  Reports: "Create and export executive, regional, product, and customer reports.",
};

function exportTrendCsv(overview: DashboardOverview) {
  const rows = ["date,revenue,profit", ...overview.revenue_trend.map((item) => `${item.date},${item.revenue},${item.profit}`)];
  const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "sales-revenue-trend.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [overview, setOverview] = useState<DashboardOverview>();
  const [filters, setFilters] = useState<DashboardFilters>({ regions: [], categories: [], customers: [] });
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [customer, setCustomer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeModule, setActiveModule] = useState("Overview");
  const [error, setError] = useState(false);

  useEffect(() => { getDashboardFilters().then(setFilters).catch(() => setFilters({ regions: [], categories: [], customers: [] })); }, []);
  useEffect(() => {
    setError(false);
    if (startDate && endDate && startDate > endDate) {
      setError(true);
      return;
    }

    getDashboardOverview({
      region: region || undefined,
      category: category || undefined,
      customer: customer || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }).then(setOverview).catch(() => setError(true));
  }, [region, category, customer, startDate, endDate]);

  if (error) return <main className="loading">{startDate && endDate && startDate > endDate ? "Start date must be before the end date." : "Dashboard data could not be loaded. Confirm the API is running on port 8000."}</main>;
  if (!overview) return <main className="loading">Loading sales intelligence workspace...</main>;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span>A</span> AXIS</div><p className="workspace">SALES INTELLIGENCE</p><nav>{nav.map((item) => <button className={activeModule === item ? "active" : ""} onClick={() => setActiveModule(item)} aria-current={activeModule === item ? "page" : undefined} key={item}><span>{item}</span></button>)}</nav><div className="sidebar-footer"><div className="avatar">AK</div><div><strong>Alex Kim</strong><small>Sales Operations</small></div></div></aside>
    <main className="content">
      <header><div><p className="eyebrow">{activeModule.toUpperCase()}</p><h1>{activeModule === "Overview" ? "Good morning, Alex" : activeModule}</h1><p className="subtle">{activeModule === "Overview" ? "Review current sales performance and live warehouse results." : moduleDescriptions[activeModule]}</p></div><div className="header-actions"><button className="date-button">Current selection</button>{activeModule === "Overview" && <button className="date-button" onClick={() => exportTrendCsv(overview)}>Export CSV</button>}</div></header>
      {activeModule !== "Overview" ? <section className="module-page"><div className="module-card"><p className="eyebrow">ACTIVE DATA CONTEXT</p><h2>{customer || "All customers"} / {region || "All regions"} / {category || "All categories"}</h2><p>This module is connected to the same governed dashboard filters. Its detailed API and ML workflows are the next implementation layer.</p><div className="module-stats">{overview.kpis.map((kpi) => <div key={kpi.label}><small>{kpi.label}</small><strong>{kpi.display_value}</strong></div>)}</div><button className="date-button" onClick={() => setActiveModule("Overview")}>Back to overview</button></div></section> : <>
      <section className="filter-bar" aria-label="Dashboard filters"><label>Customer<select value={customer} onChange={(event) => setCustomer(event.target.value)}><option value="">All customers</option>{filters.customers.map((item) => <option key={item}>{item}</option>)}</select></label><label>Region<select value={region} onChange={(event) => setRegion(event.target.value)}><option value="">All regions</option>{filters.regions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{filters.categories.map((item) => <option key={item}>{item}</option>)}</select></label><div className="date-range"><label>From<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>To<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div><button onClick={() => { setRegion(""); setCategory(""); setCustomer(""); setStartDate(""); setEndDate(""); }} disabled={!region && !category && !customer && !startDate && !endDate}>Reset filters</button></section>
      {overview.data_mode === "preview" && <div className="preview">Preview mode: PostgreSQL is unavailable or has not been loaded. Generate and load data to activate live analytics.</div>}
      <section className="kpis">{overview.kpis.map((kpi) => <article className="kpi" key={kpi.label}><div className="kpi-label">{kpi.label}<span>...</span></div><strong>{kpi.display_value}</strong>{kpi.change_percent !== undefined && <p className={kpi.trend === "up" ? "positive" : "negative"}>{kpi.change_percent}% <em>vs. prior period</em></p>}</article>)}</section>
      <section className="grid two-one"><article className="card trend-card"><div className="card-head"><div><h2>Revenue performance</h2><p>Daily revenue and profit</p></div></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={overview.revenue_trend}><defs><linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7c6cff" stopOpacity={0.35}/><stop offset="100%" stopColor="#7c6cff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#27304b" vertical={false}/><XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString("en", { weekday: "short" })} tickLine={false} axisLine={false}/><YAxis tickFormatter={(value) => `$${value / 1000}k`} tickLine={false} axisLine={false}/><Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`}/><Area type="monotone" dataKey="revenue" stroke="#9487ff" strokeWidth={3} fill="url(#revenue)"/></AreaChart></ResponsiveContainer></div></article><article className="card target"><div className="card-head"><div><h2>Data source</h2><p>Analytics serving mode</p></div></div><div className="gauge"><div><b>{overview.data_mode === "warehouse" ? "LIVE" : "DEMO"}</b><span>{overview.generated_at}</span></div></div><p>{overview.data_mode === "warehouse" ? "Metrics are calculated from the sales warehouse." : "Load generated data to activate the warehouse."}</p></article></section>
      <section className="grid split"><article className="card"><div className="card-head"><div><h2>Revenue by region</h2><p>Contribution to total revenue</p></div></div><div className="region-layout"><div className="donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={overview.revenue_by_region} dataKey="value" innerRadius={52} outerRadius={76} paddingAngle={4}>{overview.revenue_by_region.map((_, index) => <Cell key={index} fill={colors[index]}/>)}</Pie><Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`}/></PieChart></ResponsiveContainer></div><div className="legend">{overview.revenue_by_region.map((item, index) => <p key={item.name}><i style={{ background: colors[index] }}/><span>{item.name}</span><b>{item.percentage}%</b></p>)}</div></div></article><article className="card"><div className="card-head"><div><h2>Category performance</h2><p>Revenue by product category</p></div></div><div className="bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.revenue_by_category} layout="vertical" margin={{ left: 10 }}><XAxis type="number" hide/><YAxis dataKey="name" type="category" width={85} tickLine={false} axisLine={false}/><Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`}/><Bar dataKey="value" radius={[0, 5, 5, 0]} fill="#7c6cff"/></BarChart></ResponsiveContainer></div></article></section>
      </>}
    </main>
  </div>;
}

export default App;
