import Compare from "./pages/Compare";
import Index from "./pages/Index";
import NewCandidate from "./pages/NewCandidate";
import NewRole from "./pages/NewRole";
import NotFound from "./pages/NotFound";
import Review from "./pages/Review";

export const routers = [
  {
    path: "/",
    name: "home",
    element: <Index />,
  },
  {
    path: "/roles/new",
    name: "new-role",
    element: <NewRole />,
  },
  {
    path: "/candidates/new",
    name: "new-candidate",
    element: <NewCandidate />,
  },
  {
    path: "/review/:candidateId",
    name: "review",
    element: <Review />,
  },
  {
    path: "/compare",
    name: "compare",
    element: <Compare />,
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    name: "404",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
