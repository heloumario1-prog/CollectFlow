import {
  createBrowserRouter,
  isRouteErrorResponse,
  Link,
  useRouteError,
} from "react-router";
import { WelcomePage } from "./screens/welcome/WelcomePage";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./screens/dashboard/DashboardPage";
import { dashboardLoader } from "./screens/dashboard/loader";
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
import { AddCustomerPage, EditCustomerPage } from "./routes/customer-form";
import { CustomerDetailsPage } from "./routes/customer-details";
import { ReceivablesPage } from "./routes/receivables";
import { AddReceivablePage, EditReceivablePage } from "./routes/receivable-form";
import { PromisesPage } from "./routes/promises";
import { AddPromisePage, EditPromisePage } from "./routes/promise-form";
import { PaymentsPage } from "./routes/payments";
import { RecordPaymentPage, EditPaymentPage } from "./routes/payment-form";
import { FollowUpsPage } from "./routes/follow-ups";
import { AddFollowUpPage, EditFollowUpPage } from "./routes/follow-up-form";

function UnavailablePage() {
  return (
    <main className="grid min-h-screen place-content-center gap-6 bg-quest-background p-8 text-center font-quest-body text-quest-parchment">
      <h1 className="font-quest-heading text-2xl">This page is unavailable</h1>
      <Link
        className="text-quest-gold-border underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
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
    <main className="grid min-h-screen place-content-center gap-6 bg-quest-background p-8 text-center font-quest-body text-quest-parchment">
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
      <Link
        to="/dashboard"
        className="text-quest-gold-border underline underline-offset-4"
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
    action: logoutAction,
    ErrorBoundary: UnavailablePage,
  },
  {
    Component: AuthLayout,
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
    ErrorBoundary: AppErrorPage,
    children: [
      { path: "/dashboard", Component: DashboardPage, action: logoutAction },
      { path: "/customers", Component: CustomersPage },
      { path: "/customers/new", Component: AddCustomerPage },
      { path: "/customers/:id", Component: CustomerDetailsPage },
      { path: "/customers/:id/edit", Component: EditCustomerPage },
      { path: "/receivables", Component: ReceivablesPage },
      { path: "/receivables/new", Component: AddReceivablePage },
      { path: "/receivables/:id/edit", Component: EditReceivablePage },
      { path: "/promises", Component: PromisesPage },
      { path: "/promises/new", Component: AddPromisePage },
      { path: "/promises/:id/edit", Component: EditPromisePage },
      { path: "/payments", Component: PaymentsPage },
      { path: "/payments/new", Component: RecordPaymentPage },
      { path: "/payments/:id/edit", Component: EditPaymentPage },
      { path: "/follow-ups", Component: FollowUpsPage },
      { path: "/follow-ups/new", Component: AddFollowUpPage },
      { path: "/follow-ups/:id/edit", Component: EditFollowUpPage },
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