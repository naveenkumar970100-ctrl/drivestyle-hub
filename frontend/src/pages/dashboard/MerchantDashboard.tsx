import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Store, ShoppingBag, DollarSign, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "Active Services", value: "8", icon: Store },
  { label: "Total Bookings", value: "156", icon: ShoppingBag },
  { label: "Earnings", value: "$12,340", icon: DollarSign },
  { label: "Rating", value: "4.8", icon: Star },
];

const bookings = [
  { customer: "Alex Johnson", vehicle: "Tesla Model 3", service: "Full Service", date: "Feb 10, 2026", status: "Confirmed" },
  { customer: "Maria Garcia", vehicle: "Honda CBR 600", service: "Tire Change", date: "Feb 11, 2026", status: "Pending" },
  { customer: "David Kim", vehicle: "Ford Mustang", service: "Detailing", date: "Feb 12, 2026", status: "Confirmed" },
];

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const MerchantDashboard = () => (
  <DashboardLayout role="merchant">
    <div className="space-y-6">
      <motion.h1 {...fadeUp} className="font-heading text-3xl font-bold">Merchant Dashboard</motion.h1>

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
        <h2 className="font-heading text-xl font-bold">Recent Bookings</h2>
        <div className="mt-4 space-y-3">
          {bookings.map((b) => (
            <div key={b.customer + b.date} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{b.customer}</div>
                <div className="text-sm text-muted-foreground">{b.vehicle} — {b.service}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{b.date}</span>
                <Badge variant={b.status === "Confirmed" ? "default" : "secondary"}>{b.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </DashboardLayout>
);

export default MerchantDashboard;
