import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Car, ShoppingBag, Clock, CheckCircle, Pencil, Image as ImageIcon, Trash2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { getAuth, setAuth, listCustomerVehiclesFromApi, createCustomerVehicleApi, deleteCustomerVehicleFromApi, fetchVehicleDetails, listApiBookings, createBookingApi, listInvoices, downloadInvoice, listUsersFromApi, updateMyProfileApi, getCurrentUserFromApi, patchBookingApi, type CustomerVehicle, type VehicleType, type ApiBooking, type Invoice, type ApiUser } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents, type MapContainerProps } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const CustomerDashboard = () => {
  const { toast } = useToast();
  const { search } = useLocation();
  const [apiBookings, setApiBookings] = useState<ApiBooking[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [bookingForm, setBookingForm] = useState<{ vehicle: VehicleType; service: string; registration?: string; location?: string; date?: string; time?: string }>({ vehicle: "car", service: "" });
  const [custPos, setCustPos] = useState<[number, number] | null>(null);
  const iconDefaultProto = L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string };
  delete iconDefaultProto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
    iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
    shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
  });
  const mapProps: MapContainerProps = useMemo(
    () => ({
      center: (custPos ?? [20.5937, 78.9629]) as [number, number],
      zoom: custPos ? 13 : 4,
      style: { height: 240 },
      scrollWheelZoom: true,
    }),
    [custPos]
  );
  const [vehicleForm, setVehicleForm] = useState<{ type: VehicleType; make: string; model: string; year: string; engine?: string; displacement?: string; power_hp?: string; reg?: string }>({ type: "car", make: "", model: "", year: "" });
  const tab = (() => {
    const p = new URLSearchParams(search);
    const t = p.get("tab");
    const allowed = new Set(["my-profile", "dashboard", "my-bookings", "invoices", "my-vehicles", "settings"]);
    return allowed.has(String(t)) ? String(t) : "dashboard";
  })();
  const session = getAuth();
  const [profileName, setProfileName] = useState<string>(session?.name || "edu");
  const [editOpen, setEditOpen] = useState(false);
  const [tempName, setTempName] = useState<string>(profileName);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  useEffect(() => {
    (async () => {
      const session = getAuth();
      let email = session?.email || "";
      try {
        if (!email) {
          const me = await getCurrentUserFromApi();
          if (me?.email) {
            email = me.email;
            if (session) setAuth({ ...session, email: me.email });
          }
        }
      } catch {
        /* ignore missing current user */
      }
      const tasks: Promise<void>[] = [];
      tasks.push(
        (async () => {
          try {
            const list = await listApiBookings(
              session?.role === "Admin" || !email ? { limit: 100 } : { email, limit: 100 },
            );
            setApiBookings(list);
          } catch {
            setApiBookings([]);
          }
        })(),
      );
      tasks.push(
        (async () => {
          try {
            if (email) {
              const v = await listCustomerVehiclesFromApi(email);
              setVehicles(v);
            } else {
              setVehicles([]);
            }
          } catch {
            setVehicles([]);
          }
        })(),
      );
      tasks.push(
        (async () => {
          try {
            const u = await listUsersFromApi();
            setUsers(u);
          } catch {
            setUsers([]);
          }
        })(),
      );
      await Promise.all(tasks);
    })();
    const id = setInterval(async () => {
      const session = getAuth();
      const email = session?.email || "";
      try {
        const list = await listApiBookings(
          session?.role === "Admin" || !email ? { limit: 100 } : { email, limit: 100 },
        );
        setApiBookings(list);
      } catch (_e) {
        void 0;
      }
      try {
        const u = await listUsersFromApi();
        setUsers(u);
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(id);
  }, []);
  const total = apiBookings.length;
  const upcoming = apiBookings.filter((b) => String(b.status).toLowerCase() === "approved").length;
  const completed = apiBookings.filter((b) => String(b.status).toLowerCase() === "completed").length;
  const stats = [
    { label: "My Vehicles", value: String(vehicles.length), icon: Car },
    { label: "Total Bookings", value: String(total), icon: ShoppingBag },
    { label: "Upcoming", value: String(upcoming), icon: Clock },
    { label: "Completed", value: String(completed), icon: CheckCircle },
  ];
  return (
    <DashboardLayout role="customer">
      <div className="space-y-6">
        {tab === "dashboard" && (
          <motion.div {...fadeUp} className="flex items-center justify-between">
            <h1 className="font-heading text-3xl font-bold">My Dashboard</h1>
            <Link to="/services">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="gradient-accent border-0 text-accent-foreground">Book Service</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Book a Service</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Vehicle Type</label>
                      <Select value={bookingForm.vehicle} onValueChange={(v) => setBookingForm({ ...bookingForm, vehicle: v as VehicleType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="car">Car</SelectItem>
                          <SelectItem value="bike">Bike</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Select Vehicle</label>
                      {vehicles.length === 0 ? (
                        <div className="rounded-lg border p-3 text-sm text-destructive">No vehicles saved. Please add a vehicle first.</div>
                      ) : (
                        <Select value={bookingForm.registration || ""} onValueChange={(v) => setBookingForm({ ...bookingForm, registration: v })}>
                          <SelectTrigger><SelectValue placeholder="Select vehicle (plate)" /></SelectTrigger>
                          <SelectContent>
                            {vehicles.map((v) => (
                              <SelectItem key={v.id} value={v.plate || v.vin || ""}>{v.plate || v.vin || `${v.make} ${v.model}`}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Pickup Location</label>
                      <div className="space-y-2">
                        <Input value={bookingForm.location || ""} onChange={(e) => setBookingForm({ ...bookingForm, location: e.target.value })} placeholder="Address (optional)" />
                        <div className="rounded-lg border">
                          <MapContainer {...mapProps}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <ClickPicker onPick={(latlng) => setCustPos([latlng.lat, latlng.lng])} />
                            {custPos && <Marker position={custPos} />}
                          </MapContainer>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (!("geolocation" in navigator)) {
                                toast({ title: "Location unavailable", description: "Your browser does not support location access.", variant: "destructive" });
                                return;
                              }
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  const { latitude, longitude } = pos.coords;
                                  setCustPos([latitude, longitude]);
                                  setBookingForm((prev) => ({
                                    ...prev,
                                    location: prev.location && prev.location.trim().length > 0 ? prev.location : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                                  }));
                                },
                                (err) => {
                                  const code = typeof err.code === "number" ? err.code : -1;
                                  if (code === 3 && custPos) {
                                    return;
                                  }
                                  const message =
                                    code === 1
                                      ? "Location permission denied. Please allow access in your browser."
                                      : code === 2
                                      ? "Location unavailable. Try again in an open area."
                                      : code === 3
                                      ? "Getting location timed out. Please try again."
                                      : "Could not fetch your location.";
                                  toast({ title: "Location error", description: message, variant: "destructive" });
                                },
                                { enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 },
                              );
                            }}
                          >
                            Use My Location
                          </Button>
                          {custPos && <span className="text-xs text-muted-foreground">Selected: {custPos[0].toFixed(5)}, {custPos[1].toFixed(5)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Date</label>
                        <Input value={bookingForm.date || ""} onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })} placeholder="YYYY-MM-DD" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Time</label>
                        <Input value={bookingForm.time || ""} onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })} placeholder="HH:MM" />
                      </div>
                    </div>
                    <Button
                      onClick={async () => {
                        const session = getAuth();
                        if (!session?.email) return;
                        if (!bookingForm.registration?.trim()) {
                          toast({ title: "Vehicle number required", description: "Enter your registration number", variant: "destructive" });
                          return;
                        }
                        if (!bookingForm.date) {
                          toast({ title: "Date required", description: "Select a service date", variant: "destructive" });
                          return;
                        }
                        try {
                          const serviceDefault = bookingForm.vehicle === "bike" ? "Periodic Service" : "General Service";
                          await createBookingApi({
                            customerEmail: session.email,
                            vehicle: bookingForm.vehicle,
                            service: serviceDefault,
                            registration: bookingForm.registration?.trim(),
                            location: custPos ? { formatted: bookingForm.location, lat: custPos[0], lng: custPos[1] } : bookingForm.location,
                            date: bookingForm.date,
                            time: bookingForm.time,
                          });
                          const list = await listApiBookings({ email: session.email, limit: 100 });
                          setApiBookings(list);
                          setBookingForm({ vehicle: "car", service: "" });
                          setCustPos(null);
                          toast({ title: "Booking created", description: "Waiting for admin approval" });
                        } catch (err) {
                          const m = err instanceof Error ? err.message : String(err);
                          toast({ title: "Failed to book", description: m, variant: "destructive" });
                        }
                      }}
                      className="w-full gradient-accent border-0 text-accent-foreground"
                    >
                      Save
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </Link>
          </motion.div>
        )}
        {tab === "my-profile" && (
          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold mb-4">My Profile</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">Role</div>
                <div className="text-lg font-semibold">Customer</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Name</div>
                  <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Edit name" onClick={() => setTempName(profileName)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Edit Name</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input value={tempName} onChange={(e) => setTempName(e.target.value)} placeholder="Enter new name" />
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                          <Button
                            onClick={async () => {
                              try {
                                const nextName = (tempName || "").trim() || "edu";
                                const resp = await updateMyProfileApi({ name: nextName });
                                if (resp.user) {
                                  const current = getAuth();
                                  if (current) {
                                    setAuth({ ...current, name: resp.user.name, email: resp.user.email || current.email, role: current.role, token: current.token });
                                  }
                                }
                                setProfileName(nextName);
                                // refresh visible user lists (e.g., for merchants/staff who display names)
                                try {
                                  const u = await listUsersFromApi();
                                  setUsers(u);
                                } catch (e) { void e; }
                                setEditOpen(false);
                                toast({ title: "Profile updated", description: nextName });
                              } catch (err) {
                                const msg = err instanceof Error ? err.message : String(err);
                                toast({ title: "Update failed", description: msg, variant: "destructive" });
                              }
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="mt-2 text-lg font-semibold">{profileName}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-lg font-semibold">{session?.email || "edu@gmail.com"}</div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "dashboard" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.1 }} className="rounded-xl border bg-card p-5 shadow-card">
                <s.icon className="h-8 w-8 text-accent" />
                <div className="mt-3 font-heading text-2xl font-bold">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === "my-vehicles" && (
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
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Type</label>
                        <Select value={vehicleForm.type} onValueChange={(v) => setVehicleForm({ ...vehicleForm, type: v as VehicleType })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="car">Car</SelectItem>
                            <SelectItem value="bike">Bike</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Make</label>
                        <Input value={vehicleForm.make} onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })} placeholder="e.g. Maruti" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Model</label>
                        <Input value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="e.g. Swift" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Year</label>
                        <Input value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} placeholder="e.g. 2021" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Engine</label>
                        <Input value={vehicleForm.engine || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, engine: e.target.value })} placeholder="e.g. 1.2L Petrol" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Displacement</label>
                        <Input value={vehicleForm.displacement || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, displacement: e.target.value })} placeholder="e.g. 1197 cc" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Power (HP)</label>
                        <Input value={vehicleForm.power_hp || ""} onChange={(e) => setVehicleForm({ ...vehicleForm, power_hp: e.target.value })} placeholder="e.g. 89" />
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
                            const details = (await fetchVehicleDetails({ type: vehicleForm.type, reg: vehicleForm.reg })) as { type?: string; make?: string; model?: string; year?: string; engine?: string; displacement?: string; power_hp?: string };
                            setVehicleForm({
                              ...vehicleForm,
                              type: details?.type === "bike" ? "bike" : (details?.type === "car" ? "car" : vehicleForm.type),
                              engine: details?.engine || vehicleForm.engine,
                              displacement: details?.displacement || vehicleForm.displacement,
                              power_hp: details?.power_hp || vehicleForm.power_hp,
                              make: details?.make || vehicleForm.make,
                              model: details?.model || vehicleForm.model,
                              year: details?.year || vehicleForm.year,
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
                        onClick={async () => {
                          const session = getAuth();
                          if (!session?.email) return;
                          if (!vehicleForm.reg) {
                            toast({ title: "Registration required", description: "Enter your vehicle registration number", variant: "destructive" });
                            return;
                          }
                          let make = vehicleForm.make;
                          let model = vehicleForm.model;
                          let year = vehicleForm.year;
                          let engine = vehicleForm.engine;
                          let displacement = vehicleForm.displacement;
                          let power_hp = vehicleForm.power_hp;
                          try {
                            if (!make || !model || !year || !engine || !displacement || !power_hp) {
                              const details = (await fetchVehicleDetails({
                                type: vehicleForm.type,
                                make,
                                model,
                                year,
                                reg: vehicleForm.reg,
                              })) as { make?: string; model?: string; year?: string; engine?: string; displacement?: string; power_hp?: string };
                              make = details.make || make || "";
                              model = details.model || model || "";
                              year = details.year || year || "";
                              engine = details.engine || engine || "Unknown";
                              displacement = details.displacement || displacement || "Unknown";
                              power_hp = details.power_hp || power_hp || "Unknown";
                            }
                            await createCustomerVehicleApi({
                              ownerEmail: session.email,
                              type: vehicleForm.type,
                              make,
                              model,
                              year,
                              engine,
                              displacement,
                              power_hp,
                              vin: vehicleForm.reg || undefined,
                              plate: vehicleForm.reg || "",
                            });
                            const v = await listCustomerVehiclesFromApi(session.email);
                            setVehicles(v);
                            setVehicleForm({ type: "car", make: "", model: "", year: "" });
                            toast({ title: "Vehicle added", description: "Saved to your garage" });
                          } catch (err) {
                            const m = err instanceof Error ? err.message : String(err);
                            toast({ title: "Failed to save vehicle", description: m, variant: "destructive" });
                          }
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
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{v.engine || v.displacement || "Spec"}</Badge>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={async () => {
                        const ok = window.confirm("Are you sure you want to delete this vehicle? This action cannot be undone.");
                        if (!ok) return;
                        const session = getAuth();
                        if (!session?.email) return;
                        try {
                          await deleteCustomerVehicleFromApi(v.id, session.email);
                          const next = await listCustomerVehiclesFromApi(session.email);
                          setVehicles(next);
                          toast({ title: "Vehicle deleted", description: v.plate || v.vin || "" });
                        } catch (err) {
                          const m = err instanceof Error ? err.message : String(err);
                          toast({ title: "Failed to delete vehicle", description: m, variant: "destructive" });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "my-bookings" && (
          <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold">My Bookings</h2>
            <div className="mt-4 space-y-3">
              {apiBookings.length === 0 && (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">No bookings yet</div>
              )}
              {apiBookings.map((b) => (
                <div key={b.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{b.service}</div>
                    <div className="text-sm text-muted-foreground">{b.vehicle === "bike" ? "Bike" : "Car"}</div>
                    {b.lastUpdatedMessage && (
                      <div className="text-xs text-muted-foreground">
                        {(b.lastUpdatedByRole ? b.lastUpdatedByRole.charAt(0).toUpperCase() + b.lastUpdatedByRole.slice(1) : "Update")} — {b.lastUpdatedMessage}
                      </div>
                    )}
                    {b.dropAt && (
                      <div className="text-xs text-muted-foreground">Dropped: {new Date(b.dropAt).toLocaleString()}</div>
                    )}
                    {Array.isArray(b.photosBefore) && b.photosBefore.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">Before Pickup</div>
                        <div className="flex flex-wrap gap-2">
                          {b.photosBefore.slice(0, 4).map((src, i) => (
                            <Dialog key={`before-${i}`}>
                              <DialogTrigger asChild>
                                <img src={src} alt="Before" className="h-14 w-14 rounded object-cover border cursor-zoom-in" />
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
                                <img src={src} alt="After" className="h-14 w-14 rounded object-cover border cursor-zoom-in" />
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
                                <img src={src} alt="Return" className="h-14 w-14 rounded object-cover border cursor-zoom-in" />
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
                    {(() => {
                      const su = String(b.status || "").toUpperCase();
                      const canRate = su === "DELIVERED" || su === "COMPLETED";
                      if (!canRate) return null;
                      if (typeof b.ratingValue === "number") {
                        return (
                          <div className="mt-1 text-xs text-muted-foreground">
                            Rating: {b.ratingValue}/5 {b.ratingComment ? `• "${b.ratingComment}"` : ""}
                          </div>
                        );
                      }
                      return (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReviewBookingId(b.id);
                              setReviewRating(5);
                              setReviewComment("");
                            }}
                          >
                            Review Service
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{b.date || "-"} {b.time && `• ${b.time}`}</span>
                    <Badge variant={String(b.status).toLowerCase() === "approved" ? "secondary" : String(b.status).toLowerCase() === "pending" ? "default" : String(b.status).toLowerCase() === "rejected" ? "destructive" : "outline"}>{b.status}</Badge>
                  </div>
              {(() => {
                const staff = users.find((u) => u.id && String(u.id) === String(b.staffId));
                const live = staff?.liveLocation;
                const hasLive = !!(live && live.lat !== undefined && live.lng !== undefined);
                const statusUpper = String(b.status).toUpperCase();
                if (!hasLive) return null;
                if (statusUpper === "COMPLETED" || statusUpper === "DELIVERED") return null;
                return (
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                      Staff: {staff?.name || staff?.email || "Assigned"} {staff?.staffOnline ? "• Online" : "• Offline"}
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">Track Location</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Staff Live Location</DialogTitle>
                          </DialogHeader>
                          <div className="rounded-lg overflow-hidden">
                            <MapContainer center={[Number(live!.lat), Number(live!.lng)] as [number, number]} zoom={14} style={{ height: 380 }} scrollWheelZoom>
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              <Marker position={[Number(live!.lat), Number(live!.lng)] as [number, number]} />
                              {b.location?.lat !== undefined && b.location?.lng !== undefined && (
                                <Marker position={[Number(b.location.lat), Number(b.location.lng)] as [number, number]} />
                              )}
                            </MapContainer>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {`Updated: ${live?.updatedAt || "-"}`}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="outline" aria-label="View Images">
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Service Images</DialogTitle>
                          </DialogHeader>
                          {(() => {
                            const hasMedia =
                              (Array.isArray(b.photosBefore) && b.photosBefore.length > 0) ||
                              (Array.isArray(b.beforeServicePhotos) && b.beforeServicePhotos.length > 0) ||
                              (Array.isArray(b.afterServicePhotos) && b.afterServicePhotos.length > 0) ||
                              (Array.isArray(b.photosReturn) && b.photosReturn.length > 0);
                            if (!hasMedia) {
                              return <div className="text-sm text-muted-foreground">No images uploaded yet.</div>;
                            }
                            return (
                              <div className="space-y-4">
                                {Array.isArray(b.photosBefore) && b.photosBefore.length > 0 && (
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-2">Before Pickup</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                      {b.photosBefore.map((src, i) => (
                                        <img key={`tl-g-b-${i}`} src={src} alt="Before" className="w-full h-28 object-cover rounded border" />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {Array.isArray(b.beforeServicePhotos) && b.beforeServicePhotos.length > 0 && (
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-2">Before Service</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                      {b.beforeServicePhotos.map((src, i) => (
                                        <img key={`tl-g-a-${i}`} src={src} alt="After" className="w-full h-28 object-cover rounded border" />
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {Array.isArray(b.afterServicePhotos) && b.afterServicePhotos.length > 0 && (
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-2">After Service</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                      {b.afterServicePhotos.map((src, i) => (
                                        <img key={`tl-g-r-${i}`} src={src} alt="Return" className="w-full h-28 object-cover rounded border" />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const hasMedia =
                  (Array.isArray(b.photosBefore) && b.photosBefore.length > 0) ||
                  (Array.isArray(b.beforeServicePhotos) && b.beforeServicePhotos.length > 0) ||
                  (Array.isArray(b.afterServicePhotos) && b.afterServicePhotos.length > 0) ||
                  (Array.isArray(b.photosReturn) && b.photosReturn.length > 0);
                if (!hasMedia) return null;
                return (
                  <div className="flex items-center justify-end pt-2">
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
                                  <img key={`g-bp-${i}`} src={src} alt="Before pickup" className="w-full h-28 object-cover rounded border" />
                                ))}
                              </div>
                            </div>
                          )}
                          {Array.isArray(b.beforeServicePhotos) && b.beforeServicePhotos.length > 0 && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-2">Before Service</div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {b.beforeServicePhotos.map((src, i) => (
                                  <img key={`g-bs-${i}`} src={src} alt="Before service" className="w-full h-28 object-cover rounded border" />
                                ))}
                              </div>
                            </div>
                          )}
                          {Array.isArray(b.afterServicePhotos) && b.afterServicePhotos.length > 0 && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-2">After Service</div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {b.afterServicePhotos.map((src, i) => (
                                  <img key={`g-as-${i}`} src={src} alt="After service" className="w-full h-28 object-cover rounded border" />
                                ))}
                              </div>
                            </div>
                          )}
                          {Array.isArray(b.photosReturn) && b.photosReturn.length > 0 && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-2">Return</div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {b.photosReturn.map((src, i) => (
                                  <img key={`g-r-${i}`} src={src} alt="Return" className="w-full h-28 object-cover rounded border" />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                );
              })()}
                </div>
              ))}
            </div>
          </motion.div>
        )}
        <Dialog open={!!reviewBookingId} onOpenChange={(open) => {
          if (!open) {
            setReviewBookingId(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Service</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={n <= reviewRating ? "text-yellow-500" : "text-muted-foreground"}
                    onClick={() => setReviewRating(n)}
                  >
                    <Star className="h-5 w-5" fill={n <= reviewRating ? "currentColor" : "none"} />
                  </Button>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Comment</label>
                <Input
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience (optional)"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReviewBookingId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!reviewBookingId) return;
                    if (!Number.isFinite(reviewRating) || reviewRating < 1 || reviewRating > 5) {
                      toast({ title: "Invalid rating", description: "Select between 1 and 5 stars.", variant: "destructive" });
                      return;
                    }
                    try {
                      await patchBookingApi(reviewBookingId, { action: "booking_rate", rating: reviewRating, comment: reviewComment });
                      const list = await listApiBookings({ limit: 100 });
                      setApiBookings(list);
                      toast({ title: "Thanks for your review" });
                      setReviewBookingId(null);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : String(err);
                      toast({ title: "Failed to save review", description: msg, variant: "destructive" });
                    }
                  }}
                >
                  Submit Review
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {tab === "invoices" && (
          <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold">Invoices</h2>
            <div className="mt-4 space-y-3">
              {(() => {
                const email = getAuth()?.email || "";
                const fromDb = apiBookings
                  .filter((b) => b.customerEmail === email)
                  .filter((b) => {
                    const hasBill = typeof b.billTotal === "number" && b.billTotal > 0;
                    const hasPays = Array.isArray(b.payments) && b.payments.length > 0;
                    return hasBill || hasPays;
                  })
                  .map((b) => {
                    const paid = Array.isArray(b.payments) ? b.payments.reduce((s, x) => s + (Number(x.amount || 0) || 0), 0) : 0;
                    const amount = typeof b.billTotal === "number" && b.billTotal > 0 ? b.billTotal : paid;
                    const id = `${b.id}-dbinv`;
                    const invoiceNo = `INV-${(b.date ? new Date(b.date) : new Date()).getFullYear()}-${String(b.id).slice(-5).toUpperCase()}`;
                    const status = paid && typeof b.billTotal === "number" ? (paid >= b.billTotal ? "Paid" : "Generated") : (paid > 0 ? "Paid" : "Generated");
                    return { id, bookingId: b.id, customerEmail: email, amount, invoiceNo, status } as Invoice;
                  });
                const rows = fromDb;
                if (rows.length === 0) {
                  return <div className="rounded-lg border p-4 text-sm text-muted-foreground">No invoices yet</div>;
                }
                return rows.map((inv) => {
                  const b = apiBookings.find((x) => x.id === inv.bookingId);
                  return (
                    <div key={inv.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <div className="font-medium">Invoice #{inv.invoiceNo}</div>
                        <div className="text-xs text-muted-foreground">Booking: {inv.bookingId}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm">₹{inv.amount}</div>
                        <Badge variant={inv.status === "Paid" ? "secondary" : "outline"}>{inv.status}</Badge>
                        <Button size="sm" variant="outline" onClick={() => downloadInvoice(inv, { service: b?.service, date: b?.date })}>Download</Button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </motion.div>
        )}
        {tab === "settings" && (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold">Settings</h2>
            <div className="mt-4 rounded-lg border p-4 text-sm text-muted-foreground">Profile and preferences</div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

function ClickPicker({ onPick }: { onPick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

export default CustomerDashboard;
