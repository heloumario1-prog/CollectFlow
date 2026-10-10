import { createBrowserRouter, isRouteErrorResponse, Link, useRouteError } from "react-router";
import { WelcomePage } from "./screens/welcome/WelcomePage";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./screens/dashboard/DashboardPage";
import { FeaturePreviewPage } from "./screens/dashboard/FeaturePreviewPage";
import { dashboardLoader } from "./screens/dashboard/loader";
import { ApiError } from "./api/client";
import { AuthLayout } from "./screens/auth/AuthLayout";
import { LoginPage } from "./screens/auth/LoginPage";
import { RegisterPage } from "./screens/auth/RegisterPage";
import { homeAuthLoader } from "./screens/auth/loader";
import { loginAction, logoutAction, registerAction } from "./screens/auth/action";
function UnavailablePage() {
  return (
    <main className="grid min-h-screen place-content-center gap-6 bg-quest-background p-8 text-center font-quest-body text-quest-parchment">
      <h1 className="font-quest-heading text-2xl">This page is unavailable</h1>
      <Link className="text-quest-gold-border underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4" to="/">Back to CollectFlow</Link>
    </main>
  );
}

function AppErrorPage() {
  const error = useRouteError();
  const status = error instanceof ApiError ? error.status : isRouteErrorResponse(error) ? error.status : 0;
  const forbidden = status === 403;
  const missing = status === 404;
  return <main className="grid min-h-screen place-content-center gap-6 bg-quest-background p-8 text-center font-quest-body text-quest-parchment"><h1 className="font-quest-heading text-2xl">{forbidden ? "You cannot open this page" : missing ? "This page was not found" : "The workspace is unavailable"}</h1><p className="text-quest-muted">{forbidden ? "Ask your manager if you need access." : missing ? "Check the link and try again." : "Please try again in a moment."}</p><Link to="/dashboard" className="text-quest-gold-border underline underline-offset-4">Back to dashboard</Link></main>;
}

export const router = createBrowserRouter([
    { path: "/",
        Component: WelcomePage,
        loader: homeAuthLoader,
        action: logoutAction,
        ErrorBoundary: UnavailablePage
    },
    {
        Component: AuthLayout,
        ErrorBoundary: UnavailablePage,
        children: [
            {
                path: "/login",
                Component: LoginPage,
                action: loginAction
            },
            {   path: "/register",
                Component: RegisterPage,
                action: registerAction
            },
        ],
    },
    {
        Component: AppLayout,
        loader: dashboardLoader,
        ErrorBoundary: AppErrorPage,
        children: [
            { path: "/dashboard", Component: DashboardPage, action: logoutAction },
            { path: "/customers", Component: FeaturePreviewPage },
            { path: "/customers/new", Component: FeaturePreviewPage },
            { path: "/receivables", Component: FeaturePreviewPage },
            { path: "/promises", Component: FeaturePreviewPage },
            { path: "/payments", Component: FeaturePreviewPage },
            { path: "/follow-ups", Component: FeaturePreviewPage },
            { path: "/staff", Component: FeaturePreviewPage },
            { path: "/settings/profile", Component: FeaturePreviewPage },
            { path: "/settings/business", Component: FeaturePreviewPage },
        ],
    },
    { path: "*", Component: UnavailablePage },
]);
