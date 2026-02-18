import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAuth } from "@/lib/utils";

type Role = "admin" | "staff" | "merchant" | "customer";

type Props = {
  children: ReactNode;
  role?: Role;
};

export default function RequireAuth({ children, role }: Props) {
  const location = useLocation();
  const session = getAuth();
  const hasSession = !!session && !!session.token;
  if (!hasSession) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  if (role) {
    const actual = String(session.role || "").toLowerCase();
    const expected = String(role || "").toLowerCase();
    if (actual !== expected) {
      const routeMap: Record<string, string> = {
        admin: "/dashboard/admin",
        staff: "/dashboard/staff",
        merchant: "/dashboard/merchant",
        customer: "/dashboard/customer",
      };
      return <Navigate to={routeMap[actual] || "/"} replace />;
    }
  }
  return <>{children}</>;
}
