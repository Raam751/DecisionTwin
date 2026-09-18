import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { RolesProvider } from "@/state/roles-store";
import { routers } from "./router";

const queryClient = new QueryClient();

const App = () => {
  const router = createBrowserRouter(routers);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RolesProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={router} />
        </RolesProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
