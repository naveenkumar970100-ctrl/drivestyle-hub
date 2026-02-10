import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Car, ShoppingBag, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const stats = [
  { label: "My Vehicles", value: "2", icon: Car },
  { label: "Total Bookings", value: "7", icon: ShoppingBag },
  { label: "Upcoming", value: "1", icon: Clock },
  { label: "Completed", value: "6", icon: CheckCircle },
];

const bookings = [
  { service: "General Service", vehicle: "Honda Civic 2024", date: "Feb 15, 2026", status: "Upcoming", merchant: "AutoFix Garage" },
  { service: "Oil Change", vehicle: "Yamaha FZ", date: "Jan 20, 2026", status: "Completed", merchant: "MotoWorks" },
  { service: "Brake Pad Replacement", vehicle: "Honda Civic 2024", date: "Dec 10, 2025", status: "Completed", merchant: "AutoFix Garage" },
];

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const CustomerDashboard = () => (
  <DashboardLayout role="customer">
    <div className="space-y-6">
      <motion.div {...fadeUp} className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">My Dashboard</h1>
        <Link to="/services">
          <Button className="gradient-accent border-0 text-accent-foreground">Book Service</Button>
        </Link>
      </motion.div>

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
        <h2 className="font-heading text-xl font-bold">My Bookings</h2>
        <div className="mt-4 space-y-3">
          {bookings.map((b, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{b.service}</div>
                <div className="text-sm text-muted-foreground">{b.vehicle} • {b.merchant}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{b.date}</span>
                <Badge variant={b.status === "Upcoming" ? "default" : "secondary"}>{b.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </DashboardLayout>
);

export default CustomerDashboard;
