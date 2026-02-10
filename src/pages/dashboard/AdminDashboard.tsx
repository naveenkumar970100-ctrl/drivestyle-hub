import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Users, UserCheck, UserX, ShoppingBag, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "Total Users", value: "2,456", icon: Users, change: "+12%" },
  { label: "Pending Approvals", value: "18", icon: UserCheck, change: "3 new" },
  { label: "Active Bookings", value: "342", icon: ShoppingBag, change: "+8%" },
  { label: "Revenue", value: "$45,230", icon: DollarSign, change: "+15%" },
];

const pendingApprovals = [
  { name: "Rajesh Kumar", email: "rajesh@email.com", role: "Staff", date: "Feb 8, 2026" },
  { name: "AutoFix Garage", email: "autofix@email.com", role: "Merchant", date: "Feb 7, 2026" },
  { name: "Sarah Chen", email: "sarah@email.com", role: "Staff", date: "Feb 6, 2026" },
  { name: "MotoWorks", email: "motoworks@email.com", role: "Merchant", date: "Feb 5, 2026" },
];

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const AdminDashboard = () => (
  <DashboardLayout role="admin">
    <div className="space-y-6">
      <motion.h1 {...fadeUp} className="font-heading text-3xl font-bold">Admin Dashboard</motion.h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.1 }}
            className="rounded-xl border bg-card p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <s.icon className="h-8 w-8 text-accent" />
              <span className="text-xs text-accent font-medium">{s.change}</span>
            </div>
            <div className="mt-3 font-heading text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="rounded-xl border bg-card p-6 shadow-card">
        <h2 className="font-heading text-xl font-bold">Pending Approvals</h2>
        <p className="text-sm text-muted-foreground">Staff and merchant registrations awaiting your approval</p>
        <div className="mt-4 space-y-3">
          {pendingApprovals.map((p) => (
            <div key={p.email} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">{p.email}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={p.role === "Staff" ? "secondary" : "outline"}>{p.role}</Badge>
                <span className="text-xs text-muted-foreground">{p.date}</span>
                <Button size="sm" className="gradient-accent border-0 text-accent-foreground">Approve</Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30">Reject</Button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </DashboardLayout>
);

export default AdminDashboard;
