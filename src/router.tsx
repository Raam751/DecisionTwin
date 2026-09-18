import { AppShell } from "./components/app-shell";
import Compare from "./pages/Compare";
import Decisions from "./pages/Decisions";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import NewCandidate from "./pages/NewCandidate";
import NewRole from "./pages/NewRole";
import NotFound from "./pages/NotFound";
import Review from "./pages/Review";
import Roles from "./pages/Roles";

export const routers = [
  {
    path: "/",
    name: "landing",
    element: <Landing />,
  },
  {
    path: "/dashboard",
    name: "dashboard",
    element: <AppShell><Index /></AppShell>,
  },
  {
    path: "/roles",
    name: "roles",
    element: <AppShell><Roles /></AppShell>,
  },
  {
    path: "/roles/new",
    name: "new-role",
    element: <AppShell><NewRole /></AppShell>,
  },
  {
    path: "/candidates/new",
    name: "new-candidate",
    element: <AppShell><NewCandidate /></AppShell>,
  },
  {
    path: "/review/:candidateId",
    name: "review",
    element: <AppShell><Review /></AppShell>,
  },
  {
    path: "/compare",
    name: "compare",
    element: <AppShell><Compare /></AppShell>,
  },
  {
    path: "/decisions",
    name: "decisions",
    element: <AppShell><Decisions /></AppShell>,
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <AppShell><NotFound /></AppShell>,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
