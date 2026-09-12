import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { RootErrorBoundary } from "./routes/root-error-boundary";
import { RootLayout } from "./routes/root-layout";
import { homeAction, homeLoader, HomePage } from "./routes/home";
import "./styles.css";

const router = createBrowserRouter([
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
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
