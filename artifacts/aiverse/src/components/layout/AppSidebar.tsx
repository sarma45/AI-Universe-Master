import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, LayoutDashboard, History, Settings, ChevronRight } from "lucide-react";
import { useListSwarmSessions } from "@workspace/api-client-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: History, label: "History", path: "/" },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { data } = useListSwarmSessions();
  const sessions = data?.sessions ?? [];
  const activeSessions = sessions.filter(
    (s) => s.status === "RUNNING" || s.status === "PLANNING" || s.status === "PENDING"
  );

  return (
    <div className="w-48 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <div className="p-1.5 bg-[hsl(248_100%_70%/0.2)] rounded-lg">
          <Zap className="w-4 h-4 text-[hsl(248_100%_70%)]" />
        </div>
        <div>
          <span className="text-sm font-bold text-foreground">AIVerse</span>
          <span className="text-xs text-[hsl(248_100%_70%)] ml-1">2.0</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => setLocation(item.path)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              location === item.path
                ? "bg-[hsl(248_100%_70%/0.15)] text-[hsl(248_100%_70%)]"
                : "text-muted-foreground hover:text-foreground hover:bg-[hsl(240_14%_9%)]"
            }`}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Active swarms */}
      {activeSessions.length > 0 && (
        <div className="px-2 py-3 border-t border-sidebar-border">
          <p className="text-xs text-muted-foreground px-2 mb-2 uppercase tracking-wider">Active</p>
          {activeSessions.slice(0, 5).map((s) => (
            <button
              key={s.id}
              onClick={() => setLocation(`/session/${s.id}`)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-[hsl(240_14%_9%)] transition-colors group"
              data-testid={`nav-active-${s.id}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(192_100%_42%)] animate-pulse flex-shrink-0" />
              <span className="truncate flex-1 text-left">{s.title}</span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto px-2 py-3 border-t border-sidebar-border">
        <div className="px-2.5 py-2">
          <p className="text-xs text-muted-foreground/50">Neural Dark v2.0</p>
          <p className="text-xs text-muted-foreground/30">Multi-Agent Platform</p>
        </div>
      </div>
    </div>
  );
}
