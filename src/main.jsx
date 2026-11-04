import React, { useState, useEffect, Component, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  LayoutDashboard,
  Users,
  Clock3,
  CalendarDays,
  Wallet,
  Building2,
  ChartNoAxesCombined,
  Settings,
  Search,
  Bell,
  ChevronRight,
  ArrowUpRight,
  Plus,
  LogOut,
  Menu,
  X,
  Check,
  ArrowRight,
  ShieldCheck,
  BriefcaseBusiness,
  Ellipsis,
  Download,
  ChevronLeft,
  Eye,
  EyeOff,
  Monitor,
  RefreshCw,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { api, get, errorMessage, setCsrf } from "./api";
import "./styles.css";
import Activation, { InviteEmployee } from "./activation";
import OrganizationPage from "./organization";
import LeavePage from "./leaves";
import Setup from "./setup";
import EmployeeImport from "./features/employee-import";
import NotificationCenter from "./components/NotificationCenter";
import AttendanceWorkspace, { PunchCard } from "./features/attendance";
import { SettingsWorkspace, Reports, AuditLogs } from "./features/admin";
import ProfilePage, { EmployeeOrganization } from "./features/profile";
const ShiftSwaps = lazy(() => import("./features/shift-swaps"));
const TeamCalendar = lazy(() => import("./features/calendar"));
const LeaveAdjustments = lazy(() => import("./features/leave-adjustments"));
const DashboardInsights = lazy(() => import("./features/dashboard-insights"));
const FinancialOperations = lazy(
  () => import("./features/financial-operations"),
);
const GrowthPage = lazy(() => import("./features/growth"));
const ExtendedPage = lazy(() => import("./features/extended"));
const OperationsPage = lazy(() => import("./features/operations"));
const PayrollPage = lazy(() => import("./features/payroll"));
const RecoveryPage = lazy(() => import("./features/recovery"));

const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false },
  },
});
const money = (n) => new Intl.NumberFormat("en-IN").format(n);
const initials = (name) =>
  name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase() || "A";
const allowed = (user, p) =>
  user?.permissions?.includes("*") || user?.permissions?.includes(p);
