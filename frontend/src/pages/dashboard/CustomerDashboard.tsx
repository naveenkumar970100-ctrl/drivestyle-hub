import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Car, ShoppingBag, Clock, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAuth, listCustomerBookings, listCustomerVehicles, addCustomerVehicle, fetchVehicleDetails, type Booking, type CustomerVehicle, type VehicleType } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const CustomerDashboard = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [vehicleForm, setVehicleForm] = useState<{ type: VehicleType; make: string; model: string; year: string; engine?: string; displacement?: string; power_hp?: string; reg?: string }>({ type: "car", make: "", model: "", year: "" });
  useEffect(() => {
    const session = getAuth();
    if (session?.email) {
      setBookings(listCustomerBookings(session.email));
      setVehicles(listCustomerVehicles(session.email));
    }
  }, []);
  const total = bookings.length;
  const upcoming = bookings.filter((b) => b.status === "Upcoming").length;
  const completed = bookings.filter((b) => b.status === "Completed").length;
  const stats = [
    { label: "My Vehicles", value: String(vehicles.length), icon: Car },
    { label: "Total Bookings", value: String(total), icon: ShoppingBag },
    { label: "Upcoming", value: String(upcoming), icon: Clock },
    { label: "Completed", value: String(completed), icon: CheckCircle },
  ];
  return (
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

        <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="rounded-xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold">My Vehicles</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-accent border-0 text-accent-foreground">Add Vehicle</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Vehicle</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Vehicle Registration Number</label>
                    <Input value={vehicleForm.reg || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, reg: e.target.value })} placeholder="e.g. AP09AB1234" />
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-sm text-muted-foreground">Details</div>
                    <div className="mt-2 text-sm">
                      <div>Type: <span className="font-medium">{vehicleForm.type}</span></div>
                      <div>Make: <span className="font-medium">{vehicleForm.make || "-"}</span></div>
                      <div>Model: <span className="font-medium">{vehicleForm.model || "-"}</span></div>
                      <div>Year: <span className="font-medium">{vehicleForm.year || "-"}</span></div>
                      <div>Engine: <span className="font-medium">{vehicleForm.engine || "-"}</span></div>
                      <div>Displacement: <span className="font-medium">{vehicleForm.displacement || "-"}</span></div>
                      <div>Power (HP): <span className="font-medium">{vehicleForm.power_hp || "-"}</span></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          if (!vehicleForm.reg) {
                            toast({ title: "Registration required", description: "Enter your vehicle registration number", variant: "destructive" });
                            return;
                          }
                          const details = await fetchVehicleDetails({ type: vehicleForm.type, reg: vehicleForm.reg });
                          setVehicleForm({
                            ...vehicleForm,
                            type: (details as any)?.type === "bike" ? "bike" : ((details as any)?.type === "car" ? "car" : vehicleForm.type),
                            engine: details.engine || vehicleForm.engine,
                            displacement: details.displacement || vehicleForm.displacement,
                            power_hp: details.power_hp || vehicleForm.power_hp,
                            make: (details as any)?.make || vehicleForm.make,
                            model: (details as any)?.model || vehicleForm.model,
                            year: (details as any)?.year || vehicleForm.year,
                          });
                          toast({ title: "Details fetched", description: "Vehicle specs updated" });
                        } catch (err) {
                          const m = err instanceof Error ? err.message : String(err);
                          toast({ title: "Failed to fetch", description: m, variant: "destructive" });
                        }
                      }}
                    >
                      Fetch Details
                    </Button>
                    <Button
                      onClick={() => {
                        const session = getAuth();
                        if (!session?.email) return;
                        if (!vehicleForm.reg) {
                          toast({ title: "Registration required", description: "Enter your vehicle registration number", variant: "destructive" });
                          return;
                        }
                        if (!vehicleForm.make || !vehicleForm.model) {
                          toast({ title: "Fetch required", description: "Click Fetch Details first", variant: "destructive" });
                          return;
                        }
                        addCustomerVehicle(session.email, {
                          type: vehicleForm.type,
                          make: vehicleForm.make,
                          model: vehicleForm.model,
                          year: vehicleForm.year || undefined,
                          engine: vehicleForm.engine || undefined,
                          displacement: vehicleForm.displacement || undefined,
                          power_hp: vehicleForm.power_hp || undefined,
                          vin: vehicleForm.reg || undefined,
                        });
                        setVehicles(listCustomerVehicles(session.email));
                        setVehicleForm({ type: "car", make: "", model: "", year: "" });
                        toast({ title: "Vehicle added", description: "Saved to your garage" });
                      }}
                      className="gradient-accent border-0 text-accent-foreground"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No vehicles yet</div>
            )}
            {vehicles.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-medium">{v.make} {v.model}</div>
                  <div className="text-sm text-muted-foreground">{v.type === "bike" ? "Bike" : "Car"} {v.year && `• ${v.year}`}</div>
                </div>
                <Badge variant="secondary">{v.engine || v.displacement || "Spec"}</Badge>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-heading text-xl font-bold">My Bookings</h2>
          <div className="mt-4 space-y-3">
            {bookings.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No bookings yet</div>
            )}
            {bookings.map((b) => (
              <div key={b.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{b.service}</div>
                  <div className="text-sm text-muted-foreground">{b.vehicle === "bike" ? "Bike" : "Car"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{b.date} {b.time && `• ${b.time}`}</span>
                  <Badge variant={b.status === "Upcoming" ? "default" : "secondary"}>{b.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDashboard;
