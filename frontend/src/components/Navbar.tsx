import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Car } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn, getAuth, clearAuth } from "@/lib/utils";

const navLinks = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Services", path: "/services" },
  { label: "Careers", path: "/careers" },
  { label: "Blog", path: "/blog" },
  { label: "FAQ", path: "/faq" },
  { label: "Contact", path: "/contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean>(!!getAuth());
  const [isAdmin, setIsAdmin] = useState<boolean>(getAuth()?.role === "Admin");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const session = getAuth();
    setAuthed(!!session);
    setIsAdmin(session?.role === "Admin");
  }, [pathname]);
  const logout = () => {
    clearAuth();
    setAuthed(false);
    navigate("/");
  };
  const session = getAuth();
  const dashPath =
    session?.role === "Admin"
      ? "/dashboard/admin"
      : session?.role === "Staff"
      ? "/dashboard/staff"
      : session?.role === "Merchant"
      ? "/dashboard/merchant"
      : "/dashboard/customer";
  const dashLabel =
    session?.role === "Admin"
      ? "Admin"
      : session?.role === "Staff"
      ? "Staff"
      : session?.role === "Merchant"
      ? "Merchant"
      : "Profile";

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-heading text-2xl font-bold">
          <Car className="h-7 w-7 text-accent" />
          <span>MotoHub</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.path}
              to={l.path}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-accent",
                pathname === l.path ? "text-accent" : "text-muted-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          {authed ? (
            <>
              <Link to={dashPath}>
                <Button size="sm" className="gradient-accent border-0 text-accent-foreground">{dashLabel}</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="gradient-accent border-0 text-accent-foreground">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-card lg:hidden">
          <div className="container flex flex-col gap-1 py-4">
            {navLinks.map((l) => (
              <Link
                key={l.path}
                to={l.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === l.path ? "text-accent bg-muted" : "text-muted-foreground"
                )}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex gap-2">
              {authed ? (
                <>
                  <Link to={dashPath} className="flex-1" onClick={() => setOpen(false)}>
                    <Button className="w-full gradient-accent border-0 text-accent-foreground">{dashLabel}</Button>
                  </Link>
                  <Button variant="outline" className="flex-1" onClick={() => { setOpen(false); logout(); }}>Logout</Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link to="/register" className="flex-1" onClick={() => setOpen(false)}>
                    <Button className="w-full gradient-accent border-0 text-accent-foreground">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
