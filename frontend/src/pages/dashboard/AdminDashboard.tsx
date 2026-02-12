import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, UserCheck, UserX, ShoppingBag, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listApprovals, setApprovalStatus, listRegistrations, deleteRegistration, listApprovalEvents, listBookings, listServices, addService, updateService, deleteService, setServicePrice, setBookingStatus, assignBookingSlot, listStaff, addStaff, deleteStaff, assignJob, listJobs, setJobStatus, listPayments, addPayment, setPaymentStatus, listInvoices, generateInvoice, markInvoicePaid, createAdminUser, addRegistration, listUsersFromApi, deleteUserByAdmin, type ApiUser, type Approval, type Registration, type ApprovalEvent, type Booking, type ServiceItem, type VehicleType, type BookingStatus, type StaffMember, type StaffRoleType, type Job, type JobStatus, type Payment, type Invoice } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const stats = [
  { label: "Total Users", value: "2,456", icon: Users, change: "+12%" },
  { label: "Pending Approvals", value: "18", icon: UserCheck, change: "3 new" },
  { label: "Active Bookings", value: "342", icon: ShoppingBag, change: "+8%" },
  { label: "Revenue", value: "$45,230", icon: DollarSign, change: "+15%" },
];

const AdminDashboard = () => {
  const { toast } = useToast();
  const { search } = useLocation();
  const tab = (() => {
    const p = new URLSearchParams(search);
    const t = p.get("tab");
    const allowed = new Set([
      "create-accounts",
      "recent-bookings",
      "service-history",
      "invoices",
      "registration-history",
      "approval-history",
      "settings",
      "dashboard",
    ]);
    return allowed.has(String(t)) ? String(t) : "dashboard";
  })();
  const [pending, setPending] = useState<Approval[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [approvalEvents, setApprovalEvents] = useState<ApprovalEvent[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [newService, setNewService] = useState({ title: "", desc: "", price: 0 });
  type MemberRole = "Staff" | "Merchant";
  const [newStaff, setNewStaff] = useState<{ name: string; email: string; role: MemberRole }>({ name: "", email: "", role: "Staff" });
  const [newMerchant, setNewMerchant] = useState<{ shopName: string; email: string; phone: string; address: string; location: string; password: string }>({ shopName: "", email: "", phone: "", address: "", location: "", password: "" });
  const [newStaffAccount, setNewStaffAccount] = useState<{ name: string; email: string; phone: string; staffRole: string; location: string; password: string }>({ name: "", email: "", phone: "", staffRole: "Staff", location: "", password: "" });
  const refresh = () => setPending(listApprovals("pending"));
  const [merchantPos, setMerchantPos] = useState<[number, number] | null>(null);
  const [staffPos, setStaffPos] = useState<[number, number] | null>(null);
  const [savingMerchant, setSavingMerchant] = useState(false);
  const [savingStaff, setSavingStaff] = useState(false);
  const [users, setUsers] = useState<ApiUser[]>([]);
  delete (L.Icon.Default as any).prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
    iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
    shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
  });
  const updateFromLatLng = (latStr?: string, lngStr?: string) => {
    const lt = typeof latStr === "string" ? parseFloat(latStr) : NaN;
    const lg = typeof lngStr === "string" ? parseFloat(lngStr) : NaN;
    if (!Number.isNaN(lt) && !Number.isNaN(lg)) {
      setMerchantPos([lt, lg]);
      setNewMerchant((m) => ({ ...m, location: `${lt.toFixed(6)},${lg.toFixed(6)}` }));
    }
  };
  const ClickMarker = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setMerchantPos([lat, lng]);
        setNewMerchant({ ...newMerchant, location: `${lat.toFixed(6)},${lng.toFixed(6)}` });
      },
    });
    return merchantPos ? <Marker position={merchantPos} /> : null;
  };
  const ClickMarkerStaff = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setStaffPos([lat, lng]);
        setNewStaffAccount({ ...newStaffAccount, location: `${lat.toFixed(6)},${lng.toFixed(6)}` });
      },
    });
    return staffPos ? <Marker position={staffPos} /> : null;
  };
  const useMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setMerchantPos([latitude, longitude]);
        setNewMerchant({ ...newMerchant, location: `${latitude.toFixed(6)},${longitude.toFixed(6)}` });
      });
    }
  };
  const useMyLocationStaff = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setStaffPos([latitude, longitude]);
        setNewStaffAccount({ ...newStaffAccount, location: `${latitude.toFixed(6)},${longitude.toFixed(6)}` });
      });
    }
  };
  useEffect(() => {
    refresh();
    setRegistrations(listRegistrations());
    setApprovalEvents(listApprovalEvents());
    setBookings(listBookings());
    setStaff(listStaff());
    setJobs(listJobs());
    setPayments(listPayments());
    setInvoices(listInvoices());
    (async () => {
      try {
        const u = await listUsersFromApi();
        setUsers(u);
      } catch (e) {
        // ignore
      }
    })();
  }, []);
  useEffect(() => {
    setServices(listServices(vehicleType));
  }, [vehicleType]);

  const serviceHistory = useMemo(() => {
    const filtered = bookings.filter((b) => (vehicleType === "bike" ? b.vehicle === "bike" : b.vehicle === "car"));
    const map = new Map<string, { total: number; completed: number; upcoming: number }>();
    for (const b of filtered) {
      const key = b.service;
      const existing = map.get(key) || { total: 0, completed: 0, upcoming: 0 };
      existing.total += 1;
      if (b.status === "Completed") existing.completed += 1;
      if (b.status === "Upcoming") existing.upcoming += 1;
      map.set(key, existing);
    }
    return Array.from(map.entries()).map(([service, stats]) => ({ service, ...stats }));
  }, [bookings, vehicleType]);
  const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <motion.h1 {...fadeUp} className="font-heading text-3xl font-bold">
          {tab === "dashboard" ? "Admin Dashboard" :
           tab === "create-accounts" ? "Create Accounts" :
           tab === "recent-bookings" ? "Recent Bookings" :
           tab === "service-history" ? "Service History" :
           tab === "invoices" ? "Invoices" :
           tab === "registration-history" ? "Registration History" :
           tab === "approval-history" ? "Approval History" :
           "Settings"}
        </motion.h1>

        {tab === "dashboard" && (
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
        )}

        {(tab === "dashboard" || tab === "create-accounts") && (
        <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="rounded-xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold">Create Accounts</h2>
              <p className="text-sm text-muted-foreground">Admin can create merchant and staff accounts</p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-accent border-0 text-accent-foreground">Add Merchant</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Merchant</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Merchant / Shop Name</label>
                      <Input value={newMerchant.shopName} onChange={(e) => setNewMerchant({ ...newMerchant, shopName: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Email</label>
                      <Input type="email" value={newMerchant.email} onChange={(e) => setNewMerchant({ ...newMerchant, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Phone Number</label>
                      <Input value={newMerchant.phone} onChange={(e) => setNewMerchant({ ...newMerchant, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Password</label>
                      <Input type="password" value={newMerchant.password} onChange={(e) => setNewMerchant({ ...newMerchant, password: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Address</label>
                      <Input value={newMerchant.address} onChange={(e) => setNewMerchant({ ...newMerchant, address: e.target.value })} placeholder="Street, City, State, ZIP" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Location</label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={newMerchant.location}
                          onChange={(e) => setNewMerchant({ ...newMerchant, location: e.target.value })}
                          onBlur={(e) => {
                            const parts = e.target.value.split(",").map((s) => s.trim());
                            if (parts.length === 2) {
                              updateFromLatLng(parts[0], parts[1]);
                            }
                          }}
                          placeholder="lat, lng"
                        />
                        <Button type="button" variant="outline" onClick={useMyLocation}>Use My Location</Button>
                      </div>
                      <div className="mt-3 rounded-lg border">
                        <MapContainer
                          {...({
                            center: (merchantPos ?? [12.9716, 77.5946]) as [number, number],
                            zoom: 13,
                            style: { height: 256 },
                            scrollWheelZoom: true,
                          } as any)}
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <ClickMarker />
                        </MapContainer>
                      </div>
                    </div>
                    <Button
                      disabled={savingMerchant}
                      onClick={async () => {
                        if (!newMerchant.shopName || !newMerchant.email || !newMerchant.phone || !newMerchant.location || !newMerchant.password) return;
                        try {
                          setSavingMerchant(true);
                          await createAdminUser({ role: "merchant", shopName: newMerchant.shopName, email: newMerchant.email, phone: newMerchant.phone, location: newMerchant.location, password: newMerchant.password });
                          addRegistration({ name: newMerchant.shopName, email: newMerchant.email, role: "Merchant", address: newMerchant.address });
                          toast({ title: "Merchant created", description: `${newMerchant.email}` });
                          setNewMerchant({ shopName: "", email: "", phone: "", address: "", location: "", password: "" });
                          setRegistrations(listRegistrations());
                          try { const u = await listUsersFromApi(); setUsers(u); } catch (e) { void e; }
                        } catch (err) {
                          const message = err instanceof Error ? err.message : String(err);
                          toast({ title: "Failed", description: message, variant: "destructive" });
                        } finally {
                          setSavingMerchant(false);
                        }
                      }}
                      className="w-full gradient-accent border-0 text-accent-foreground"
                    >
                      {savingMerchant ? (<span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span>) : "Save"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">Add Staff</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Staff</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Full Name</label>
                      <Input value={newStaffAccount.name} onChange={(e) => setNewStaffAccount({ ...newStaffAccount, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Email</label>
                      <Input type="email" value={newStaffAccount.email} onChange={(e) => setNewStaffAccount({ ...newStaffAccount, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Phone Number</label>
                      <Input value={newStaffAccount.phone} onChange={(e) => setNewStaffAccount({ ...newStaffAccount, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Password</label>
                      <Input type="password" value={newStaffAccount.password} onChange={(e) => setNewStaffAccount({ ...newStaffAccount, password: e.target.value })} />
                    </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Location</label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newStaffAccount.location}
                        onChange={(e) => setNewStaffAccount({ ...newStaffAccount, location: e.target.value })}
                        onBlur={(e) => {
                          const parts = e.target.value.split(",").map((s) => s.trim());
                          if (parts.length === 2) {
                            const lt = parseFloat(parts[0]);
                            const lg = parseFloat(parts[1]);
                            if (!Number.isNaN(lt) && !Number.isNaN(lg)) {
                              setStaffPos([lt, lg]);
                              setNewStaffAccount((m) => ({ ...m, location: `${lt.toFixed(6)},${lg.toFixed(6)}` }));
                            }
                          }
                        }}
                        placeholder="lat, lng"
                      />
                      <Button type="button" variant="outline" onClick={useMyLocationStaff}>Use My Location</Button>
                    </div>
                    <div className="mt-3 rounded-lg border">
                      <MapContainer
                        {...({
                          center: (staffPos ?? [12.9716, 77.5946]) as [number, number],
                          zoom: 13,
                          style: { height: 256 },
                          scrollWheelZoom: true,
                        } as any)}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <ClickMarkerStaff />
                      </MapContainer>
                    </div>
                  </div>
                    <Button
                    disabled={savingStaff}
                      onClick={async () => {
                      if (!newStaffAccount.name || !newStaffAccount.email || !newStaffAccount.phone || !newStaffAccount.location || !newStaffAccount.password) return;
                        try {
                        setSavingStaff(true);
                        await createAdminUser({ role: "staff", name: newStaffAccount.name, email: newStaffAccount.email, phone: newStaffAccount.phone, staffRole: newStaffAccount.staffRole, location: newStaffAccount.location, password: newStaffAccount.password });
                          addRegistration({ name: newStaffAccount.name, email: newStaffAccount.email, role: "Staff" });
                          toast({ title: "Staff created", description: `${newStaffAccount.email}` });
                        setNewStaffAccount({ name: "", email: "", phone: "", staffRole: "Staff", location: "", password: "" });
                          setRegistrations(listRegistrations());
                          try { const u = await listUsersFromApi(); setUsers(u); } catch (e) { void e; }
                        } catch (err) {
                          const message = err instanceof Error ? err.message : String(err);
                          toast({ title: "Failed", description: message, variant: "destructive" });
                      } finally {
                        setSavingStaff(false);
                        }
                      }}
                      className="w-full gradient-accent border-0 text-accent-foreground"
                    >
                    {savingStaff ? (<span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span>) : "Save"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>
        )}

        {tab === "dashboard" && (
        <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-heading text-xl font-bold">Pending Approvals</h2>
          <p className="text-sm text-muted-foreground">Staff and merchant registrations awaiting your approval</p>
          <div className="mt-4 space-y-3">
            {pending.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No pending approvals</div>
            )}
            {pending.map((p) => (
              <div key={p.email} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={p.role === "Staff" ? "secondary" : "outline"}>{p.role}</Badge>
                  <span className="text-xs text-muted-foreground">{p.date}</span>
                  <Button
                    size="sm"
                    className="gradient-accent border-0 text-accent-foreground"
                    onClick={() => { setApprovalStatus(p.email, "approved"); refresh(); }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30"
                    onClick={() => { setApprovalStatus(p.email, "rejected"); refresh(); }}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        )}
        {(tab === "dashboard" || tab === "settings") && (
        <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="rounded-xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold">Manage Services</h2>
              <p className="text-sm text-muted-foreground">Add, update, delete, and control pricing</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                </SelectContent>
              </Select>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-accent border-0 text-accent-foreground">Add Service</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Service</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Title</label>
                      <Input value={newService.title} onChange={(e) => setNewService({ ...newService, title: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Description</label>
                      <Input value={newService.desc} onChange={(e) => setNewService({ ...newService, desc: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Base Price</label>
                      <Input type="number" value={newService.price} onChange={(e) => setNewService({ ...newService, price: Number(e.target.value) })} />
                    </div>
                    <Button
                      onClick={() => {
                        if (!newService.title) return;
                        addService({ vehicle: vehicleType, title: newService.title, desc: newService.desc, price: newService.price, active: true });
                        setNewService({ title: "", desc: "", price: 0 });
                        setServices(listServices(vehicleType));
                      }}
                      className="w-full gradient-accent border-0 text-accent-foreground"
                    >
                      Save
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {services.length === 0 && <div className="rounded-lg border p-4 text-sm text-muted-foreground">No services for selected type</div>}
            {services.map((s) => (
              <div key={s.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-muted-foreground">{s.desc}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">Price: <span className="font-semibold">{s.price === 0 ? "Free" : `$${s.price}`}</span></span>
                  <Input
                    className="w-24"
                    type="number"
                    defaultValue={s.price}
                    onBlur={(e) => { setServicePrice(s.id, Number(e.target.value)); setServices(listServices(vehicleType)); }}
                  />
                  <Button size="sm" variant="outline" onClick={() => { updateService(s.id, { title: s.title, desc: s.desc }); setServices(listServices(vehicleType)); }}>Update</Button>
                  <Button size="sm" variant="destructive" onClick={() => { deleteService(s.id); setServices(listServices(vehicleType)); }}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        )}


        {(tab === "dashboard" || tab === "recent-bookings") && (
        <motion.div {...fadeUp} transition={{ delay: 0.55 }} className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-heading text-xl font-bold">Recent Bookings</h2>
          <div className="mt-4 space-y-3">
            {bookings.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No bookings yet</div>
            )}
            {bookings.map((b) => (
              <div key={b.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{b.customerEmail}</div>
                  <div className="text-sm text-muted-foreground">{(b.vehicle === "bike" ? "Bike" : "Car")} — {b.service}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-muted-foreground">{b.date} {b.time && `• ${b.time}`}</span>
                  <Badge variant={b.status === "Upcoming" ? "default" : b.status === "Completed" ? "secondary" : "destructive"}>{b.status}</Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Assign slot</span>
                    <Select value={b.slot || ""} onValueChange={(v) => { assignBookingSlot(b.id, v); setBookings(listBookings()); }}>
                      <SelectTrigger className="w-36"><SelectValue placeholder="Select slot" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="09:00 AM">09:00 AM</SelectItem>
                        <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                        <SelectItem value="01:00 PM">01:00 PM</SelectItem>
                        <SelectItem value="03:00 PM">03:00 PM</SelectItem>
                        <SelectItem value="05:00 PM">05:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Assign job</span>
                    <Select
                      value={jobs.find((j) => j.bookingId === b.id)?.staffId || ""}
                      onValueChange={(v) => { assignJob(b.id, v); setJobs(listJobs()); }}
                    >
                      <SelectTrigger className="w-36"><SelectValue placeholder="Select staff" /></SelectTrigger>
                      <SelectContent>
                        {staff.filter((s) => s.role === "Staff" && s.active).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Job status</span>
                    <Select
                      value={jobs.find((j) => j.bookingId === b.id)?.status || "Assigned"}
                      onValueChange={(v) => {
                        const job = jobs.find((j) => j.bookingId === b.id);
                        if (job) { setJobStatus(job.id, v as JobStatus); setJobs(listJobs()); }
                      }}
                    >
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Assigned">Assigned</SelectItem>
                        <SelectItem value="InProgress">InProgress</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Update status</span>
                    <Select value={b.status} onValueChange={(v) => { setBookingStatus(b.id, v as BookingStatus); setBookings(listBookings()); }}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Upcoming">Upcoming</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Payment</span>
                    <Select
                      value={(() => {
                        const p = payments.find((p) => p.bookingId === b.id);
                        return p ? p.method || "" : "";
                      })()}
                      onValueChange={(v) => {
                        const p = payments.find((p) => p.bookingId === b.id);
                        const amount = Number(String(b.price || "0").replace(/[^0-9.]/g, ""));
                        if (!p) { addPayment({ bookingId: b.id, amount, method: v }); }
                        else { addPayment({ bookingId: b.id, amount, method: v }); }
                        setPayments(listPayments());
                      }}
                    >
                      <SelectTrigger className="w-36"><SelectValue placeholder="Method" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const p = payments.find((p) => p.bookingId === b.id);
                        if (!p) {
                          const amount = Number(String(b.price || "0").replace(/[^0-9.]/g, ""));
                          addPayment({ bookingId: b.id, amount, method: "Cash" });
                          const created = listPayments().find((x) => x.bookingId === b.id);
                          if (created) setPaymentStatus(created.id, "Paid");
                        } else {
                          setPaymentStatus(p.id, "Paid");
                        }
                        setPayments(listPayments());
                      }}
                    >
                      Mark Paid
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    className="gradient-accent border-0 text-accent-foreground"
                    onClick={() => {
                      const amount = Number(String(b.price || "0").replace(/[^0-9.]/g, ""));
                      const inv = generateInvoice({ bookingId: b.id, customerEmail: b.customerEmail, amount });
                      setInvoices(listInvoices());
                      toast({ title: "Invoice generated", description: `${inv.invoiceNo} • ${inv.customerEmail} • $${inv.amount}` });
                    }}
                  >
                    Generate Invoice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        )}

        {(tab === "dashboard" || tab === "create-accounts") && (
        <motion.div {...fadeUp} transition={{ delay: 0.45 }} className="rounded-xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold">Manage Merchants & Staff</h2>
              <p className="text-sm text-muted-foreground">Add and remove team members</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-accent border-0 text-accent-foreground">Add Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Full Name</label>
                    <Input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Email</label>
                    <Input type="email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Role</label>
                    <Select value={newStaff.role} onValueChange={(v) => setNewStaff({ ...newStaff, role: v as MemberRole })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Staff">Staff</SelectItem>
                        <SelectItem value="Merchant">Merchant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      if (!newStaff.name || !newStaff.email) return;
                      if (newStaff.role === "Merchant") {
                        addRegistration({ name: newStaff.name, email: newStaff.email, role: "Merchant" });
                        setRegistrations(listRegistrations());
                      } else {
                        addStaff({ name: newStaff.name, email: newStaff.email, role: "Staff" });
                        setStaff(listStaff());
                      }
                      setNewStaff({ name: "", email: "", role: "Staff" });
                    }}
                    className="w-full gradient-accent border-0 text-accent-foreground"
                  >
                    Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-4 space-y-3">
            {users.filter((u) => u.role === "merchant").length === 0 && <div className="rounded-lg border p-4 text-sm text-muted-foreground">No merchants</div>}
            {users.filter((u) => u.role === "merchant").map((m) => (
              <div key={m.email} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-sm text-muted-foreground">{m.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Merchant</Badge>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await deleteUserByAdmin(m.id);
                        const u = await listUsersFromApi();
                        setUsers(u);
                        toast({ title: "Merchant removed", description: m.email });
                      } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        toast({ title: "Failed to remove", description: message, variant: "destructive" });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {users.filter((u) => u.role === "staff").length === 0 && <div className="rounded-lg border p-4 text-sm text-muted-foreground">No team members</div>}
            {users.filter((u) => u.role === "staff").map((m) => (
              <div key={m.email} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-sm text-muted-foreground">{m.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">Staff</Badge>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await deleteUserByAdmin(m.id);
                        const u = await listUsersFromApi();
                        setUsers(u);
                        toast({ title: "Staff removed", description: m.email });
                      } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        toast({ title: "Failed to remove", description: message, variant: "destructive" });
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        )}

        {(tab === "dashboard" || tab === "service-history") && (
        <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="rounded-xl border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold">Service History</h2>
              <p className="text-sm text-muted-foreground">Usage stats per service</p>
            </div>
            <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="bike">Bike</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 space-y-3">
            {serviceHistory.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No history for selected type</div>
            )}
            {serviceHistory.map((h) => (
              <div key={h.service} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-medium">{h.service}</div>
                <div className="flex items-center gap-4 text-sm">
                  <span>Total: <span className="font-semibold">{h.total}</span></span>
                  <span>Upcoming: <span className="font-semibold">{h.upcoming}</span></span>
                  <span>Completed: <span className="font-semibold">{h.completed}</span></span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        )}

        {(tab === "dashboard" || tab === "invoices") && (
        <motion.div {...fadeUp} transition={{ delay: 0.58 }} className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-heading text-xl font-bold">Invoices</h2>
          <div className="mt-4 space-y-3">
            {invoices.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No invoices</div>
            )}
            {invoices.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{inv.invoiceNo}</div>
                  <div className="text-sm text-muted-foreground">{inv.customerEmail} — ${inv.amount}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={inv.status === "Paid" ? "secondary" : "outline"}>{inv.status}</Badge>
                  {inv.status !== "Paid" && (
                    <Button size="sm" variant="outline" onClick={() => { markInvoicePaid(inv.id); setInvoices(listInvoices()); }}>Mark Paid</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        )}

        {(tab === "dashboard" || tab === "registration-history") && (
        <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-heading text-xl font-bold">Registration History</h2>
          <p className="text-sm text-muted-foreground">All users who registered</p>
          <div className="mt-4 space-y-3">
            {registrations.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No registrations yet</div>
            )}
            {registrations.map((r) => (
              <div key={r.email} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-sm text-muted-foreground">{r.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={r.role === "Staff" ? "secondary" : r.role === "Merchant" ? "outline" : "default"}>{r.role}</Badge>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        )}

        {(tab === "dashboard" || tab === "approval-history") && (
        <motion.div {...fadeUp} transition={{ delay: 0.6 }} className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-heading text-xl font-bold">Approval History</h2>
          <p className="text-sm text-muted-foreground">Records of approvals and rejections</p>
          <div className="mt-4 space-y-3">
            {approvalEvents.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No approval actions yet</div>
            )}
            {approvalEvents.map((e, i) => (
              <div key={`${e.email}-${i}`} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{e.email}</div>
                  <div className="text-sm text-muted-foreground">{e.role}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={e.status === "approved" ? "secondary" : "destructive"}>{e.status}</Badge>
                  <span className="text-xs text-muted-foreground">{e.date}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
