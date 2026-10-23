import {
  createBrowserRouter,
  isRouteErrorResponse,
  Link,
  useRouteError,
} from "react-router";
import { WelcomePage } from "./screens/welcome/WelcomePage";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./screens/dashboard/DashboardPage";
import { dashboardLoader, dashboardSummaryLoader } from "./screens/dashboard/loader";
import { ApiError } from "./api/client";
import { AuthLayout } from "./screens/auth/AuthLayout";
import { LoginPage } from "./screens/auth/LoginPage";
import { RegisterPage } from "./screens/auth/RegisterPage";
import { homeAuthLoader } from "./screens/auth/loader";
import {
  loginAction,
  logoutAction,
  registerAction,
} from "./screens/auth/action";
import { StaffPage } from "./screens/staff/StaffPage";
import { staffLoader, staffDetailLoader } from "./screens/staff/loader";
import { staffAction } from "./screens/staff/action";
import { ProfilePage } from "./screens/profile/ProfilePage";
import { profileLoader } from "./screens/profile/loader";
import { profileAction } from "./screens/profile/action";
import { BusinessPage } from "./screens/business/BusinessPage";
import { businessLoader } from "./screens/business/loader";
import { businessAction } from "./screens/business/action";
import { CustomersPage } from "./routes/customers";
import { customersLoader } from "./screens/customers/loader";
import { customersAction } from "./screens/customers/action";
import { ReceivablesPage } from "./routes/receivables";
import { receivablesLoader } from "./screens/receivables/loader";
import { receivablesAction } from "./screens/receivables/action";
import { PromisesPage } from "./routes/promises";
import { promisesLoader } from "./screens/promises/loader";
import { promisesAction } from "./screens/promises/action";
import { FollowUpsPage } from "./routes/follow-ups";
import { followUpsLoader } from "./screens/follow-ups/loader";
import { followUpsAction } from "./screens/follow-ups/action";

function InitialLoadingPage() {
  return (
    <main className="grid min-h-screen place-content-center bg-quest-background p-8 font-quest-body text-quest-text" role="status">
      Loading CollectFlow…
    </main>
  );
}

function UnavailablePage() {
  return (
    <main className="grid min-h-screen place-content-center gap-6 bg-quest-background p-8 text-center font-quest-body text-quest-text">
      <h1 className="font-quest-heading text-2xl">This page is unavailable</h1>
      <Link
        className="text-quest-accent-border underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
        to="/"
      >
        Back to CollectFlow
      </Link>
    </main>
  );
}

function AppErrorPage() {
  const error = useRouteError();
  const status =
    error instanceof ApiError
      ? error.status
      : isRouteErrorResponse(error)
      ? error.status
      : 0;
  const forbidden = status === 403;
  const missing = status === 404;
  return (
    <main className="grid min-h-screen place-content-center gap-6 bg-quest-background p-8 text-center font-quest-body text-quest-text">
      <h1 className="font-quest-heading text-2xl">
        {forbidden
          ? "You cannot open this page"
          : missing
          ? "This page was not found"
          : "The workspace is unavailable"}
      </h1>
      <p className="text-quest-muted">
        {forbidden
          ? "Ask your manager if you need access."
          : missing
          ? "Check the link and try again."
          : "Please try again in a moment."}
      </p>
      <button type="button" className="app-primary-button" onClick={() => window.location.reload()}>Try again</button>
      <Link
        to="/dashboard"
        className="text-quest-accent-border underline underline-offset-4"
      >
        Back to dashboard
      </Link>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: WelcomePage,
    loader: homeAuthLoader,
    HydrateFallback: InitialLoadingPage,
    action: logoutAction,
    ErrorBoundary: UnavailablePage,
  },
  {
    Component: AuthLayout,
    HydrateFallback: InitialLoadingPage,
    ErrorBoundary: UnavailablePage,
    children: [
      {
        path: "/login",
        Component: LoginPage,
        action: loginAction,
      },
      { path: "/register", Component: RegisterPage, action: registerAction },
    ],
  },
  {
    Component: AppLayout,
    loader: dashboardLoader,
    HydrateFallback: InitialLoadingPage,
    ErrorBoundary: AppErrorPage,
    children: [
      { path: "/dashboard", Component: DashboardPage, loader: dashboardSummaryLoader, action: logoutAction },
      { path: "/customers", Component: CustomersPage, loader: customersLoader, action: customersAction },
      { path: "/customers/new", lazy: async () => ({ Component: (await import("./routes/customer-form")).AddCustomerPage }) },
      { path: "/customers/:id", lazy: async () => ({ Component: (await import("./routes/customer-details")).CustomerDetailsPage }) },
      { path: "/customers/:id/edit", lazy: async () => ({ Component: (await import("./routes/customer-form")).EditCustomerPage }) },
      { path: "/receivables", Component: ReceivablesPage, loader: receivablesLoader, action: receivablesAction },
      { path: "/receivables/new", lazy: async () => ({ Component: (await import("./routes/receivable-form")).AddReceivablePage }) },
      { path: "/receivables/:id/edit", lazy: async () => ({ Component: (await import("./routes/receivable-form")).EditReceivablePage }) },
      { path: "/promises", Component: PromisesPage, loader: promisesLoader, action: promisesAction },
      { path: "/promises/new", lazy: async () => ({ Component: (await import("./routes/promise-form")).AddPromisePage }) },
      { path: "/promises/:id/edit", lazy: async () => ({ Component: (await import("./routes/promise-form")).EditPromisePage }) },
      { path: "/payments", lazy: async () => ({ Component: (await import("./routes/payments")).PaymentsPage }) },
      { path: "/payments/new", lazy: async () => ({ Component: (await import("./routes/payment-form")).RecordPaymentPage }) },
      { path: "/payments/:id/edit", lazy: async () => ({ Component: (await import("./routes/payment-form")).EditPaymentPage }) },
      { path: "/follow-ups", Component: FollowUpsPage, loader: followUpsLoader, action: followUpsAction },
      { path: "/follow-ups/new", lazy: async () => ({ Component: (await import("./routes/follow-up-form")).AddFollowUpPage }) },
      { path: "/follow-ups/:id/edit", lazy: async () => ({ Component: (await import("./routes/follow-up-form")).EditFollowUpPage }) },
      {
        path: "/staff",
        Component: StaffPage,
        loader: staffLoader,
        action: staffAction,
      },
      { path: "/staff/:id", loader: staffDetailLoader },
      {
        path: "/settings/profile",
        Component: ProfilePage,
        loader: profileLoader,
        action: profileAction,
      },
      {
        path: "/settings/business",
        Component: BusinessPage,
        loader: businessLoader,
        action: businessAction,
      },
    ],
  },
  { path: "*", Component: UnavailablePage },
]);
