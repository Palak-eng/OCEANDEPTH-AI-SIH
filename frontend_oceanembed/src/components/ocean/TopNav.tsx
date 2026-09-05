import { Link } from "@tanstack/react-router";
import { BarChart3, LayoutGrid, MapPin, Settings, Waves } from "lucide-react";

const TABS = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/map", label: "Map", icon: MapPin },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function TopNav() {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-border bg-panel px-5 py-3 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-accent ring-1 ring-primary/40">
          <Waves className="size-5" />
        </span>
        <span className="font-display text-xl font-bold tracking-tight">
          OCEAN<span className="text-accent">EMBED</span>
        </span>
      </Link>
      <p className="hidden text-sm text-muted-foreground lg:block">
        AI Powered Subsurface Ocean Temperature Reconstruction
      </p>
      <nav className="ml-auto flex items-center gap-1">
        {TABS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            activeProps={{ className: "bg-primary/25 !text-foreground ring-1 ring-primary/40" }}
          >
            <Icon className="size-4" />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="p-4">{children}</main>
    </div>
  );
}
