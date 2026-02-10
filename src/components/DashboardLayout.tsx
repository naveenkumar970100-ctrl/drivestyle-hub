import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Car, LayoutDashboard, Users, Settings, LogOut, FileText, ShoppingBag, BarChart3, UserCheck, Store } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  role: "admin" | "staff" | "merchant" | "customer";
}

const menuItems: Record<string, { label: string; icon: any; path: string }[]> = {
  admin: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/admin" },
    { label: "Manage Users", icon: Users, path: "/dashboard/admin" },
    { label: "Approvals", icon: UserCheck, path: "/dashboard/admin" },
    { label: "Reports", icon: BarChart3, path: "/dashboard/admin" },
    { label: "Settings", icon: Settings, path: "/dashboard/admin" },
  ],
  staff: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/staff" },
    { label: "My Tasks", icon: FileText, path: "/dashboard/staff" },
    { label: "Bookings", icon: ShoppingBag, path: "/dashboard/staff" },
    { label: "Settings", icon: Settings, path: "/dashboard/staff" },
  ],
  merchant: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/merchant" },
    { label: "My Services", icon: Store, path: "/dashboard/merchant" },
    { label: "Bookings", icon: ShoppingBag, path: "/dashboard/merchant" },
    { label: "Earnings", icon: BarChart3, path: "/dashboard/merchant" },
    { label: "Settings", icon: Settings, path: "/dashboard/merchant" },
  ],
  customer: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard/customer" },
    { label: "My Bookings", icon: ShoppingBag, path: "/dashboard/customer" },
    { label: "My Vehicles", icon: Car, path: "/dashboard/customer" },
    { label: "Settings", icon: Settings, path: "/dashboard/customer" },
  ],
};

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const items = menuItems[role];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Car className="h-6 w-6 text-accent" />
          <span className="font-heading text-xl font-bold">AutoServ</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {}}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                i === 0 ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t p-4">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => navigate("/login")}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Car className="h-5 w-5 text-accent" />
            <span className="font-heading font-bold">AutoServ</span>
          </div>
          <h2 className="hidden font-heading text-lg font-semibold capitalize lg:block">{role} Dashboard</h2>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/">
              <Button variant="outline" size="sm">Home</Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
