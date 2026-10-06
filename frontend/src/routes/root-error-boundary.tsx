import { isRouteErrorResponse, useRouteError } from "react-router";

export function RootErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <main className="error-page">
        <h1>{error.status}</h1>
        <p>{error.statusText || "The request could not be completed."}</p>
      </main>
    );
  }

  return (
    <main className="error-page">
      <h1>Something went wrong</h1>
      <p>{error instanceof Error ? error.message : "An unexpected error occurred."}</p>
    </main>
  );
}
