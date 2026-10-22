import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { RootErrorBoundary } from "./routes/root-error-boundary";
import { RootLayout } from "./routes/root-layout";
import { CustomersPage } from "./routes/customers";
import { FollowUpsPage } from "./routes/follow-ups";
import { HomePage, homeAction, homeLoader } from "./routes/home";
import { PaymentsPage } from "./routes/payments";
import { PromisesPage } from "./routes/promises";
import { ReceivablesPage } from "./routes/receivables";
import { SettingsPage } from "./routes/settings";
import { CustomerDetailsPage } from "./routes/customer-details";
import {
  AddCustomerPage,
  EditCustomerPage,
} from "./routes/customer-form";
import { AddReceivablePage, EditReceivablePage } from "./routes/receivable-form";
import { AddPromisePage, EditPromisePage } from "./routes/promise-form";
import { AddFollowUpPage, EditFollowUpPage } from "./routes/follow-up-form";
import { EditPaymentPage, RecordPaymentPage } from "./routes/payment-form";
import { LoginPage } from "./routes/login";
import { RegisterPage } from "./routes/register";
import "./styles.css";

const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
    ErrorBoundary: RootErrorBoundary,
  },
  {
    path: "/register",
    Component: RegisterPage,
    ErrorBoundary: RootErrorBoundary,
  },
  {
    path: "/",
    Component: RootLayout,
    ErrorBoundary: RootErrorBoundary,
    children: [
      {
        index: true,
        Component: HomePage,
        loader: homeLoader,
        action: homeAction,
      },
      {
        path: "customers",
        Component: CustomersPage,
      },
      {
        path: "customers/new",
        Component: AddCustomerPage,
      },
      {
        path: "customers/:customerId",
        Component: CustomerDetailsPage,
      },
      {
        path: "customers/:customerId/edit",
        Component: EditCustomerPage,
      },
      {
        path: "customers/:customerId/receivables/new",
        Component: AddReceivablePage,
      },
      {
        path: "receivables",
        Component: ReceivablesPage,
      },
      {
        path: "receivables/new",
        Component: AddReceivablePage,
      },
      {
        path: "receivables/:receivableId/edit",
        Component: EditReceivablePage,
      },
      {
        path: "promises",
        Component: PromisesPage,
      },
      {
        path: "promises/new",
        Component: AddPromisePage,
      },
      {
        path: "promises/:promiseId/edit",
        Component: EditPromisePage,
      },
      {
        path: "payments",
        Component: PaymentsPage,
      },
      {
        path: "payments/new",
        Component: RecordPaymentPage,
      },
      {
        path: "payments/:paymentId/edit",
        Component: EditPaymentPage,
      },
      {
        path: "follow-ups",
        Component: FollowUpsPage,
      },
      {
        path: "follow-ups/new",
        Component: AddFollowUpPage,
      },
      {
        path: "follow-ups/:followUpId/edit",
        Component: EditFollowUpPage,
      },
      {
        path: "settings",
        Component: SettingsPage,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
