import { useLocation } from "wouter";
import { Zap, LayoutDashboard, Bot, Code2, CreditCard, Settings, ChevronRight, LogOut } from "lucide-react";
import { useListSwarmSessions } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Bot, label: "Agents", path: "/agents" },
  { icon: Code2, label: "Workspace", path: "/workspace" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { data } = useListSwarmSessions();
  const { user, logout } = useAuth();
  const sessions = data?.sessions ?? [];
  const activeSessions = sessions.filter(
    (s: { status: string }) => s.status === "RUNNING" || s.status === "PLANNING" || s.status === "PENDING"
  );

  const isActive = (path: string) => {
    if (path === "/dashboard") return location === "/" || location === "/dashboard";
    return location.startsWith(path);
  };

  return (
    <div className="w-52 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-sidebar-border">
        <div className="p-1.5 bg-violet-500/20 rounded-lg">
          <Zap className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <span className="text-sm font-bold text-foreground">AIVerse</span>
          <span className="text-xs text-cyan-400 ml-1.5 font-mono">2.0</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => setLocation(item.path)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive(item.path)
                ? "bg-cyan-400/10 text-cyan-400 border-l-2 border-cyan-400 pl-[9px]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Active swarms */}
      {activeSessions.length > 0 && (
        <div className="px-2 py-3 border-t border-sidebar-border">
          <p className="text-xs text-muted-foreground px-2 mb-2 uppercase tracking-wider">Live</p>
          {activeSessions.slice(0, 4).map((s) => (
            <button
              key={s.id}
              onClick={() => setLocation(`/session/${s.id}`)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors group"
              data-testid={`nav-active-${s.id}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
              <span className="truncate flex-1 text-left">{s.title}</span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* User footer */}
      <div className="mt-auto border-t border-sidebar-border">
        {user ? (
          <div className="px-3 py-3">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/40 to-violet-500/40 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 border border-white/10">
                {(user.name ?? user.email)[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.name ?? "User"}</p>
                <p className="text-[10px] text-muted-foreground">{user.plan}</p>
              </div>
              <button
                onClick={() => { logout(); setLocation("/"); }}
                className="text-muted-foreground hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-3 py-3">
            <p className="text-xs text-muted-foreground/40 px-2">AIVerse 2.0</p>
          </div>
        )}
      </div>
    </div>
  );
}
