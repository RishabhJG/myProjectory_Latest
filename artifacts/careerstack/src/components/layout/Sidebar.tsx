import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { 
  LayoutDashboard, 
  Briefcase, 
  BarChart, 
  Map, 
  Search, 
  User as UserIcon,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/scores", label: "Scores & Readiness", icon: BarChart },
  { href: "/roadmaps", label: "Roadmaps", icon: Map },
  { href: "/jobs", label: "Jobs", icon: Search },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="fixed top-0 left-0 z-40 w-64 h-screen transition-transform -translate-x-full sm:translate-x-0 border-r border-border bg-card/50 backdrop-blur-xl glass">
      <div className="flex flex-col h-full px-4 py-6">
        <div className="flex items-center space-x-2 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">C</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">CareerStack</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon 
                  className={cn(
                    "w-5 h-5 mr-3 transition-colors", 
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )} 
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-border/50">
          <div className="flex items-center px-3 py-2">
            <UserButton appearance={{
              elements: {
                avatarBox: "w-9 h-9"
              }
            }}/>
            <span className="ml-3 text-sm font-medium text-foreground">Account</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
