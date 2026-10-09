import { createBrowserRouter, Link } from "react-router";
import { WelcomePage } from "./screens/welcome/WelcomePage";
function UnavailablePage() {
  return (
    <main className="grid min-h-screen place-content-center gap-6 bg-quest-background p-8 text-center font-quest-body text-quest-parchment">
      <h1 className="font-quest-heading text-2xl">This page is unavailable</h1>
      <Link className="text-quest-gold-border underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4" to="/">Back to CollectFlow</Link>
    </main>
  );
}

export const router = createBrowserRouter([
  { path: "/", Component: WelcomePage, ErrorBoundary: UnavailablePage },
  { path: "*", Component: UnavailablePage },
]);
