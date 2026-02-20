import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, UserCheck, UserX, ShoppingBag, TrendingUp, IndianRupee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listApprovals, setApprovalStatus, listRegistrations, deleteRegistration, listApprovalEvents, listBookings, listServices, addService, updateService, deleteService, setServicePrice, setBookingStatus, assignBookingSlot, listStaff, addStaff, deleteStaff, assignJob, listJobs, setJobStatus, listPayments, addPayment, setPaymentStatus, listInvoices, generateInvoice, markInvoicePaid, downloadInvoice, addNotificationForUser, createAdminUser, addRegistration, listUsersFromApi, deleteUserByAdmin, deleteApiBooking, updateUserLocationByAdmin, getCachedApiBookings, type ApiUser, type Approval, type Registration, type ApprovalEvent, type Booking, type ServiceItem, type VehicleType, type BookingStatus, type StaffMember, type StaffRoleType, type Job, type JobStatus, type Payment, type Invoice } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents, type MapContainerProps } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { listApiBookings, patchBookingApi, type ApiBooking, getAdminDashboardStats } from "@/lib/utils";

 

const AdminDashboard = () => {
  const { toast } = useToast();
  const { search } = useLocation();
  const tab = (() => {
    const p = new URLSearchParams(search);
    const t = p.get("tab");
    const allowed = new Set([
      "my-profile",
      "create-accounts",
      "merchants",
      "staff",
      "merchant-map",
      "recent-bookings",
      "service-history",
      "invoices",
      "registration-history",
      "staff-live-map",
      "settings",
      "dashboard",
    ]);
    return allowed.has(String(t)) ? String(t) : "dashboard";
  })();
  const [pending, setPending] = useState<Approval[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [approvalEvents, setApprovalEvents] = useState<ApprovalEvent[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [apiBookings, setApiBookings] = useState<ApiBooking[]>([]);
  const [loadingApiBookings, setLoadingApiBookings] = useState(false);
  const [apiBookingsLoadedOnce, setApiBookingsLoadedOnce] = useState(false);
  const [apiBookingsError, setApiBookingsError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [newInvoice, setNewInvoice] = useState<{ bookingId: string; email: string; amount: number }>({ bookingId: "", email: "", amount: 0 });
  const [savingInvoice, setSavingInvoice] = useState(false);
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
  const [adminStats, setAdminStats] = useState<{ totalUsers: number; activeBookings: number; revenue: number; onlineStaffCount: number } | null>(null);
  const [openReg, setOpenReg] = useState<Registration | null>(null);
  const iconDefaultProto = L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string };
  delete iconDefaultProto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
    iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
    shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
  });
  const merchantMapProps: MapContainerProps = useMemo(
    () => ({
      center: (merchantPos ?? [12.9716, 77.5946]) as [number, number],
      zoom: 13,
      style: { height: 256 },
      scrollWheelZoom: true,
    }),
    [merchantPos]
  );
  const staffMapProps: MapContainerProps = useMemo(
    () => ({
      center: (staffPos ?? [12.9716, 77.5946]) as [number, number],
      zoom: 13,
      style: { height: 256 },
      scrollWheelZoom: true,
    }),
    [staffPos]
  );
  const updateFromLatLng = (latStr?: string, lngStr?: string) => {
    const lt = typeof latStr === "string" ? parseFloat(latStr) : NaN;
    const lg = typeof lngStr === "string" ? parseFloat(lngStr) : NaN;
    if (!Number.isNaN(lt) && !Number.isNaN(lg)) {
      setMerchantPos([lt, lg]);
      setNewMerchant((m) => ({ ...m, location: `${lt.toFixed(8)},${lg.toFixed(8)}` }));
    }
  };
  const ClickMarker = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setMerchantPos([lat, lng]);
        setNewMerchant({ ...newMerchant, location: `${lat.toFixed(8)},${lng.toFixed(8)}` });
      },
    });
    return merchantPos ? <Marker position={merchantPos} /> : null;
  };
  const ClickMarkerStaff = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setStaffPos([lat, lng]);
        setNewStaffAccount({ ...newStaffAccount, location: `${lat.toFixed(8)},${lng.toFixed(8)}` });
      },
    });
    return staffPos ? <Marker position={staffPos} /> : null;
  };
  const useMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setMerchantPos([latitude, longitude]);
        setNewMerchant({ ...newMerchant, location: `${latitude.toFixed(8)},${longitude.toFixed(8)}` });
      });
    }
  };
  const useMyLocationStaff = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setStaffPos([latitude, longitude]);
        setNewStaffAccount({ ...newStaffAccount, location: `${latitude.toFixed(8)},${longitude.toFixed(8)}` });
      });
    }
  };
  async function loadRecentApiBookings(options: { includeUsers: boolean }) {
    setLoadingApiBookings(true);
    setApiBookingsError(null);
    const tasks: Promise<void>[] = [];
    if (options.includeUsers) {
      tasks.push(
        (async () => {
          try {
            const u = await listUsersFromApi();
            setUsers(u);
          } catch {
            /* ignore user fetch error */
          }
        })(),
      );
    }
    tasks.push(
      (async () => {
        try {
          const list = await listApiBookings({ limit: 100 });
          setApiBookings(list);
        } catch (e) {
          setApiBookings([]);
          const msg = e instanceof Error ? e.message : "Failed to fetch bookings";
          setApiBookingsError(msg);
        }
      })(),
    );
    try {
      await Promise.all(tasks);
    } finally {
      setLoadingApiBookings(false);
      setApiBookingsLoadedOnce(true);
    }
  }

  useEffect(() => {
    refresh();
    setRegistrations(listRegistrations());
    setApprovalEvents(listApprovalEvents());
    setBookings(listBookings());
    setStaff(listStaff());
    setJobs(listJobs());
    const cached = getCachedApiBookings({ limit: 100 });
    if (cached.length > 0) {
      setApiBookings(cached);
      setApiBookingsLoadedOnce(true);
    }
    void loadRecentApiBookings({ includeUsers: true });
    (async () => {
      try {
        const s = await getAdminDashboardStats();
        setAdminStats({
          totalUsers: s.totalUsers,
          activeBookings: s.activeBookings,
          revenue: s.revenue,
          onlineStaffCount: s.onlineStaffCount,
        });
      } catch {
        void 0;
      }
    })();
  }, []);
  useEffect(() => {
    setServices(listServices(vehicleType));
  }, [vehicleType]);
  useEffect(() => {
    if (tab === "recent-bookings" || tab === "dashboard") {
      void loadRecentApiBookings({ includeUsers: true });
    }
  }, [tab]);
  useEffect(() => {
    let timer: number | undefined;
    if (tab === "dashboard" || tab === "recent-bookings") {
      timer = window.setInterval(async () => {
        try {
          const tasks: Promise<void>[] = [];
          if (tab === "dashboard") {
            tasks.push(
              (async () => {
                try {
                  const u = await listUsersFromApi();
                  setUsers(u);
                } catch {
                  /* ignore */
                }
                try {
                  const s = await getAdminDashboardStats();
                  setAdminStats({ totalUsers: s.totalUsers, activeBookings: s.activeBookings, revenue: s.revenue, onlineStaffCount: s.onlineStaffCount });
                } catch {
                  /* ignore */
                }
              })(),
            );
          }
          tasks.push(
            (async () => {
              await loadRecentApiBookings({ includeUsers: false });
            })(),
          );
          await Promise.all(tasks);
        } catch { void 0; }
      }, 10000);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [tab]);
  useEffect(() => {
    if (!loadingApiBookings) return;
    const timeout = window.setTimeout(() => {
      setLoadingApiBookings(false);
      setApiBookingsLoadedOnce(true);
    }, 10000);
    return () => window.clearTimeout(timeout);
  }, [loadingApiBookings]);

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
  const removeRegistrationAndUser = async (email: string) => {
    try {
      const target = users.find((u) => String(u.email).toLowerCase() === String(email).toLowerCase());
      if (target?.id) {
        await deleteUserByAdmin(target.id);
      }
      deleteRegistration(email);
      setRegistrations(listRegistrations());
      try {
        const u = await listUsersFromApi();
        setUsers(u);
      } catch {
        // ignore refresh error
      }
      toast({ title: "Removed", description: email });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Failed", description: message, variant: "destructive" });
    }
  };
  const summaryStats = useMemo(() => {
    const totalUsers = adminStats ? adminStats.totalUsers : users.length;
    const activeBookings = apiBookings.filter((b) => String(b.status || "").toUpperCase() !== "COMPLETED").length;
    const revenue = adminStats ? adminStats.revenue : apiBookings
      .filter((b) => {
        const statusOk = ["DELIVERED", "COMPLETED"].includes(String(b.status || "").toUpperCase());
        const hasPayments = Array.isArray(b.payments) && b.payments.length > 0;
        return statusOk || hasPayments;
      })
      .reduce((sum, b) => {
        const bill = typeof b.billTotal === "number" ? b.billTotal : 0;
        if (bill && bill > 0) return sum + bill;
        const p = Array.isArray(b.payments) ? b.payments.reduce((s, x) => s + (Number(x.amount || 0) || 0), 0) : 0;
        return sum + p;
      }, 0);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
    let paidToday = 0;
    let paid7Days = 0;
    for (const b of apiBookings) {
      const pays = Array.isArray(b.payments) ? b.payments : [];
      for (const p of pays) {
        const amt = Number(p.amount || 0) || 0;
        if (!p.time || !amt) continue;
        const t = new Date(p.time);
        if (t >= startOfToday) paidToday += amt;
        if (t >= sevenDaysAgo) paid7Days += amt;
      }
    }
    return [
      { label: "Total Users", value: totalUsers.toLocaleString(), icon: Users, change: "" },
      { label: "Active Bookings", value: activeBookings.toString(), icon: ShoppingBag, change: "" },
      { label: "Revenue", value: `₹${revenue.toLocaleString("en-IN")}`, icon: IndianRupee, change: "" },
      { label: "Paid Today", value: `₹${paidToday.toLocaleString("en-IN")}`, icon: IndianRupee, change: "" },
      { label: "Paid 7 Days", value: `₹${paid7Days.toLocaleString("en-IN")}`, icon: IndianRupee, change: "" },
    ] as Array<{ label: string; value: string; icon: typeof Users; change: string }>;
  }, [users, apiBookings, adminStats]);

  const adminInvoices = useMemo(() => {
    const items: Invoice[] = [];
    for (const b of apiBookings) {
      const email = b.customerEmail || "";
      if (!email) continue;
      const hasBill = typeof b.billTotal === "number" && b.billTotal > 0;
      const pays = Array.isArray(b.payments) ? b.payments : [];
      const hasPays = pays.length > 0;
      if (!hasBill && !hasPays) continue;
      const paid = pays.reduce((s, x) => s + (Number(x.amount || 0) || 0), 0);
      const amount = hasBill ? b.billTotal! : paid;
      const baseDate = b.date ? new Date(b.date) : new Date();
      const invoiceNo = `INV-${baseDate.getFullYear()}-${String(b.id).slice(-5).toUpperCase()}`;
      const status: "Generated" | "Paid" =
        hasBill && paid >= b.billTotal!
          ? "Paid"
          : paid > 0
            ? "Paid"
            : "Generated";
      items.push({
        id: `${b.id}-admininv`,
        bookingId: b.id,
        customerEmail: email,
        amount,
        invoiceNo,
        status,
        createdAt: b.date || new Date().toISOString(),
      });
    }
    return items;
  }, [apiBookings]);
  const recentReviews = useMemo(() => {
    const reviewed = apiBookings.filter((b) => typeof b.ratingValue === "number");
    reviewed.sort((a, b) => {
      const ta = b.dropAt ? new Date(b.dropAt).getTime() : 0;
      const tb = a.dropAt ? new Date(a.dropAt).getTime() : 0;
      return ta - tb;
    });
    return reviewed.slice(0, 5);
  }, [apiBookings]);
  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <motion.h1 {...fadeUp} className="font-heading text-3xl font-bold">
          {tab === "my-profile" ? "My Profile" :
           tab === "dashboard" ? "Admin Dashboard" :
           tab === "create-accounts" ? "Create Accounts" :
           tab === "merchants" ? "Merchants" :
           tab === "staff" ? "Staff" :
           tab === "merchant-map" ? "Merchant Locations" :
           tab === "recent-bookings" ? "Recent Bookings" :
           tab === "service-history" ? "Service History" :
           tab === "invoices" ? "Invoices" :
           tab === "registration-history" ? "Registration History" :
           tab === "staff-live-map" ? "Staff Live Location" :
           "Settings"}
        </motion.h1>

        {tab === "my-profile" && (
          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold mb-4">Admin Details</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">Role</div>
                <div className="text-lg font-semibold">Admin</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="text-lg font-semibold">admin</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-lg font-semibold">admin@gmail.com</div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "dashboard" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryStats.map((s, i) => (
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
          <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold">Recent Reviews</h2>
            <div className="mt-4 space-y-3">
              {recentReviews.length === 0 && (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">No reviews yet</div>
              )}
              {recentReviews.map((b) => (
                <div key={b.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{b.service}</div>
                    <div className="text-xs text-muted-foreground">{b.customerEmail}</div>
                    <div className="text-xs text-muted-foreground">
                      Rating: {b.ratingValue}/5 {b.ratingComment ? `• "${b.ratingComment}"` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.dropAt && (
                      <span className="text-xs text-muted-foreground">{new Date(b.dropAt).toLocaleString()}</span>
                    )}
                    <Badge variant="outline">{b.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
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
                      <label className="mb-1 block text-sm font-medium">Selected Location</label>
                      <div className="flex items-center gap-2">
                        <Input value={newMerchant.location} readOnly />
                        <Button type="button" variant="outline" onClick={useMyLocation}>Use My Location</Button>
                      </div>
                      <div className="mt-3 rounded-lg border">
                        <MapContainer {...merchantMapProps}>
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
                    <label className="mb-1 block text-sm font-medium">Selected Location</label>
                    <div className="flex items-center gap-2">
                      <Input value={newStaffAccount.location} readOnly />
                      <Button type="button" variant="outline" onClick={useMyLocationStaff}>Use My Location</Button>
                    </div>
                    <div className="mt-3 rounded-lg border">
                      <MapContainer {...staffMapProps}>
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

        {tab === "merchants" && (
        <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-heading text-xl font-bold">Merchants</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {users.filter((u) => u.role === "merchant").map((m) => (
              <div key={m.id} className="rounded-lg border p-4">
                <div className="font-medium">{m.name || m.shopName || m.email}</div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
                {m.location?.formatted && (
                  <div className="text-xs text-muted-foreground mt-1">Location: {m.location.formatted}</div>
                )}
              </div>
            ))}
            {users.filter((u) => u.role === "merchant").length === 0 && (
              <div className="text-sm text-muted-foreground">No merchants found</div>
            )}
          </div>
        </motion.div>
        )}
        {tab === "staff" && (
        <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-heading text-xl font-bold">Staff</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {users.filter((u) => u.role === "staff").map((s) => (
              <div key={s.id} className="rounded-lg border p-4">
                <div className="font-medium">{s.name || s.email}</div>
                <div className="text-xs text-muted-foreground">{s.email}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {s.staffOnline ? "Online" : "Offline"}
                  {s.liveLocation?.lat !== undefined && s.liveLocation?.lng !== undefined
                    ? ` • ${s.liveLocation.lat}, ${s.liveLocation.lng}`
                    : ""}
                </div>
              </div>
            ))}
            {users.filter((u) => u.role === "staff").length === 0 && (
              <div className="text-sm text-muted-foreground">No staff found</div>
            )}
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
                  <span className="text-sm">Price: <span className="font-semibold">{s.price === 0 ? "Free" : `₹${s.price}`}</span></span>
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
            {!apiBookingsLoadedOnce && loadingApiBookings && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">Loading recent bookings…</div>
            )}
            {apiBookingsLoadedOnce && apiBookingsError && (
              <div className="rounded-lg border p-4 text-sm text-red-500">
                Failed to load recent bookings: {apiBookingsError}
              </div>
            )}
            {apiBookingsLoadedOnce && !loadingApiBookings && !apiBookingsError && apiBookings.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No bookings yet</div>
            )}
            {loadingApiBookings && apiBookingsLoadedOnce && apiBookings.length > 0 && (
              <div className="text-xs text-muted-foreground">Refreshing bookings…</div>
            )}
            {[...apiBookings]
              .sort((a, b) => {
                const rank = (s: unknown) => {
                  const u = String(s || "").toUpperCase();
                  if (u === "PENDING_ASSIGNMENT") return 0;
                  if (u === "ASSIGNED") return 1;
                  return 2;
                };
                const ra = rank(a.status);
                const rb = rank(b.status);
                if (ra !== rb) return ra - rb;
                const ta = a.lastUpdatedAt ? Date.parse(a.lastUpdatedAt) : 0;
                const tb = b.lastUpdatedAt ? Date.parse(b.lastUpdatedAt) : 0;
                if (ta !== tb) return tb - ta;
                const da = a.date ? Date.parse(a.date) : 0;
                const db = b.date ? Date.parse(b.date) : 0;
                return db - da;
              })
              .slice(0, 50)
              .map((b) => (
              <div key={b.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{b.customerEmail}</div>
                  <div className="text-sm text-muted-foreground">{(b.vehicle === "bike" ? "Bike" : "Car")} — {b.service}</div>
                  <div className="text-xs text-muted-foreground">Reg: {b.registration || "-"}</div>
                  {b.location && (
                    <div className="text-xs text-muted-foreground">
                      Location: {b.location.formatted ? b.location.formatted : (b.location.lat !== undefined && b.location.lng !== undefined ? `${b.location.lat}, ${b.location.lng}` : "-")}
                    </div>
                  )}
                  {Array.isArray(b.photosBefore) && b.photosBefore.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Before Pickup</div>
                      <div className="flex flex-wrap gap-2">
                        {b.photosBefore.slice(0, 4).map((src, i) => (
                          <Dialog key={`before-${i}`}>
                            <DialogTrigger asChild>
                              <img src={src} alt="Before" className="h-12 w-12 rounded object-cover border cursor-zoom-in" />
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl p-0">
                              <img src={src} alt="Before Full" className="w-full h-auto rounded" />
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(b.beforeServicePhotos) && b.beforeServicePhotos.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Before Service</div>
                      <div className="flex flex-wrap gap-2">
                        {b.beforeServicePhotos.slice(0, 4).map((src, i) => (
                          <Dialog key={`after-${i}`}>
                            <DialogTrigger asChild>
                              <img src={src} alt="After" className="h-12 w-12 rounded object-cover border cursor-zoom-in" />
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl p-0">
                              <img src={src} alt="After Full" className="w-full h-auto rounded" />
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(b.afterServicePhotos) && b.afterServicePhotos.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">After Service</div>
                      <div className="flex flex-wrap gap-2">
                        {b.afterServicePhotos.slice(0, 4).map((src, i) => (
                          <Dialog key={`ret-${i}`}>
                            <DialogTrigger asChild>
                              <img src={src} alt="Return" className="h-12 w-12 rounded object-cover border cursor-zoom-in" />
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl p-0">
                              <img src={src} alt="Return Full" className="w-full h-auto rounded" />
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    </div>
                  )}
                  {typeof b.estimateTotal === "number" && (
                    <div className="text-xs text-muted-foreground">
                      Estimate: ₹{(b.estimateLabour || 0)} + ₹{(b.estimateParts || 0)} + ₹{(b.estimateAdditional || 0)} = ₹{b.estimateTotal}
                    </div>
                  )}
                  {typeof b.ratingValue === "number" && (
                    <div className="text-xs text-muted-foreground">
                      Rating: {b.ratingValue}/5 {b.ratingComment ? `• "${b.ratingComment}"` : ""}
                    </div>
                  )}
                  {b.lastUpdatedMessage && (
                    <div className="text-xs text-muted-foreground">
                      {(b.lastUpdatedByRole ? b.lastUpdatedByRole.charAt(0).toUpperCase() + b.lastUpdatedByRole.slice(1) : "System")} — {b.lastUpdatedMessage}
                    </div>
                  )}
                  {(() => {
                    const paid = Array.isArray(b.payments) ? b.payments.reduce((s, x) => s + (Number(x.amount || 0) || 0), 0) : 0;
                    const bill = typeof b.billTotal === "number" ? b.billTotal : 0;
                    if (!paid && !bill) return null;
                    const due = Math.max(bill - paid, 0);
                    return (
                      <div className="text-xs text-muted-foreground">
                        {`Paid: ₹${paid.toLocaleString("en-IN")}`} {bill ? `• Due: ₹${due.toLocaleString("en-IN")}` : ""}
                      </div>
                    );
                  })()}
                  {Array.isArray(b.payments) && b.payments.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Payments</div>
                      <div className="flex flex-col gap-1">
                        {b.payments.slice(-3).map((p, i) => (
                          <div key={`pay-${i}`} className="text-xs">
                            ₹{Number(p.amount || 0)} • {p.method || "-"} {p.byRole ? `• ${p.byRole}` : ""} {p.time ? `• ${new Date(p.time).toLocaleString()}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                  <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-muted-foreground">{b.date} {b.time && `• ${b.time}`}</span>
                    {b.dropAt && (
                      <span className="text-xs text-muted-foreground">Dropped: {new Date(b.dropAt).toLocaleString()}</span>
                    )}
                  <Badge variant={String(b.status).toLowerCase() === "approved" ? "secondary" : String(b.status).toLowerCase() === "pending" ? "default" : String(b.status).toLowerCase() === "rejected" ? "destructive" : "outline"}>{b.status}</Badge>
                  {(() => {
                    const hasMedia =
                      (Array.isArray(b.photosBefore) && b.photosBefore.length > 0) ||
                      (Array.isArray(b.beforeServicePhotos) && b.beforeServicePhotos.length > 0) ||
                      (Array.isArray(b.afterServicePhotos) && b.afterServicePhotos.length > 0) ||
                      (Array.isArray(b.photosReturn) && b.photosReturn.length > 0);
                    if (!hasMedia) return null;
                    return (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">View Gallery</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Service Gallery</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {Array.isArray(b.photosBefore) && b.photosBefore.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-2">Before Pickup</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {b.photosBefore.map((src, i) => (
                                    <img key={`adg-bp-${i}`} src={src} alt="Before pickup" className="w-full h-28 object-cover rounded border" />
                                  ))}
                                </div>
                              </div>
                            )}
                            {Array.isArray(b.beforeServicePhotos) && b.beforeServicePhotos.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-2">Before Service</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {b.beforeServicePhotos.map((src, i) => (
                                    <img key={`adg-bs-${i}`} src={src} alt="Before service" className="w-full h-28 object-cover rounded border" />
                                  ))}
                                </div>
                              </div>
                            )}
                            {Array.isArray(b.afterServicePhotos) && b.afterServicePhotos.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-2">After Service</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {b.afterServicePhotos.map((src, i) => (
                                    <img key={`adg-as-${i}`} src={src} alt="After service" className="w-full h-28 object-cover rounded border" />
                                  ))}
                                </div>
                              </div>
                            )}
                            {Array.isArray(b.photosReturn) && b.photosReturn.length > 0 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-2">Return</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {b.photosReturn.map((src, i) => (
                                    <img key={`adg-r-${i}`} src={src} alt="Return" className="w-full h-28 object-cover rounded border" />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    );
                  })()}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Assign merchant</span>
                    <Select
                      value={String(b.merchantId || "")}
                      onValueChange={async (v) => {
                        try {
                          setApiBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, merchantId: v } : x)));
                          await patchBookingApi(b.id, { action: "assign_merchant", merchantId: v });
                          const next = await listApiBookings({ limit: 100 });
                          setApiBookings(next);
                        } catch (err) {
                          const message = err instanceof Error ? err.message : String(err);
                          toast({ title: "Failed to assign merchant", description: message, variant: "destructive" });
                          const next = await listApiBookings({ limit: 100 });
                          setApiBookings(next);
                        }
                      }}
                    >
                      <SelectTrigger className="w-44"><SelectValue placeholder="Select merchant" /></SelectTrigger>
                      <SelectContent>
                        {users.filter((u) => u.role === "merchant").length === 0 ? (
                          <SelectItem disabled value="_">No merchants</SelectItem>
                        ) : (
                          users.filter((u) => u.role === "merchant").map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Assign staff</span>
                    <Select
                      value={String(b.staffId || "")}
                      onValueChange={async (v) => {
                        try {
                          setApiBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, staffId: v } : x)));
                          await patchBookingApi(b.id, { action: "assign_staff", staffId: v });
                          const next = await listApiBookings({ limit: 100 });
                          setApiBookings(next);
                          addNotificationForUser(v, "New Task", `Booking assigned: ${b.service}`);
                          toast({ title: "Staff assigned", description: v });
                        } catch (err) {
                          const message = err instanceof Error ? err.message : String(err);
                          toast({ title: "Failed to assign staff", description: message, variant: "destructive" });
                          const next = await listApiBookings({ limit: 100 });
                          setApiBookings(next);
                        }
                      }}
                    >
                      <SelectTrigger className="w-44"><SelectValue placeholder="Select staff" /></SelectTrigger>
                      <SelectContent>
                        {users.filter((u) => u.role === "staff" && !!u.staffOnline).length === 0 ? (
                          <SelectItem disabled value="_">No online staff</SelectItem>
                        ) : (
                          users.filter((u) => u.role === "staff" && !!u.staffOnline).map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Update status</span>
                    <Select
                      value={String(b.status || "")}
                      onValueChange={async (v) => {
                        try {
                          await patchBookingApi(b.id, { action: "admin_update_status", status: v });
                          const next = await listApiBookings({ limit: 100 });
                          setApiBookings(next);
                          toast({ title: "Status updated", description: `${b.customerEmail} • ${v}` });
                        } catch (err) {
                          const message = err instanceof Error ? err.message : String(err);
                          toast({ title: "Failed to update status", description: message, variant: "destructive" });
                          const next = await listApiBookings({ limit: 100 });
                          setApiBookings(next);
                        }
                      }}
                    >
                      <SelectTrigger className="w-44"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="pickup_done">Pickup Done</SelectItem>
                        <SelectItem value="repair_done">Repair Done</SelectItem>
                        <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">Record Payment</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Record Payment</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-sm font-medium">Amount</label>
                            <Input id={`pay-amt-${b.id}`} type="number" placeholder="0" />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium">Method</label>
                            <Input id={`pay-met-${b.id}`} placeholder="UPI / Cash / Card" />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium">Reference</label>
                            <Input id={`pay-ref-${b.id}`} placeholder="Txn / UTR / last 4" />
                          </div>
                          <Button
                            onClick={async () => {
                              const amtEl = document.getElementById(`pay-amt-${b.id}`) as HTMLInputElement | null;
                              const metEl = document.getElementById(`pay-met-${b.id}`) as HTMLInputElement | null;
                              const refEl = document.getElementById(`pay-ref-${b.id}`) as HTMLInputElement | null;
                              const amount = Number(amtEl?.value || 0);
                              const method = metEl?.value || "";
                              const reference = refEl?.value || "";
                              if (!amount || amount <= 0) { toast({ title: "Amount required", variant: "destructive" }); return; }
                          try {
                            await patchBookingApi(b.id, { action: "add_payment", amount, method, reference });
                            const next = await listApiBookings({ limit: 100 });
                            setApiBookings(next);
                            toast({ title: "Payment recorded", description: `${b.customerEmail} • ₹${amount}` });
                          } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            toast({ title: "Failed to record", description: message, variant: "destructive" });
                          }
                            }}
                            className="w-full gradient-accent border-0 text-accent-foreground"
                          >
                            Save
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">Payment History</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Payment History</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                          {Array.isArray(b.payments) && b.payments.length > 0 ? (
                            <>
                              <div className="rounded-md border">
                                <div className="grid grid-cols-5 gap-2 p-2 text-xs font-medium text-muted-foreground">
                                  <div>Amount</div>
                                  <div>Method</div>
                                  <div>Reference</div>
                                  <div>By</div>
                                  <div>Time</div>
                                </div>
                                <div className="divide-y">
                                  {b.payments.map((p, i) => (
                                    <div key={`ah-${i}`} className="grid grid-cols-5 gap-2 p-2 text-xs">
                                      <div>₹{Number(p.amount || 0)}</div>
                                      <div>{p.method || "-"}</div>
                                      <div>{p.reference || "-"}</div>
                                      <div>{p.byRole || "-"}</div>
                                      <div>{p.time ? new Date(p.time).toLocaleString() : "-"}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const rows = [["amount","method","reference","byRole","time"], ...(b.payments || []).map(p => [
                                      String(p.amount ?? ""),
                                      String(p.method ?? ""),
                                      String(p.reference ?? ""),
                                      String(p.byRole ?? ""),
                                      p.time ? new Date(p.time).toISOString() : ""
                                    ])];
                                    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
                                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `payments-${b.id}.csv`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                  }}
                                >
                                  Export CSV
                                </Button>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-lg border p-4 text-sm text-muted-foreground">No payments yet</div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    {["paid", "delivered", "completed"].includes(String(b.status).toLowerCase()) ? (
                      <Badge variant="secondary">PAID</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await patchBookingApi(b.id, { action: "admin_update_status", status: "paid" });
                            const next = await listApiBookings({ limit: 100 });
                            setApiBookings(next);
                            toast({ title: "Marked Paid", description: b.customerEmail });
                          } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            toast({ title: "Failed to mark paid", description: message, variant: "destructive" });
                            const next = await listApiBookings({ limit: 100 });
                            setApiBookings(next);
                          }
                        }}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </div>
                  {String(b.status).toUpperCase() === "PENDING_ASSIGNMENT" ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="gradient-accent border-0 text-accent-foreground"
                        onClick={async () => {
                          if (!b.merchantId || !b.staffId) {
                            toast({ title: "Select merchant and staff", description: "Assign both merchant and staff before approval", variant: "destructive" });
                            return;
                          }
                          const ok = window.confirm(`Approve booking for ${b.customerEmail}?`);
                          if (!ok) return;
                          await patchBookingApi(b.id, { action: "approve" });
                          const next = await listApiBookings({ limit: 100 });
                          setApiBookings(next);
                          addNotificationForUser(String(b.merchantId), "New Booking", `Assigned booking for ${b.customerEmail}`);
                          toast({ title: "Approved", description: b.customerEmail });
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30"
                        onClick={async () => {
                          await patchBookingApi(b.id, { action: "reject" });
                          const next = await listApiBookings({ limit: 100 });
                          setApiBookings(next);
                          toast({ title: "Rejected", description: b.customerEmail });
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="gradient-accent border-0 text-accent-foreground"
                        onClick={async () => {
                          const amount = Number(String(b.price || "0").replace(/[^0-9.]/g, ""));
                          if (!amount || !b.id) return;
                          try {
                            await patchBookingApi(b.id, {
                              action: "add_payment",
                              amount,
                              method: "admin",
                              reference: "manual-invoice",
                            });
                            const next = await listApiBookings({ limit: 100 });
                            setApiBookings(next);
                            toast({ title: "Invoice recorded", description: `${b.customerEmail} • ₹${amount}` });
                          } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            toast({ title: "Failed", description: message, variant: "destructive" });
                          }
                        }}
                      >
                        Generate Invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          const ok = window.confirm(`Delete booking for ${b.customerEmail}? This cannot be undone.`);
                          if (!ok) return;
                          try {
                            await deleteApiBooking(b.id);
                            const next = await listApiBookings({ limit: 100 });
                            setApiBookings(next);
                            toast({ title: "Booking deleted", description: b.customerEmail });
                          } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            toast({ title: "Delete failed", description: message, variant: "destructive" });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{String(b.status).toUpperCase()}</Badge>
                      <Button
                        size="sm"
                        className="gradient-accent border-0 text-accent-foreground"
                        onClick={async () => {
                          const amount = Number(String(b.price || "0").replace(/[^0-9.]/g, ""));
                          if (!amount || !b.id) return;
                          try {
                            await patchBookingApi(b.id, {
                              action: "add_payment",
                              amount,
                              method: "admin",
                              reference: "manual-invoice",
                            });
                            const next = await listApiBookings({ limit: 100 });
                            setApiBookings(next);
                            toast({ title: "Invoice recorded", description: `${b.customerEmail} • ₹${amount}` });
                          } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            toast({ title: "Failed", description: message, variant: "destructive" });
                          }
                        }}
                      >
                        Generate Invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          const ok = window.confirm(`Delete booking for ${b.customerEmail}? This cannot be undone.`);
                          if (!ok) return;
                          try {
                            await deleteApiBooking(b.id);
                            const next = await listApiBookings({ limit: 100 });
                            setApiBookings(next);
                            toast({ title: "Booking deleted", description: b.customerEmail });
                          } catch (err) {
                            const message = err instanceof Error ? err.message : String(err);
                            toast({ title: "Delete failed", description: message, variant: "destructive" });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
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
              <MerchantRow key={m.email} merchant={m} onChanged={async () => { try { const u = await listUsersFromApi(); setUsers(u); } catch { void 0; } }} />
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {users.filter((u) => u.role === "staff").length === 0 && <div className="rounded-lg border p-4 text-sm text-muted-foreground">No team members</div>}
            {users.filter((u) => u.role === "staff").map((m) => (
              <StaffRow key={m.email} staff={m} onChanged={async () => { try { const u = await listUsersFromApi(); setUsers(u); } catch { void 0; } }} />
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
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold">Invoices</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-accent border-0 text-accent-foreground">Generate Invoice</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate Invoice</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Booking</label>
                    <Select
                      value={newInvoice.bookingId}
                      onValueChange={(val) => {
                        const b = apiBookings.find((x) => x.id === val);
                        setNewInvoice({
                          bookingId: val,
                          email: b?.customerEmail || newInvoice.email,
                          amount: typeof b?.price === "number" ? b!.price! : newInvoice.amount,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select booking" />
                      </SelectTrigger>
                      <SelectContent>
                        {apiBookings.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.customerEmail} — {b.service} {b.date ? `(${b.date})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Customer Email</label>
                    <Input
                      type="email"
                      value={newInvoice.email}
                      onChange={(e) => setNewInvoice({ ...newInvoice, email: e.target.value })}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Amount</label>
                    <Input
                      type="number"
                      value={String(newInvoice.amount || "")}
                      onChange={(e) => setNewInvoice({ ...newInvoice, amount: Number(e.target.value || 0) })}
                      placeholder="49"
                    />
                  </div>
                  <Button
                    disabled={savingInvoice || !newInvoice.bookingId || !newInvoice.email || !newInvoice.amount}
                    onClick={async () => {
                      if (!newInvoice.bookingId || !newInvoice.amount) return;
                      try {
                        setSavingInvoice(true);
                        await patchBookingApi(newInvoice.bookingId, {
                          action: "add_payment",
                          amount: newInvoice.amount,
                          method: "admin",
                          reference: "manual-invoice",
                        });
                        const next = await listApiBookings({ limit: 100 });
                        setApiBookings(next);
                        setNewInvoice({ bookingId: "", email: "", amount: 0 });
                        toast({ title: "Invoice recorded" });
                      } catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        toast({ title: "Failed", description: message, variant: "destructive" });
                      } finally {
                        setSavingInvoice(false);
                      }
                    }}
                    className="w-full gradient-accent border-0 text-accent-foreground"
                  >
                    {savingInvoice ? (<span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving...</span>) : "Save"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-4 space-y-3">
            {adminInvoices.length === 0 && (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No invoices</div>
            )}
            {adminInvoices.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{inv.invoiceNo}</div>
                  <div className="text-sm text-muted-foreground">{inv.customerEmail} — ₹{inv.amount}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={inv.status === "Paid" ? "secondary" : "outline"}>{inv.status}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const b = apiBookings.find((x) => x.id === inv.bookingId);
                      downloadInvoice(inv, { service: b?.service, date: b?.date });
                    }}
                  >
                    Download
                  </Button>
                  {inv.status !== "Paid" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const b = apiBookings.find((x) => x.id === inv.bookingId);
                        if (!b) return;
                        const bill = typeof b.billTotal === "number" && b.billTotal > 0 ? b.billTotal : inv.amount;
                        const paid = Array.isArray(b.payments)
                          ? b.payments.reduce((s, x) => s + (Number(x.amount || 0) || 0), 0)
                          : 0;
                        const remaining = bill - paid;
                        if (remaining <= 0) return;
                        try {
                          await patchBookingApi(b.id, {
                            action: "add_payment",
                            amount: remaining,
                            method: "admin",
                            reference: "mark-paid",
                          });
                          const next = await listApiBookings({ limit: 100 });
                          setApiBookings(next);
                          toast({ title: "Marked as paid", description: inv.invoiceNo });
                        } catch (err) {
                          const message = err instanceof Error ? err.message : String(err);
                          toast({ title: "Failed", description: message, variant: "destructive" });
                        }
                      }}
                    >
                      Mark Paid
                    </Button>
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
                  <Button size="sm" variant="outline" onClick={() => setOpenReg(r)}>View</Button>
                  <Button size="sm" variant="destructive" onClick={() => removeRegistrationAndUser(r.email)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
          <Dialog open={!!openReg} onOpenChange={(v) => setOpenReg(v ? openReg : null)}>
            <DialogTrigger asChild><span /></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registration Details</DialogTitle>
              </DialogHeader>
              {openReg ? (
                <div className="space-y-2">
                  <div className="text-sm"><span className="font-medium">Name:</span> {openReg.name}</div>
                  <div className="text-sm"><span className="font-medium">Email:</span> {openReg.email}</div>
                  <div className="text-sm"><span className="font-medium">Role:</span> {openReg.role}</div>
                  <div className="text-sm"><span className="font-medium">Date:</span> {openReg.date}</div>
                  <div className="text-sm"><span className="font-medium">Address:</span> {openReg.address || "-"}</div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        </motion.div>
        )}

        {tab === "merchant-map" && (
          <motion.div {...fadeUp} transition={{ delay: 0.52 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold">Merchant Locations</h2>
            <div className="mt-4">
              {users.filter((u) => u.role === "merchant" && u.location?.lat !== undefined && u.location?.lng !== undefined).length === 0 ? (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">No merchants with saved location</div>
              ) : (
                <div className="rounded-lg border">
                  <MapContainer center={[
                    users.find((u) => u.role === "merchant" && u.location?.lat !== undefined && u.location?.lng !== undefined)?.location?.lat || 20,
                    users.find((u) => u.role === "merchant" && u.location?.lat !== undefined && u.location?.lng !== undefined)?.location?.lng || 78
                  ]} zoom={12} style={{ height: 360 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {users.filter((u) => u.role === "merchant" && u.location?.lat !== undefined && u.location?.lng !== undefined).map((m) => (
                      <Marker key={m.id} position={[m.location!.lat as number, m.location!.lng as number]} />
                    ))}
                  </MapContainer>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {users.filter((u) => u.role === "merchant").length} merchants • {users.filter((u) => u.role === "merchant" && u.location?.lat !== undefined && u.location?.lng !== undefined).length} with location
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === "staff-live-map" && (
          <motion.div {...fadeUp} transition={{ delay: 0.55 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold">Staff Live Map</h2>
            <div className="mt-4">
              {users.filter((u) => u.role === "staff" && u.staffOnline && u.liveLocation?.lat !== undefined && u.liveLocation?.lng !== undefined).length === 0 ? (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">No online staff with live location</div>
              ) : (
                <div className="rounded-lg border">
                  <MapContainer center={[
                    users.find((u) => u.role === "staff" && u.staffOnline && u.liveLocation?.lat !== undefined && u.liveLocation?.lng !== undefined)?.liveLocation?.lat || 20,
                    users.find((u) => u.role === "staff" && u.staffOnline && u.liveLocation?.lat !== undefined && u.liveLocation?.lng !== undefined)?.liveLocation?.lng || 78
                  ]} zoom={12} style={{ height: 360 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {users.filter((u) => u.role === "staff" && u.staffOnline && u.liveLocation?.lat !== undefined && u.liveLocation?.lng !== undefined).map((s) => (
                      <Marker key={s.id} position={[s.liveLocation!.lat as number, s.liveLocation!.lng as number]} />
                    ))}
                  </MapContainer>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {users.filter((u) => u.role === "staff" && u.staffOnline).length} online • {users.filter((u) => u.role === "staff" && u.staffOnline && u.liveLocation?.lat !== undefined && u.liveLocation?.lng !== undefined).length} sharing location
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;

function MerchantRow({ merchant, onChanged }: { merchant: ApiUser; onChanged: () => void | Promise<void> }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<[number, number] | null>(() => {
    const lat = merchant.location?.lat; const lng = merchant.location?.lng;
    return typeof lat === "number" && typeof lng === "number" ? [lat, lng] : null;
  });
  const [saving, setSaving] = useState(false);
  const center: [number, number] = (pos ?? [12.9716, 77.5946]) as [number, number];
  const mapProps: MapContainerProps = { center, zoom: 14, style: { height: 256 }, scrollWheelZoom: true };
  function Clicker() {
    useMapEvents({
      click(e) {
        setPos([e.latlng.lat, e.latlng.lng]);
      },
    });
    return pos ? <Marker position={pos} /> : null;
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium">{merchant.name}</div>
        <div className="text-sm text-muted-foreground">{merchant.email}</div>
        <div className="text-xs text-muted-foreground">
          {merchant.location?.lat !== undefined && merchant.location?.lng !== undefined
            ? `${merchant.location.lat},${merchant.location.lng}`
            : "No location"} 
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline">Merchant</Badge>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">Edit Location</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merchant Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg border">
                <MapContainer {...mapProps}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Clicker />
                </MapContainer>
              </div>
              <div className="text-xs text-muted-foreground">
                {pos ? `${pos[0].toFixed(8)}, ${pos[1].toFixed(8)}` : "Click on the map to set location"}
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={!pos || saving}
                  onClick={async () => {
                    if (!pos) return;
                    try {
                      setSaving(true);
                      await updateUserLocationByAdmin(merchant.id, pos[0], pos[1]);
                      setOpen(false);
                      await onChanged();
                      toast({ title: "Location updated", description: merchant.email });
                    } catch (err) {
                      const message = err instanceof Error ? err.message : String(err);
                      toast({ title: "Failed to update", description: message, variant: "destructive" });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="gradient-accent border-0 text-accent-foreground"
                >
                  {saving ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Saving</span> : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button
          size="sm"
          variant="destructive"
          onClick={async () => {
            try {
              await deleteUserByAdmin(merchant.id);
              await onChanged();
              toast({ title: "Merchant removed", description: merchant.email });
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
  );
}

function StaffRow({ staff, onChanged }: { staff: ApiUser; onChanged: () => void | Promise<void> }) {
  const { toast } = useToast();
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium">{staff.name}</div>
        <div className="text-sm text-muted-foreground">{staff.email}</div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary">Staff</Badge>
        <Button
          size="sm"
          variant="destructive"
          onClick={async () => {
            try {
              await deleteUserByAdmin(staff.id);
              await onChanged();
              toast({ title: "Staff removed", description: staff.email });
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
  );
}
