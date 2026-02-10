import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { ClipboardList, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "Assigned Tasks", value: "12", icon: ClipboardList },
  { label: "Completed", value: "8", icon: CheckCircle },
  { label: "In Progress", value: "3", icon: Clock },
  { label: "Urgent", value: "1", icon: AlertCircle },
];

const tasks = [
  { vehicle: "Honda Civic 2024", service: "General Service", status: "In Progress", priority: "Normal" },
  { vehicle: "Yamaha R15", service: "Engine Tune-up", status: "Pending", priority: "Urgent" },
  { vehicle: "BMW X5", service: "Oil Change", status: "Completed", priority: "Normal" },
  { vehicle: "KTM Duke 390", service: "Brake Service", status: "In Progress", priority: "High" },
];

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const StaffDashboard = () => (
  <DashboardLayout role="staff">
    <div className="space-y-6">
      <motion.h1 {...fadeUp} className="font-heading text-3xl font-bold">Staff Dashboard</motion.h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.1 }} className="rounded-xl border bg-card p-5 shadow-card">
            <s.icon className="h-8 w-8 text-accent" />
            <div className="mt-3 font-heading text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="rounded-xl border bg-card p-6 shadow-card">
        <h2 className="font-heading text-xl font-bold">My Tasks</h2>
        <div className="mt-4 space-y-3">
          {tasks.map((t) => (
            <div key={t.vehicle} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{t.vehicle}</div>
                <div className="text-sm text-muted-foreground">{t.service}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={t.priority === "Urgent" ? "destructive" : t.priority === "High" ? "default" : "secondary"}>
                  {t.priority}
                </Badge>
                <Badge variant="outline">{t.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </DashboardLayout>
);

export default StaffDashboard;