const fullName = (e) => `${e.firstName} ${e.lastName}`.trim();
class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>Something went wrong</h1>
        <button onClick={() => location.reload()}>Reload application</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Notice({ error }) {
  return (
    <div className="notice" role="alert">
      {errorMessage(error)}
    </div>
  );
}
function Loading() {
  return (
    <div className="loading" aria-label="Loading">
      <div />
      <div />
      <div />
    </div>
  );
}
function Empty({
  title = "Nothing here yet",
  text = "Your records will appear here as your team gets started.",
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <BriefcaseBusiness size={25} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Avatar({ name }) {
  return <span className="avatar">{initials(name)}</span>;
}
function Badge({ children }) {
  return (
    <span
      className={`badge ${String(children).toLowerCase().replaceAll(" ", "-")}`}
    >
      <i />
      {children}
    </span>
  );
}

function Login() {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [visible, setVisible] = useState(false);
  const mutation = useMutation({
    mutationFn: (data) => api.post("/auth/login", data),
    onSuccess: async (result) => {
      setCsrf(result.data.data.csrfToken);
      await qc.invalidateQueries({ queryKey: ["session"] });
    },
  });
  return (
    <div className="login">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <Monitor />
          </span>
          <div>
            ABCO<span>COMPUTERS</span>
          </div>
        </div>
        <div>
          <span className="eyebrow light">PEOPLE. PURPOSE. PROGRESS.</span>
          <h1>
            A better workday
            <br />
            starts here.
          </h1>
          <p>
            One connected workspace for your people,
            <br />
            your operations, and everything in between.
          </p>
          <div className="login-art">
            <div className="art-card">
              <span>
                <Users size={20} /> Your people, connected
              </span>
              <div className="art-avatars">
                {["HR", "TM", "IT", "AB"].map((n) => (
                  <Avatar name={n} key={n} />
                ))}
              </div>
              <div className="art-line" />
              <div className="art-line short" />
              <small>
                <ShieldCheck size={15} /> Built around your team
              </small>
            </div>
            <div className="art-orbit" />
          </div>
        </div>
        <small>
          © {new Date().getFullYear()} ABCO Computers. All rights reserved.
        </small>
      </section>
      <section className="login-form">
        <div className="login-inner">
          <span className="eyebrow">ABCO HRMS</span>
          <h2>Welcome back</h2>
          <p>Sign in to your workspace to get started.</p>
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
            <label>
              Work email
              <input
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                {...register("email", { required: "Enter your email" })}
              />
            </label>
            {errors.email && (
              <small className="field-error">{errors.email.message}</small>
            )}
            <label>
              Password
              <div className="password">
                <input
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register("password", { required: true })}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={visible ? "Hide password" : "Show password"}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <NavLink
              className="text-button forgot-password"
              to="/forgot-password"
            >
              Forgot password?
            </NavLink>
            <label>
              Authenticator or recovery code (if enabled)
              <input autoComplete="one-time-code" {...register("totp")} />
            </label>
            <div className="secure-note">
              <ShieldCheck size={15} /> Your session is securely protected
            </div>
            {mutation.isError && <Notice error={mutation.error} />}
            <button
              className="primary login-submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Signing in…" : "Sign in to workspace"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="login-help">
            Need access? Contact your HR administrator.
          </p>
        </div>
        <small className="login-footer">
          A little less admin. A lot more human.
        </small>
      </section>
    </div>
  );
}

const nav = [
  {
    section: "WORKSPACE",
    items: [
      ["/", "Overview", LayoutDashboard],
      ["/profile", "My profile", Users],
      ["/employees", "Employees", Users, "employee.read"],
      ["/attendance", "Attendance", Clock3],
      ["/shift-swaps", "Shift swaps", Clock3],
      ["/calendar", "Team calendar", CalendarDays],
      ["/leaves", "Time off", CalendarDays],
      ["/leave-adjustments", "Leave adjustments", CalendarDays],
      ["/holidays", "Holiday calendar", CalendarDays],
    ],
  },
  {
    section: "WORK & COMMUNICATION",
    items: [
      ["/tasks", "Tasks & work", BriefcaseBusiness],
      ["/daily-reports", "Daily work reports", ChartNoAxesCombined],
      ["/announcements", "Announcements", Bell],
      ["/helpdesk", "Helpdesk", ShieldCheck],
      ["/notifications", "Notifications", Bell],
    ],
  },
  {
    section: "PEOPLE OPERATIONS",
    items: [
      ["/jobs", "Job openings", BriefcaseBusiness, "recruitment.manage"],
      ["/candidates", "Candidate pipeline", Users, "recruitment.manage"],
      ["/onboarding", "Onboarding", Users],
      ["/performance", "Performance", ChartNoAxesCombined],
      ["/peer-feedback", "360° feedback", Users],
      ["/improvement-plans", "Improvement plans", ChartNoAxesCombined],
      [
        "/appraisal-recommendations",
        "Appraisal recommendations",
        ChartNoAxesCombined,
      ],
      ["/assets", "Assets & equipment", Monitor],
      ["/exits", "Exit & offboarding", LogOut],
      ["/documents", "Documents", Download],
      [
        "/document-templates",
        "Document templates",
        Download,
        "documents.manage",
      ],
      ["/generated-letters", "Official letters", Download, "documents.manage"],
      ["/asset-maintenance", "Asset maintenance", Monitor, "assets.manage"],
    ],
  },
  {
    section: "ORGANIZATION",
    items: [
      ["/organization", "Organization", Building2, "organization.manage"],
      ["/payroll", "Payroll & payslips", Wallet],
      ["/loans", "Loans & advances", Wallet],
      ["/loan-policies", "Loan policies", Settings, "payroll.process"],
      ["/final-settlements", "Final settlements", Wallet],
      [
        "/reports",
        "Reports & analytics",
        ChartNoAxesCombined,
        "reports.export",
      ],
      ["/audit", "Audit history", ShieldCheck, "audit.read"],
    ],
  },
  {
    section: "GROWTH & PLANNING",
    items: [
      ["/projects", "Projects", BriefcaseBusiness],
      ["/timesheets", "Timesheets", Clock3],
      ["/training", "Training programs", Users],
      ["/training-enrollments", "Learning progress", ChartNoAxesCombined],
      ["/skills", "Skills & capability", ChartNoAxesCombined],
      ["/expenses", "Expenses", Wallet],
      ["/expense-policies", "Expense policies", Settings, "expenses.manage"],
      ["/travel", "Travel & visits", Building2],
      ["/surveys", "Surveys", Users],
      ["/recognitions", "Recognition", ShieldCheck],
      ["/suggestions", "Ideas & suggestions", Bell],
    ],
  },
  {
    section: "APPROVALS",
    items: [
      ["/approvals", "Approval inbox", ShieldCheck],
      [
        "/approval-workflows",
        "Approval workflows",
        Settings,
        "approvals.manage",
      ],
      ["/approval-delegations", "Delegations", Users, "leave.approve"],
    ],
  },
  { section: "ADMINISTRATION", items: [["/settings", "Settings", Settings]] },
];
function Shell({ user }) {
  const brand = useQuery({
    queryKey: ["company-brand"],
    queryFn: () => get("/company-brand"),
  });
  const [open, setOpen] = useState(false),
    [notifications, setNotifications] = useState(false);
  const location = useLocation(),
    navigate = useNavigate(),
    qc = useQueryClient();
  const [search, setSearch] = useState("");
  const current =
    nav.flatMap((n) => n.items).find((n) => n[0] === location.pathname)?.[1] ||
    "Workspace";
  const [loggingOut, setLoggingOut] = useState(false),
    [logoutError, setLogoutError] = useState(null);
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await api.post("/auth/logout");
      await qc.cancelQueries();
      setCsrf(null);
      qc.clear();
      window.location.replace("/");
    } catch (error) {
      if (error.response?.status === 401) {
        setCsrf(null);
        qc.clear();
        window.location.replace("/");
        return;
      }
      setLogoutError(error);
      setLoggingOut(false);
    }
  }
  return (
    <div className="app">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <NavLink to="/" className="brand">
          <span className="brand-icon">
            {brand.data?.data.logo ? (
              <img
                src={brand.data.data.logo}
                alt="Company logo"
                style={{ width: 32, height: 32, objectFit: "contain" }}
              />
            ) : (
              <Monitor size={23} />
            )}
          </span>
          <div>
            ABCO<span>COMPUTERS</span>
          </div>
          <small>HRMS</small>
        </NavLink>
        <div className="workspace-label">
          <span className="workspace-symbol">A</span>
          <div>
            ABCO workspace<small>People & operations</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <nav>
          {nav.map((group) => (
            <div className="nav-group" key={group.section}>
              <p>{group.section}</p>
              {group.items
                .filter((item) => !item[3] || allowed(user, item[3]))
                .map(([path, label, Icon]) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === "/"}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={19} />
                    <span>{label}</span>
                    {path === "/" && <span className="active-dot" />}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="support">
            <span className="support-icon">
              <ShieldCheck size={19} />
            </span>
            <strong>Made for your people</strong>
            <p>One team. A better workday.</p>
          </div>
          <div className="sidebar-user">
            <Avatar name={user.name} />
            <div>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </div>
            <button
              className="icon-button"
              onClick={logout}
              disabled={loggingOut}
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {open && <div className="overlay" onClick={() => setOpen(false)} />}
      <div className="workspace">
        <header className="header">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setOpen(!open)}
              aria-label="Open navigation"
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{current}</strong>
          </div>
          <div className="header-right">
            {allowed(user, "employee.read") && (
              <form
                className="global-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate(`/employees?q=${encodeURIComponent(search)}`);
                }}
              >
                <Search size={16} />
                <input
                  aria-label="Search employees"
                  placeholder="Search anything…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <kbd>↵</kbd>
              </form>
            )}
            <NotificationCenter />
            <span className="header-divider" />
            <Avatar name={user.name} />
            <button
              className="secondary logout-button"
              onClick={logout}
              disabled={loggingOut}
            >
              <LogOut size={16} />
              <span>{loggingOut ? "Logging out?" : "Logout"}</span>
            </button>
          </div>
        </header>
        <main className="main">
          {logoutError && <Notice error={logoutError} />}
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route index element={<Dashboard user={user} />} />
              <Route
                path="employees"
                element={
                  allowed(user, "employee.read") ? (
                    <Employees user={user} />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              <Route
                path="attendance"
                element={<AttendanceWorkspace user={user} />}
              />
              <Route path="leaves" element={<LeavePage user={user} />} />
              <Route
                path="leave-adjustments"
                element={<LeaveAdjustments user={user} />}
              />
              <Route
                path="settings"
                element={
                  <SettingsWorkspace user={user}>
                    <SettingsPage user={user} />
                  </SettingsWorkspace>
                }
              />
              <Route path="organization" element={<OrganizationPage />} />
              <Route path="payroll" element={<PayrollPage user={user} />} />
              <Route path="reports" element={<Reports user={user} />} />
              {[
                "projects",
                "timesheets",
                "training",
                "training-enrollments",
                "skills",
                "expenses",
                "expense-policies",
                "travel",
                "surveys",
                "recognitions",
                "suggestions",
                "approval-workflows",
                "approvals",
                "approval-delegations",
              ].map((module) => (
                <Route
                  key={module}
                  path={module}
                  element={<ExtendedPage module={module} user={user} />}
                />
              ))}
              <Route path="calendar" element={<TeamCalendar />} />
              {[
                "peer-feedback",
                "improvement-plans",
                "appraisal-recommendations",
                "document-templates",
                "generated-letters",
                "asset-maintenance",
              ].map((module) => (
                <Route
                  key={module}
                  path={module}
                  element={<GrowthPage module={module} user={user} />}
                />
              ))}
              {["loans", "loan-policies", "final-settlements"].map((module) => (
                <Route
                  key={module}
                  path={module}
                  element={<FinancialOperations module={module} user={user} />}
                />
              ))}
              <Route path="shift-swaps" element={<ShiftSwaps user={user} />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="audit" element={<AuditLogs user={user} />} />
              {[
                "tasks",
                "daily-reports",
                "announcements",
                "helpdesk",
                "holidays",
                "jobs",
                "candidates",
                "onboarding",
                "performance",
                "assets",
                "exits",
                "documents",
                "notifications",
              ].map((module) => (
                <Route
                  key={module}
                  path={module}
                  element={<OperationsPage module={module} user={user} />}
                />
              ))}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
          <footer className="page-footer">
            <span>© {new Date().getFullYear()} ABCO Computers</span>
            <span>
              <span className="tiny-dot" /> Your people. Our priority.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}
function Dashboard({ user }) {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => get("/dashboard"),
  });
  const navigate = useNavigate();
  if (isPending) return <Loading />;
  if (error)
    return (
      <>
        <Notice error={error} />
        <button onClick={() => refetch()}>Retry</button>
      </>
    );
  const d = data.data;
  const departments = d.departments.map((x) => ({
    name: x._id || "Unassigned",
    value: x.value,
  }));
  const colors = ["#173B68", "#4779a7", "#8baecb", "#c2d6e7", "#e5edf5"];
  return (
    <>
      <PageHeader
        eyebrow="YOUR WORKSPACE AT A GLANCE"
        title={`Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${user.name.split(" ")[0]} ☀`}
        description="Here's what's happening with your people today."
      >
        <span className="date-chip">
          <CalendarDays size={16} />
          {new Intl.DateTimeFormat("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          }).format(new Date())}
        </span>
        {allowed(user, "employee.create") && (
          <button
            className="primary"
            onClick={() => navigate("/employees?new=1")}
          >
            <Plus size={17} />
            Add employee
          </button>
        )}
      </PageHeader>
      <section className="welcome-banner">
        <div>
          <span className="banner-kicker">
            <span /> PEOPLE FIRST, ALWAYS
          </span>
          <h2>A great team starts with a great experience.</h2>
          <p>Keep your people connected and every workday running smoothly.</p>
          <button
            onClick={() =>
              navigate(
                allowed(user, "employee.read") ? "/employees" : "/attendance",
              )
            }
          >
            Let's make it a productive day <ArrowRight size={16} />
          </button>
        </div>
        <div className="banner-graphic" aria-hidden="true">
          <div className="graphic-window">
            <div className="graphic-dots">
              <i />
              <i />
              <i />
            </div>
            <div className="graphic-person">
              <Users size={32} />
            </div>
            <div className="graphic-bars">
              <i />
              <i />
            </div>
            <span className="graphic-check">
              <Check size={18} />
            </span>
          </div>
          <span className="floating-tag">
            <span className="tiny-dot" /> All together, better.
          </span>
        </div>
      </section>
      <div className="section-top">
        <h2>People overview</h2>
        <span>
          Live workspace data <span className="tiny-dot" />
        </span>
      </div>
      <section className="stats">
        {[
          [
            d.broad ? "Total employees" : "My profile",
            d.total,
            Users,
            "Your people, in one place",
          ],
          [
            "Active employees",
            d.active,
            BriefcaseBusiness,
            "Currently active in the team",
          ],
          ["Present today", d.present, Clock3, "Attendance recorded today"],
          [
            "Pending time off",
            d.pending,
            CalendarDays,
            "Requests awaiting review",
          ],
        ].map(([title, value, Icon, note], i) => (
          <article className="stat" key={title}>
            <div className="stat-top">
              <span>{title}</span>
              <span className={`stat-icon tone-${i}`}>
                <Icon size={19} />
              </span>
            </div>
            <strong>{money(value)}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel team-panel">
          <div className="panel-title">
            <div>
              <h2>{d.broad ? "Your growing team" : "My employment"}</h2>
              <p>
                {d.broad
                  ? "A quick look at the latest additions."
                  : "Your current employee profile."}
              </p>
            </div>
            {allowed(user, "employee.read") && (
              <button
                className="text-button"
                onClick={() => navigate("/employees")}
              >
                View all <ArrowUpRight size={15} />
              </button>
            )}
          </div>
          {d.recent.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>DEPARTMENT</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recent.map((e) => (
                    <tr key={e._id}>
                      <td>
                        <div className="person">
                          <Avatar name={fullName(e)} />
                          <div>
                            <strong>{fullName(e)}</strong>
                            <small>{e.designation}</small>
                          </div>
                        </div>
                      </td>
                      <td>{e.department}</td>
                      <td>
                        <Badge>{e.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Meet your future team"
              text="Add your first employee to start building your directory."
            />
          )}
        </section>
        <section className="panel department-panel">
          <div className="panel-title">
            <div>
              <h2>Team distribution</h2>
              <p>People across departments</p>
            </div>
            <Building2 size={18} color="#94a3b8" />
          </div>
          {departments.length ? (
            <>
              <div className="donut">
                <ResponsiveContainer width="100%" height={175}>
                  <PieChart>
                    <Pie
                      data={departments}
                      dataKey="value"
                      innerRadius={59}
                      outerRadius={78}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {departments.map((e, i) => (
                        <Cell key={e.name} fill={colors[i % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{d.total}</strong>
                  <small>Total people</small>
                </div>
              </div>
              <div className="legend">
                {departments.map((e, i) => (
                  <div key={e.name}>
                    <span>
                      <i style={{ background: colors[i % colors.length] }} />
                      {e.name}
                    </span>
                    <strong>{e.value}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Empty
              title="Your teams, visualized"
              text="Department data appears as employees are added."
            />
          )}
        </section>
        <section className="panel quick-panel">
          <div className="panel-title">
            <div>
              <h2>A little less admin</h2>
              <p>Your everyday essentials, one click away.</p>
            </div>
          </div>
          <div className="quick-actions">
            {[
              [
                "/attendance",
                Clock3,
                "Track attendance",
                "Make every workday count",
              ],
              [
                "/leaves",
                CalendarDays,
                "Manage time off",
                "A little time to recharge",
              ],
              [
                "/employees",
                Users,
                "People directory",
                "Get to know your team",
              ],
            ]
              .filter(
                ([path]) =>
                  path !== "/employees" || allowed(user, "employee.read"),
              )
              .map(([path, Icon, title, text]) => (
                <button key={path} onClick={() => navigate(path)}>
                  <span className="quick-icon">
                    <Icon size={20} />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{text}</small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))}
          </div>
        </section>
        <section className="panel today-panel">
          <div className="panel-title">
            <div>
              <h2>My workday</h2>
              <p>A good day starts with a check-in.</p>
            </div>
            <span className="live-tag">
              <i />
              LIVE
            </span>
          </div>
          <PunchCard compact />
        </section>
      </div>
      <Suspense fallback={<Loading />}>
        <DashboardInsights />
      </Suspense>
    </>
  );
}

function Employees({ user }) {
  const location = useLocation(),
    qc = useQueryClient();
  const params = new URLSearchParams(location.search);
  const [search, setSearch] = useState(params.get("q") || ""),
    [debounced, setDebounced] = useState(search),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState(params.has("new") ? {} : null),
    [importing, setImporting] = useState(false),
    [assigning, setAssigning] = useState(null),
    [selected, setSelected] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const { data, isPending, error } = useQuery({
    queryKey: ["employees", debounced, status, page],
    queryFn: () =>
      get(
        `/employees?search=${encodeURIComponent(debounced)}&status=${status}&page=${page}`,
      ),
  });
  const archive = useMutation({
    mutationFn: (id) => api.post(`/employees/${id}/archive`),
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries();
    },
  });
  return (
    <>
      <PageHeader
        eyebrow="PEOPLE & CULTURE"
        title="Employee directory"
        description="Your people are your greatest strength. Get to know them."
      >
        {allowed(user, "employee.create") && (
          <>
            <button className="secondary" onClick={() => setImporting(true)}>
              Import CSV
            </button>
            <button className="primary" onClick={() => setEditing({})}>
              <Plus size={17} />
              Add employee
            </button>
          </>
        )}
      </PageHeader>
      <section className="panel directory">
        <div className="directory-head">
          <div className="tabs">
            <button
              className={!status ? "selected" : ""}
              onClick={() => {
                setStatus("");
                setPage(1);
              }}
            >
              All employees <span>{data?.meta.total ?? "—"}</span>
            </button>
            {["Active", "Probation", "Archived"].map((s) => (
              <button
                key={s}
                className={status === s ? "selected" : ""}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="search-input">
            <Search size={17} />
            <input
              placeholder="Search by name, department, email…"
              aria-label="Search directory"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {isPending ? (
          <Loading />
        ) : error ? (
          <Notice error={error} />
        ) : data.data.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>EMPLOYEE</th>
                    <th>EMPLOYEE ID</th>
                    <th>DEPARTMENT</th>
                    <th>JOINING DATE</th>
                    <th>STATUS</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((e) => (
                    <tr key={e._id}>
                      <td>
                        <button
                          className="person person-button"
                          onClick={() => setSelected(e)}
                        >
                          <Avatar name={fullName(e)} />
                          <span>
                            <strong>{fullName(e)}</strong>
                            <small>{e.email}</small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className="employee-code">{e.code}</span>
                      </td>
                      <td>
                        <strong className="cell-title">{e.department}</strong>
                        <small className="cell-sub">{e.designation}</small>
                      </td>
                      <td>
                        {new Date(e.joiningDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <Badge>{e.status}</Badge>
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`View ${fullName(e)}`}
                          onClick={() => setSelected(e)}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                Showing {(page - 1) * 12 + 1}–
                {Math.min(page * 12, data.meta.total)} of {data.meta.total}{" "}
                employees
              </span>
              <div>
                <button
                  className="secondary"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>
                <span>{page}</span>
                <button
                  className="secondary"
                  disabled={page >= data.meta.pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <Empty
            title={
              search
                ? "No matching employees"
                : "Your people journey starts here"
            }
            text={
              search
                ? "Try another name, department or email."
                : "Add your first employee to bring your workspace to life."
            }
          />
        )}
      </section>
      {importing && <EmployeeImport onClose={() => setImporting(false)} />}
      {editing && (
        <EmployeeForm employee={editing} onClose={() => setEditing(null)} />
      )}
      {assigning && (
        <EmployeeOrganization
          employee={assigning}
          onClose={() => setAssigning(null)}
        />
      )}
      {selected && (
        <Modal title="Employee profile" onClose={() => setSelected(null)}>
          <div className="profile-heading">
            <Avatar name={fullName(selected)} />
            <h2>{fullName(selected)}</h2>
            <p>{selected.designation}</p>
            <Badge>{selected.status}</Badge>
          </div>
          <dl className="profile-details">
            {[
              ["Employee ID", selected.code],
              ["Email", selected.email],
              ["Department", selected.department],
              ["Branch", selected.branch],
              ["Employment type", selected.employmentType],
              ["Phone", selected.phone || "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {allowed(user, "employee.create") && (
            <InviteEmployee key={selected._id} employee={selected} />
          )}
          {archive.isError && <Notice error={archive.error} />}
          <div className="form-footer">
            {allowed(user, "employee.update") && (
              <button
                className="secondary"
                onClick={() => {
                  setAssigning(selected);
                  setSelected(null);
                }}
              >
                Assign organization
              </button>
            )}
            {allowed(user, "employee.archive") &&
              selected.status !== "Archived" && (
                <button
                  className="danger"
                  disabled={archive.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Archive ${fullName(selected)}? Their linked account will be disabled.`,
                      )
                    )
                      archive.mutate(selected._id);
                  }}
                >
                  Archive employee
                </button>
              )}
            {allowed(user, "employee.update") &&
              selected.status !== "Archived" && (
                <button
                  className="primary"
                  onClick={() => {
                    setEditing(selected);
                    setSelected(null);
                  }}
                >
                  Edit profile
                </button>
              )}
          </div>
        </Modal>
      )}
    </>
  );
}
function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const previous = document.activeElement;
    const dialog = document.querySelector("dialog");
    dialog?.showModal();
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <dialog className="modal" onCancel={onClose}>
      <div className="modal-title">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function EmployeeForm({ employee, onClose }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      ...employee,
      joiningDate:
        employee.joiningDate?.slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
    },
  });
  const mutation = useMutation({
    mutationFn: (values) =>
      employee._id
        ? api.patch(`/employees/${employee._id}`, values)
        : api.post("/employees", values),
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
  });
  const fields = [
    ["firstName", "First name", "text"],
    ["lastName", "Last name", "text"],
    ["email", "Work email", "email"],
    ["phone", "Phone number", "tel"],
    ["department", "Department", "text"],
    ["designation", "Designation", "text"],
    ["branch", "Branch", "text"],
    ["joiningDate", "Joining date", "date"],
  ];
  return (
    <Modal
      title={employee._id ? "Edit employee" : "Welcome someone new"}
      onClose={onClose}
    >
      <p className="modal-description">
        A few details to get their journey started.
      </p>
      <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <div className="form-grid">
          {fields.map(([key, label, type]) => (
            <label key={key}>
              {label}
              <input
                type={type}
                {...register(key, {
                  required: key !== "phone",
                  maxLength: 100,
                })}
              />
              {errors[key] && (
                <small className="field-error">This field is required</small>
              )}
            </label>
          ))}
          <label>
            Employment type
            <select {...register("employmentType")}>
              {["Full time", "Part time", "Contract", "Internship"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select {...register("status")}>
              <option>Active</option>
              <option>Probation</option>
            </select>
          </label>
        </div>
        {mutation.isError && <Notice error={mutation.error} />}
        <div className="form-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving…"
              : employee._id
                ? "Save changes"
                : "Add employee"}
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SettingsPage({ user }) {
  const { register, handleSubmit, reset } = useForm();
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values) => api.post("/auth/change-password", values),
    onSuccess: () => {
      setCsrf(null);
      reset();
      qc.clear();
      window.location.assign("/");
    },
  });
  return (
    <>
      <PageHeader
        eyebrow="YOUR WORKSPACE"
        title="Account settings"
        description="Manage your account and keep your access secure."
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <h2>Profile & access</h2>
          <div className="person">
            <Avatar name={user.name} />
            <div>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
          </div>
          <dl className="profile-details">
            <div>
              <dt>Role</dt>
              <dd>{user.role}</dd>
            </div>
            <div>
              <dt>Session</dt>
              <dd>Secure · expires after 8 hours</dd>
            </div>
          </dl>
        </section>
        <section className="panel settings-panel">
          <h2>Change password</h2>
          <p>
            Use at least 12 characters. You will sign in again after changing
            it.
          </p>
          <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
            <label>
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                {...register("currentPassword")}
              />
            </label>
            <label>
              New password
              <input
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
                {...register("password")}
              />
            </label>
            {mutation.isError && <Notice error={mutation.error} />}
            <button className="primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}

function App() {
  const location = useLocation();
  const { data, isPending, error } = useQuery({
    queryKey: ["session"],
    queryFn: () => get("/auth/me"),
    retry: false,
  });
  useEffect(() => {
    if (data) setCsrf(data.data.csrfToken);
  }, [data]);
  if (location.pathname === "/activate") return <Activation />;
  if (location.pathname === "/setup") return <Setup />;
  if (["/forgot-password", "/reset-password"].includes(location.pathname))
    return (
      <Suspense fallback={<Loading />}>
        <RecoveryPage reset={location.pathname === "/reset-password"} />
      </Suspense>
    );
  if (isPending)
    return (
      <div className="boot">
        <Monitor size={36} />
        <p>Opening your workspace…</p>
      </div>
    );
  if (error && error.response?.status !== 401)
    return (
      <div className="boot">
        <h2>Workspace unavailable</h2>
        <Notice error={error} />
        <p>Start MongoDB and the backend, then refresh this page.</p>
        <button
          className="primary"
          onClick={() => client.invalidateQueries({ queryKey: ["session"] })}
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  return data ? <Shell user={data.data} /> : <Login />;
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
