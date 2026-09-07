import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getCurrentUser, getDashboardFilters, getDashboardOverview, getStoredToken, login, logout, register } from "./services/api";
import type { DashboardFilters, DashboardOverview } from "./types/dashboard";

const nav = ["Overview", "Sales analytics", "Customers", "Products", "Forecasts", "Anomalies", "Reports"];
const colors = ["#7c6cff", "#22c7a8", "#ffb14a", "#f2697c"];
const productName = "VANTAGE";

const moduleDescriptions: Record<string, string> = {
  "Sales analytics": "Explore performance across the active region and category selection.",
  Customers: "Rank customer contribution using the current warehouse slice.",
  Products: "Compare category contribution, momentum, and margin signals.",
  Forecasts: "Project the next seven days from the current revenue run rate.",
  Anomalies: "Flag daily movements that materially differ from the recent average.",
  Reports: "Export the current filtered view for executive review.",
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

function exportReport(overview: DashboardOverview, context: string) {
  const rows = [
    ["Sales analytics report", context],
    ["Generated", overview.generated_at],
    [],
    ["Metric", "Value"],
    ...overview.kpis.map((item) => [item.label, item.display_value]),
    [],
    ["Region", "Revenue", "Share"],
    ...overview.revenue_by_region.map((item) => [item.name, item.value.toFixed(2), `${item.percentage}%`]),
    [],
    ["Category", "Revenue", "Share"],
    ...overview.revenue_by_category.map((item) => [item.name, item.value.toFixed(2), `${item.percentage}%`]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "sales-analytics-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function LoginPage({ onLogin, onRegister }: { onLogin: (email: string, password: string) => Promise<void>; onRegister: (fullName: string, email: string, password: string) => Promise<void> }) {
  const [isSignup, setIsSignup] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try { if (isSignup) await onRegister(fullName, email, password); else await onLogin(email, password); } catch (requestError) { const message = requestError instanceof Error ? requestError.message : ""; setError(message === "Network Error" ? "API unavailable. Start the backend on port 8000 and try again." : message || (isSignup ? "Account creation failed." : "Sign in failed. Check your email and password.")); } finally { setSubmitting(false); }
  };
  return <main className="auth-page"><section className="auth-panel"><div className="auth-brand"><span>V</span> VANTAGE</div><p className="eyebrow">SALES INTELLIGENCE PLATFORM</p><h1>{isSignup ? "Create your workspace" : "Welcome back"}</h1><p className="auth-subtitle">{isSignup ? "Create an analyst account to explore governed sales intelligence." : "Sign in to access your governed sales workspace."}</p><form onSubmit={submit} className="auth-form">{isSignup && <label>Full name<input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Abdul Daff" autoComplete="name" required /></label>}<label>Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? "At least 12 characters" : "Enter your password"} autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 12 : undefined} required /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "Please wait..." : isSignup ? "Create analyst account" : "Sign in to Vantage"}</button></form><button className="auth-toggle" onClick={() => { setIsSignup((value) => !value); setError(""); }}>{isSignup ? "Already have an account? Sign in" : "Need access? Create an account"}</button><small className="auth-foot">Protected workspace · JWT-secured access</small></section></main>;
}

function ModulePage({ module, overview, context, onBack }: { module: string; overview: DashboardOverview; context: string; onBack: () => void }) {
  const trend = overview.revenue_trend;
  const average = trend.length ? trend.reduce((sum, item) => sum + item.revenue, 0) / trend.length : 0;
  const last = trend.at(-1)?.revenue ?? 0;
  const previous = trend.at(-2)?.revenue ?? last;
  const momentum = previous ? ((last - previous) / previous) * 100 : 0;
  const forecast = Array.from({ length: 7 }, (_, index) => ({ day: `Day ${index + 1}`, value: Math.max(0, last * (1 + (momentum / 100) * (index + 1))) }));
  const anomalies = trend.filter((item) => average && Math.abs(item.revenue - average) / average > 0.15);
  const entityItems = module === "Customers" ? overview.top_customers : overview.top_products;

  if (module === "Reports") {
    return <section className="module-page"><div className="module-heading"><div><p className="eyebrow">REPORT CENTER</p><h2>Executive reporting workspace</h2><p className="subtle">Generate a governed snapshot for {context}.</p></div><button className="date-button" onClick={onBack}>Overview</button></div><div className="report-grid"><article className="module-card report-card"><p className="eyebrow">FILTERED PERFORMANCE</p><h2>Ready for review</h2><p>Every metric reflects the active date, customer, region, and category selection.</p><div className="report-preview"><strong>{overview.kpis[0]?.display_value ?? "$0"}</strong><span>Revenue in selection</span><strong>{overview.revenue_trend.length}</strong><span>Daily observations</span><strong>{overview.revenue_by_region.length}</strong><span>Regions represented</span><strong>{overview.revenue_by_category.length}</strong><span>Categories represented</span></div><div className="module-actions"><button className="date-button" onClick={() => exportReport(overview, context)}>Download report CSV</button><button className="text-button" onClick={onBack}>Return to overview</button></div></article><article className="card report-chart"><div className="card-head"><div><h2>Revenue mix</h2><p>Contribution by category</p></div></div><div className="bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={overview.revenue_by_category} layout="vertical" margin={{ left: 8, right: 12 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Bar dataKey="value" fill="#22c7a8" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div></article></div></section>;
  }

  const chartTitle = module === "Sales analytics" ? "Revenue and profit trajectory" : module === "Customers" ? "Top customer accounts" : "Top product contribution";
  return <section className="module-page"><div className="module-heading"><div><p className="eyebrow">{module.toUpperCase()}</p><h2>{module}</h2><p className="subtle">{moduleDescriptions[module]} Context: {context}.</p></div><button className="date-button" onClick={onBack}>Overview</button></div><div className="module-grid">
    {module === "Forecasts" ? <article className="card module-wide"><div className="card-head"><div><h2>Seven-day run-rate projection</h2><p>Momentum model based on the selected daily series</p></div><strong className={momentum >= 0 ? "positive" : "negative"}>{momentum >= 0 ? "+" : ""}{momentum.toFixed(1)}%</strong></div><div className="module-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={forecast}><CartesianGrid stroke="#27304b" vertical={false} /><XAxis dataKey="day" tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Bar dataKey="value" fill="#ffb14a" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="forecast-list">{forecast.map((item) => <div key={item.day}><span>{item.day}</span><i><b style={{ width: `${Math.min(100, Math.max(8, (item.value / Math.max(...forecast.map((entry) => entry.value), 1)) * 100))}%` }} /></i><strong>{formatCurrency(item.value)}</strong></div>)}</div></article> : <>
      <article className="card module-wide"><div className="card-head"><div><h2>{module === "Anomalies" ? "Movement watchlist" : chartTitle}</h2><p>{module === "Anomalies" ? `${anomalies.length} days outside the 15% movement threshold` : "Ranked from the active selection"}</p></div></div>{module === "Sales analytics" && <div className="module-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><CartesianGrid stroke="#27304b" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Area type="monotone" dataKey="revenue" stroke="#7c6cff" fill="#7c6cff" fillOpacity={0.18} /><Area type="monotone" dataKey="profit" stroke="#22c7a8" fill="none" /></AreaChart></ResponsiveContainer></div>}{module === "Anomalies" && <div className="module-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><CartesianGrid stroke="#27304b" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} /><YAxis hide /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Area type="monotone" dataKey="revenue" stroke="#f2697c" fill="#f2697c" fillOpacity={0.16} /></AreaChart></ResponsiveContainer></div>}{module === "Customers" || module === "Products" ? <div className="module-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={entityItems} layout="vertical" margin={{ left: 8, right: 12 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={130} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Bar dataKey="value" fill={module === "Customers" ? "#22c7a8" : "#7c6cff"} radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div> : null}{module === "Anomalies" ? <div className="watchlist">{anomalies.length ? anomalies.slice(-6).reverse().map((item) => <div key={item.date}><span>{item.date}</span><strong className={item.revenue >= average ? "positive" : "negative"}>{formatCurrency(item.revenue)}</strong><small>{item.revenue >= average ? "Above" : "Below"} average by {Math.abs(((item.revenue - average) / average) * 100).toFixed(1)}%</small></div>) : <p className="empty-state">No significant movements in the selected period.</p>}</div> : <div className="rank-list">{(module === "Customers" || module === "Products" ? entityItems : overview.revenue_by_category).slice(0, 6).map((item, index) => <div key={item.name}><span className="rank">{String(index + 1).padStart(2, "0")}</span><span>{item.name}</span><i><b style={{ width: `${Math.min(100, item.percentage * 2)}%` }} /></i><strong>{formatCurrency(item.value)}</strong></div>)}</div>}</article>
      <article className="card module-summary"><p className="eyebrow">SIGNAL SUMMARY</p><strong>{module === "Anomalies" ? anomalies.length : module === "Forecasts" ? formatCurrency(average) : overview.kpis[0]?.display_value}</strong><p>{module === "Anomalies" ? "Flagged observations" : module === "Forecasts" ? "Average daily revenue" : module === "Customers" ? "Revenue from top accounts" : module === "Products" ? "Revenue from leading products" : "Revenue in active slice"}</p><button className="text-button" onClick={() => exportReport(overview, context)}>Export this view</button></article>
    </>}</div></section>;
}

function App() {
  const [session, setSession] = useState<{ name: string; initials: string; role: string } | null | undefined>(() => getStoredToken() ? undefined : null);
  const [overview, setOverview] = useState<DashboardOverview>();
  const [filters, setFilters] = useState<DashboardFilters>({ regions: [], categories: [], customers: [] });
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [customer, setCustomer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeModule, setActiveModule] = useState("Overview");
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [completedRefresh, setCompletedRefresh] = useState(0);
  const refreshing = retryCount !== completedRefresh;
  const invalidDateRange = Boolean(startDate && endDate && startDate > endDate);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    getCurrentUser().then((currentUser) => setSession({ name: currentUser.full_name, initials: currentUser.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: currentUser.role.replaceAll("_", " ") })).catch(() => { logout(); setSession(null); });
  }, []);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    const currentUser = await getCurrentUser();
    setSession({ name: currentUser.full_name, initials: currentUser.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: currentUser.role.replaceAll("_", " ") });
  };

  const handleRegister = async (fullName: string, email: string, password: string) => {
    await register(fullName, email, password);
    const currentUser = await getCurrentUser();
    setSession({ name: currentUser.full_name, initials: currentUser.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role: currentUser.role.replaceAll("_", " ") });
  };

  useEffect(() => { if (!session) return; getDashboardFilters().then(setFilters).catch(() => setFilters({ regions: [], categories: [], customers: [] })); }, [session]);
  useEffect(() => {
    if (!session || invalidDateRange) return;

    const controller = new AbortController();
    getDashboardOverview({
      region: region || undefined,
      category: category || undefined,
      customer: customer || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }, controller.signal).then((data) => { setOverview(data); setError(false); setCompletedRefresh(retryCount); }).catch(() => { if (!controller.signal.aborted) { setError(true); setCompletedRefresh(retryCount); } });
    return () => controller.abort();
  }, [session, region, category, customer, startDate, endDate, invalidDateRange, retryCount]);

  if (session === undefined) return <main className="loading">Checking secure session...</main>;
  if (session === null) return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
  const user = session;
  if (invalidDateRange) return <main className="loading">Start date must be before the end date.</main>;
  if (error) return <main className="loading"><div><strong>Dashboard data could not be loaded.</strong><p>Confirm the API is running, then try again.</p><button className="date-button" onClick={() => setRetryCount((count) => count + 1)}>Retry connection</button></div></main>;
  if (!overview) return <main className="loading">Loading sales intelligence workspace...</main>;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span>V</span> {productName}</div><p className="workspace">SALES INTELLIGENCE</p><nav aria-label="Dashboard sections">{nav.map((item) => <button className={activeModule === item ? "active" : ""} onClick={() => setActiveModule(item)} aria-current={activeModule === item ? "page" : undefined} key={item}><span>{item}</span></button>)}</nav><div className="sidebar-footer"><div className="avatar">{user.initials}</div><div><strong>{user.name}</strong><small>{user.role}</small></div><button className="logout-button" onClick={() => { logout(); setSession(null); }} aria-label="Sign out">Sign out</button></div></aside>
    <main className="content">
      <header><div><p className="eyebrow">{activeModule.toUpperCase()}</p><h1>{activeModule === "Overview" ? `Good morning, ${user.name.split(" ")[0]}` : activeModule}</h1><p className="subtle">{activeModule === "Overview" ? "Review current sales performance and live warehouse results." : moduleDescriptions[activeModule]}</p></div><div className="header-actions"><select className="module-switch" aria-label="Choose dashboard module" value={activeModule} onChange={(event) => setActiveModule(event.target.value)}>{nav.map((item) => <option key={item}>{item}</option>)}</select><span className="selection-status">{overview.data_mode === "warehouse" ? "Live data" : "Preview data"}</span><button className="date-button" onClick={() => setRetryCount((count) => count + 1)} disabled={refreshing} aria-label="Refresh dashboard data">{refreshing ? "Refreshing..." : "Refresh data"}</button>{activeModule === "Overview" && <button className="date-button" onClick={() => exportTrendCsv(overview)}>Export CSV</button>}</div></header>
      {activeModule !== "Overview" ? <ModulePage module={activeModule} overview={overview} context={`${customer || "All customers"} / ${region || "All regions"} / ${category || "All categories"}`} onBack={() => setActiveModule("Overview")} /> : <>
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
