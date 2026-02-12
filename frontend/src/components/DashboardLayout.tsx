import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Car, LayoutDashboard, Users, Settings, LogOut, FileText, ShoppingBag, BarChart3, UserCheck, Store, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn, clearAuth, getAuth } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  role: "admin" | "staff" | "merchant" | "customer";
}

const menuItems: Record<string, { label: string; icon: LucideIcon; path: string }[]> = {
  admin: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/admin" },
    { label: "Create Accounts", icon: Users, path: "/dashboard/admin?tab=create-accounts" },
    { label: "Recent Bookings", icon: ShoppingBag, path: "/dashboard/admin?tab=recent-bookings" },
    { label: "Service History", icon: BarChart3, path: "/dashboard/admin?tab=service-history" },
    { label: "Invoices", icon: FileText, path: "/dashboard/admin?tab=invoices" },
    { label: "Registration History", icon: Users, path: "/dashboard/admin?tab=registration-history" },
    { label: "Approval History", icon: UserCheck, path: "/dashboard/admin?tab=approval-history" },
    { label: "Settings", icon: Settings, path: "/dashboard/admin?tab=settings" },
    { label: "Logout", icon: LogOut, path: "#logout" },
  ],
  staff: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/staff" },
    { label: "My Tasks", icon: FileText, path: "/dashboard/staff" },
    { label: "Bookings", icon: ShoppingBag, path: "/dashboard/staff" },
    { label: "Settings", icon: Settings, path: "/dashboard/staff" },
    { label: "Logout", icon: LogOut, path: "#logout" },
  ],
  merchant: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/merchant" },
    { label: "My Services", icon: Store, path: "/dashboard/merchant" },
    { label: "Bookings", icon: ShoppingBag, path: "/dashboard/merchant" },
    { label: "Earnings", icon: BarChart3, path: "/dashboard/merchant" },
    { label: "Settings", icon: Settings, path: "/dashboard/merchant" },
    { label: "Logout", icon: LogOut, path: "#logout" },
  ],
  customer: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/customer" },
    { label: "My Bookings", icon: ShoppingBag, path: "/dashboard/customer" },
    { label: "My Vehicles", icon: Car, path: "/dashboard/customer" },
    { label: "Settings", icon: Settings, path: "/dashboard/customer" },
    { label: "Logout", icon: LogOut, path: "#logout" },
  ],
};

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const items = menuItems[role];
  const homePath = `/`;
  const session = getAuth();
  const params = new URLSearchParams(search);
  const activeTab = params.get("tab") || "dashboard";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Car className="h-6 w-6 text-accent" />
          <span className="font-heading text-xl font-bold">MotoHub</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                if (item.path === "#logout") {
                  clearAuth();
                  navigate("/");
                } else {
                  navigate(item.path);
                }
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                (() => {
                  if (item.path === "#logout") return "text-muted-foreground hover:bg-muted hover:text-foreground";
                  if (role === "admin") {
                    const tab = item.path.includes("?tab=") ? new URLSearchParams(item.path.split("?")[1]).get("tab") || "dashboard" : "dashboard";
                    return tab === activeTab ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground";
                  }
                  const base = item.path.split("?")[0];
                  return base === pathname ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground";
                })()
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Car className="h-5 w-5 text-accent" />
            <span className="font-heading font-bold">MotoHub</span>
          </div>
          <h2 className="hidden font-heading text-lg font-semibold capitalize lg:block">{role} Dashboard</h2>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session?.role === "Admin" && (
              <Link to="/dashboard/admin">
                <Button size="sm" className="gradient-accent border-0 text-accent-foreground">Admin</Button>
              </Link>
            )}
            <Link to={homePath}>
              <Button variant="outline" size="sm">Home</Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
