import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import SessionPage from "@/pages/session";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import AgentsPage from "@/pages/agents";
import WorkspacePage from "@/pages/workspace";
import BillingPage from "@/pages/billing";
import SettingsPage from "@/pages/settings";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <>{children}</>;
}

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes — no sidebar */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      {/* Root: landing if not authed, dashboard if authed */}
      <Route path="/">
        {isAuthenticated ? (
          <AppShell><Dashboard /></AppShell>
        ) : (
          <LandingPage />
        )}
      </Route>

      {/* Protected routes */}
      <Route path="/dashboard">
        <AuthGuard>
          <AppShell><Dashboard /></AppShell>
        </AuthGuard>
      </Route>

      <Route path="/session/:id">
        <AuthGuard>
          <AppShell><SessionPage /></AppShell>
        </AuthGuard>
      </Route>

      <Route path="/agents">
        <AuthGuard>
          <AppShell><AgentsPage /></AppShell>
        </AuthGuard>
      </Route>

      <Route path="/workspace">
        <AuthGuard>
          <AppShell><WorkspacePage /></AppShell>
        </AuthGuard>
      </Route>

      <Route path="/billing">
        <AuthGuard>
          <AppShell><BillingPage /></AppShell>
        </AuthGuard>
      </Route>

      <Route path="/settings">
        <AuthGuard>
          <AppShell><SettingsPage /></AppShell>
        </AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
