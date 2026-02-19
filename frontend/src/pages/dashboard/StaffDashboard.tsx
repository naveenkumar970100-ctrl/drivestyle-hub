import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { ClipboardList, CheckCircle, Clock, AlertCircle, Phone, MapPin, CheckCircle2, Navigation, Loader2, Power } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import React from "react";
import { getAuth, listApiBookings, listUsersFromApi, getCurrentUserFromApi, patchBookingApi, setStaffOnlineApi, setStaffLocationApi, addNotificationForUser, type ApiBooking, type ApiUser } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const StaffDashboard = () => {
  const { toast } = useToast();
  const { search } = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState<ApiUser | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [returnFile, setReturnFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState<boolean>(false);
  const [locWatchId, setLocWatchId] = useState<number | null>(null);
  const tab = (() => {
    const p = new URLSearchParams(search);
    const t = p.get("tab");
    const allowed = new Set(["my-profile", "dashboard", "my-tasks", "bookings", "settings"]);
    return allowed.has(String(t)) ? String(t) : "dashboard";
  })();
  useEffect(() => {
    (async () => {
      const session = getAuth();
      const bookingsTask = (async () => {
        try {
          const list = await listApiBookings({ limit: 100 });
          setBookings(list);
        } catch {
          void 0;
        }
      })();
      let current: ApiUser | null = null;
      try {
        current = await getCurrentUserFromApi();
        if (!current) {
          const u = await listUsersFromApi();
          setUsers(u);
          if (session?.email) current = u.find((x) => x.email === session.email) || null;
          if (!current) current = u.find((x) => x.role === "staff") || null;
        }
      } catch {
        current = null;
      }
      setMe(current);
      setOnline(!!current?.staffOnline);
      await bookingsTask;
    })();
    const id = setInterval(async () => {
      try {
        const list = await listApiBookings({ limit: 100 });
        setBookings(list);
      } catch (_e) {
        void 0;
      }
    }, 10000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (online && "geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            await setStaffLocationApi(latitude, longitude);
          } catch { void 0; }
        },
        () => { return; },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
      );
      setLocWatchId(id);
      return () => {
        if (locWatchId !== null && "geolocation" in navigator) {
          try {
            navigator.geolocation.clearWatch(locWatchId);
          } catch { void 0; }
        }
      };
    } else {
      if (locWatchId !== null && "geolocation" in navigator) {
        try {
          navigator.geolocation.clearWatch(locWatchId);
        } catch { void 0; }
      }
      setLocWatchId(null);
    }
  }, [online, locWatchId]);
  const myTasks = useMemo(() => {
    const session = getAuth();
    if (session?.role === "Admin") {
      return bookings;
    }
    if (!me?.id) return [];
    return bookings.filter((b) => String(b.staffId || "") === me.id);
  }, [bookings, me]);
  const pendingAssigned = useMemo(
    () => myTasks.filter((t) => t.staffAcceptanceStatus === "pending"),
    [myTasks]
  );
  const availableTasks = useMemo(() => bookings.filter((b) => !b.staffId), [bookings]);
  const iconDefaultProto = L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string };
  delete iconDefaultProto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
    iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
    shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
  });
  const [openMapFor, setOpenMapFor] = useState<string | null>(null);
  function merchantFor(b: ApiBooking): ApiUser | undefined {
    return users.find((u) => u.id === b.merchantId);
  }
  function checklistFor(service: string) {
    const s = service.toLowerCase();
    if (s.includes("wash")) return ["Inspect exterior", "Pre-rinse", "Foam wash", "Rinse", "Dry & detail"];
    if (s.includes("battery")) return ["Verify battery spec", "Disconnect safely", "Install new battery", "ECU reset if needed"];
    if (s.includes("tire") || s.includes("tyre")) return ["Loosen nuts", "Jack vehicle", "Replace tire", "Torque nuts"];
    if (s.includes("general")) return ["Pickup to service centre", "Diagnostics", "Perform maintenance", "Road test"];
    if (s.includes("body")) return ["Assess damage", "Handover to body shop", "Quality check"];
    return ["Review order notes", "Carry standard toolkit", "Confirm tasks"];
  }
  async function toDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Read failed"));
      r.readAsDataURL(file);
    });
  }
  async function logCall(b: ApiBooking) {
    try {
      await patchBookingApi(b.id, { action: "staff_update_wear_tear", wearTear: `CALL ${new Date().toISOString()}` });
      const next = await listApiBookings({ limit: 100 });
      setBookings(next);
      toast({ title: "Call logged", description: b.customerEmail });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Failed to log", description: message, variant: "destructive" });
    }
  }
  async function uploadBefore(b: ApiBooking, picked?: File) {
    const file = picked || beforeFile;
    if (!file) { toast({ title: "Upload required", description: "Choose an image file", variant: "destructive" }); return; }
    const media = await toDataUrl(file);
    setSaving(true);
    try {
      await patchBookingApi(b.id, { action: "staff_upload_before_media", photosBefore: [media] });
      const next = await listApiBookings({ limit: 100 });
      setBookings(next);
      setBeforeFile(null);
      toast({ title: "Before media uploaded", description: b.customerEmail });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }
  async function confirmPickup(b: ApiBooking) {
    setSaving(true);
    try {
      await patchBookingApi(b.id, { action: "staff_start" });
      const next = await listApiBookings({ limit: 100 });
      setBookings(next);
      toast({ title: "Pickup confirmed", description: b.customerEmail });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Cannot confirm", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }
  async function markInTransit(b: ApiBooking) {
    setSaving(true);
    try {
      await patchBookingApi(b.id, { action: "staff_in_transit" });
      const next = await listApiBookings({ limit: 100 });
      setBookings(next);
      toast({ title: "In transit", description: b.customerEmail });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }
  async function handoverToMerchant(b: ApiBooking) {
    setSaving(true);
    try {
      const state = String(b.status || "").toUpperCase();
      if (state !== "PICKUP_CONFIRMED") {
        try { await patchBookingApi(b.id, { action: "staff_start" }); } catch { /* ignore invalid transition */ }
      }
      try { await patchBookingApi(b.id, { action: "staff_in_transit" }); } catch { /* ignore invalid transition */ }
      try { await patchBookingApi(b.id, { action: "staff_handover" }); } catch { /* ignore if already at centre */ }
      const next = await listApiBookings({ limit: 100 });
      setBookings(next);
      if (b.merchantId) {
        addNotificationForUser(b.merchantId, "Vehicle Arrived", `Booking ${b.service} is at service centre`);
      }
      toast({ title: "Handover at service centre", description: b.customerEmail });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }
  async function dropVehicle(b: ApiBooking) {
    setSaving(true);
    try {
      await patchBookingApi(b.id, { action: "staff_drop_vehicle" });
      const next = await listApiBookings({ limit: 100 });
      setBookings(next);
      if (b.merchantId) {
        addNotificationForUser(b.merchantId, "Vehicle Dropped", `Booking ${b.service} dropped at service centre`);
      }
      toast({ title: "Dropped vehicle", description: b.customerEmail });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }
  async function uploadAfter(b: ApiBooking, picked?: File) {
    const file = picked || afterFile;
    if (!file) { toast({ title: "Upload required", description: "Choose an image file", variant: "destructive" }); return; }
    const media = await toDataUrl(file);
    setSaving(true);
    try {
      await patchBookingApi(b.id, { action: "add_photos", photosAfter: [media] });
      const next = await listApiBookings({ limit: 100 });
      setBookings(next);
      setAfterFile(null);
      toast({ title: "After media uploaded", description: b.customerEmail });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }
  async function uploadReturn(b: ApiBooking, picked?: File) {
    const file = picked || returnFile;
    if (!file) { toast({ title: "Upload required", description: "Choose an image file", variant: "destructive" }); return; }
    const media = await toDataUrl(file);
    setSaving(true);
    try {
      await patchBookingApi(b.id, { action: "staff_upload_return_media", photosReturn: [media] });
      const next = await listApiBookings({ limit: 100 });
      setBookings(next);
      setReturnFile(null);
      toast({ title: "Return media uploaded", description: b.customerEmail });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Upload failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }
  // Vehicle return flow removed as per requirement
  async function updateWearTear(b: ApiBooking, text: string) {
    setSaving(true);
    try {
      await patchBookingApi(b.id, { action: "staff_update_wear_tear", wearTear: text });
      const next = await listApiBookings({ limit: 100 });
      setBookings(next);
      toast({ title: "Wear & tear updated", description: b.customerEmail });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Update failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }
  async function confirmPayment(b: ApiBooking) {
    setSaving(true);
    try {
      const state = String(b.status || "").toUpperCase();
      if (state === "DELIVERED" || state === "COMPLETED") {
        toast({ title: "Already delivered", description: b.customerEmail });
      } else if (state === "READY_FOR_DELIVERY") {
        await patchBookingApi(b.id, { action: "staff_confirm_payment" });
      } else {
        toast({ title: "Cannot confirm payment", description: `Status: ${b.status}`, variant: "destructive" });
      }
      const next = await listApiBookings({ limit: 100 });
      setBookings(next);
      toast({ title: "Payment verified", description: b.customerEmail });
      navigate("/dashboard/staff?tab=my-tasks");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Verification failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }
  const stats = [
    { label: "Assigned Tasks", value: String(myTasks.length), icon: ClipboardList },
    { label: "Completed", value: String(myTasks.filter((t) => String(t.status).toLowerCase() === "completed").length), icon: CheckCircle },
    { label: "In Progress", value: String(myTasks.filter((t) => String(t.status).toLowerCase() === "in_progress").length), icon: Clock },
    { label: "Awaiting Payment", value: String(myTasks.filter((t) => String(t.status).toLowerCase() === "awaiting_payment").length), icon: AlertCircle },
  ];

  return (
    <DashboardLayout role="staff">
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <motion.h1 {...fadeUp} className="font-heading text-3xl font-bold">{tab === "my-profile" ? "My Profile" : "Staff Dashboard"}</motion.h1>
            <Button
              variant={online ? "default" : "outline"}
              onClick={async () => {
                const next = !online;
                setOnline(next);
                try {
                  await setStaffOnlineApi(next);
                } catch {
                  setOnline(!next);
                }
              }}
            >
              <Power className="mr-2 h-4 w-4" /> {online ? "Go Offline" : "Go Online"}
            </Button>
          </div>

        {tab === "my-profile" && (
          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold mb-4">Staff Details</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">Role</div>
                <div className="text-lg font-semibold">Staff</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="text-lg font-semibold">{me?.name || getAuth()?.name || "-"}</div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="text-lg font-semibold">{me?.email || getAuth()?.email || "-"}</div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === "dashboard" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s, i) => (
                <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.1 }} className="rounded-xl border bg-card p-5 shadow-card">
                  <s.icon className="h-8 w-8 text-accent" />
                  <div className="mt-3 font-heading text-2xl font-bold">{s.value}</div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </motion.div>
              ))}
            </div>
            <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="rounded-xl border bg-card p-6 shadow-card">
              <h2 className="font-heading text-xl font-bold">Assigned To Me</h2>
              <div className="mt-4 space-y-3">
                {pendingAssigned.length === 0 && (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">No pending offers</div>
                )}
                {pendingAssigned.map((t) => (
                  <div key={`dash-${t.id}`} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{t.service}</div>
                      <div className="text-sm text-muted-foreground">{t.vehicle === "bike" ? "Bike" : "Car"} • {t.customerEmail}</div>
                      <div className="text-xs text-muted-foreground">Reg: {t.registration || "-"}</div>
                      <div className="text-xs text-muted-foreground">{t.date || "-"} {t.time && `• ${t.time}`}</div>
                      <div className="text-xs text-muted-foreground">Offer pending — accept to view customer details</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={saving}
                        onClick={async () => {
                          setSaving(true);
                          try {
                            await patchBookingApi(t.id, { action: "staff_accept" });
                            const list = await listApiBookings({ limit: 100 });
                            setBookings(list);
                            toast({ title: "Accepted", description: t.customerEmail });
                          } catch (e) {
                            const msg = e instanceof Error ? e.message : String(e);
                            toast({ title: "Accept failed", description: msg, variant: "destructive" });
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={async () => {
                          setSaving(true);
                          try {
                            await patchBookingApi(t.id, { action: "staff_decline" });
                            const list = await listApiBookings({ limit: 100 });
                            setBookings(list);
                            toast({ title: "Declined", description: t.customerEmail });
                          } catch (e) {
                            const msg = e instanceof Error ? e.message : String(e);
                            toast({ title: "Decline failed", description: msg, variant: "destructive" });
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOpenId(t.id)}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.45 }} className="rounded-xl border bg-card p-6 shadow-card">
              <h2 className="font-heading text-xl font-bold">Merchant Location & Handover</h2>
              <div className="mt-4 space-y-3">
                {myTasks.filter((t) => t.staffAcceptanceStatus === "accepted").length === 0 && (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">No active tasks</div>
                )}
                {myTasks.filter((t) => t.staffAcceptanceStatus === "accepted").map((t) => {
                  const m = merchantFor(t);
                  const ml = m?.location;
                  const lat = ml?.lat; const lng = ml?.lng;
                  const status = String(t.status || "").toUpperCase();
                  return (
                    <div key={`mer-${t.id}`} className="flex flex-col gap-3 rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium">{t.service}</div>
                        <div className="text-xs text-muted-foreground">Reg: {t.registration || "-"}</div>
                      </div>
                      {(() => {
                        const hide =
                          status === "AT_SERVICE_CENTER" ||
                          status === "WAITING_APPROVAL" ||
                          status === "SERVICE_IN_PROGRESS" ||
                          status === "READY_FOR_DELIVERY" ||
                          status === "DELIVERED" ||
                          status === "COMPLETED";
                        if (hide) {
                          return <div className="text-xs text-muted-foreground">Vehicle dropped — merchant location hidden</div>;
                        }
                        if (ml && lat !== undefined && lng !== undefined) {
                          return (
                        <>
                          <div className="rounded-md overflow-hidden cursor-pointer" onClick={() => setOpenMapFor(t.id)}>
                            <MapContainer center={[lat, lng]} zoom={15} style={{ height: 160 }} scrollWheelZoom={false}>
                              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                              <Marker position={[lat, lng]} />
                            </MapContainer>
                          </div>
                          <Dialog open={openMapFor === t.id} onOpenChange={(o) => setOpenMapFor(o ? t.id : null)}>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Merchant Location</DialogTitle>
                              </DialogHeader>
                              <div className="rounded-lg overflow-hidden">
                                <MapContainer center={[lat, lng]} zoom={16} style={{ height: 420 }} scrollWheelZoom>
                                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                  <Marker position={[lat, lng]} />
                                </MapContainer>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                          );
                        }
                        return (
                        <div className="text-xs text-muted-foreground">Merchant location unavailable</div>
                        );
                      })()}
                      <div className="flex items-center justify-end gap-2">
                        {!(
                          status === "AT_SERVICE_CENTER" ||
                          status === "WAITING_APPROVAL" ||
                          status === "SERVICE_IN_PROGRESS" ||
                          status === "READY_FOR_DELIVERY" ||
                          status === "DELIVERED" ||
                          status === "COMPLETED"
                        ) && ml && lat !== undefined && lng !== undefined && (
                          <Button size="sm" variant="outline" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank")}>Navigate</Button>
                        )}
                        {status !== "AT_SERVICE_CENTER" && status !== "WAITING_APPROVAL" && status !== "SERVICE_IN_PROGRESS" && status !== "READY_FOR_DELIVERY" && status !== "DELIVERED" && status !== "COMPLETED" && (
                          <Button size="sm" disabled={saving || String(t.status).toUpperCase() !== "IN_TRANSIT"} onClick={async () => {
                            await handoverToMerchant(t);
                            toast({ title: "Reached merchant", description: t.customerEmail });
                          }}>Reached Merchant</Button>
                        )}
                        {(status === "AT_SERVICE_CENTER" || status === "WAITING_APPROVAL" || status === "SERVICE_IN_PROGRESS") && (
                          <Button size="sm" variant="outline" onClick={async () => {
                            await dropVehicle(t);
                          }}>Dropped Vehicle</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setOpenId(t.id)}>Details</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}

        {tab === "my-tasks" && (
          <>
            <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="rounded-xl border bg-card p-6 shadow-card">
              <h2 className="font-heading text-xl font-bold">My Tasks</h2>
              <div className="mt-4 space-y-3">
                {bookings.length === 0 && !me && (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">Loading staff dashboard...</div>
                )}
                {myTasks.length === 0 && me && (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">No tasks yet</div>
                )}
                {myTasks.map((t) => (
                  <div key={t.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{t.service}</div>
                      <div className="text-sm text-muted-foreground">{t.vehicle === "bike" ? "Bike" : "Car"} • {t.customerEmail}</div>
                      <div className="text-xs text-muted-foreground">Reg: {t.registration || "-"}</div>
                      <div className="text-xs text-muted-foreground">{t.date || "-"} {t.time && `• ${t.time}`}</div>
                      {(() => {
                        const paid = Array.isArray(t.payments) ? t.payments.reduce((s, x) => s + (Number(x.amount || 0) || 0), 0) : 0;
                        const bill = typeof t.billTotal === "number" ? t.billTotal : 0;
                        if (!paid && !bill) return null;
                        const due = Math.max(bill - paid, 0);
                        return <div className="text-xs text-muted-foreground">Paid: ₹{paid.toLocaleString("en-IN")} {bill ? `• Due: ₹${due.toLocaleString("en-IN")}` : ""}</div>;
                      })()}
                      {t.staffAcceptanceStatus !== "accepted" ? (
                        <div className="text-xs text-muted-foreground">Offer pending — accept to view customer details</div>
                      ) : (
                        (() => {
                          const su = String(t.status).toUpperCase();
                          if (su === "COMPLETED" || su === "DELIVERED") {
                            return <div className="text-xs text-muted-foreground">Service completed — customer location hidden</div>;
                          }
                          return <div className="text-xs text-muted-foreground">{t.location?.formatted || (t.location?.lat && t.location?.lng ? `${t.location.lat},${t.location.lng}` : "-")}</div>;
                        })()
                      )}
                      {t.lastUpdatedMessage && (
                        <div className="text-xs text-muted-foreground">
                          {(t.lastUpdatedByRole ? t.lastUpdatedByRole.charAt(0).toUpperCase() + t.lastUpdatedByRole.slice(1) : "System")} — {t.lastUpdatedMessage}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.staffAcceptanceStatus === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            disabled={saving}
                            onClick={async () => {
                              setSaving(true);
                              try {
                                await patchBookingApi(t.id, { action: "staff_accept" });
                            const list = await listApiBookings({ limit: 100 });
                                setBookings(list);
                                toast({ title: "Accepted", description: t.customerEmail });
                              } catch (e) {
                                const msg = e instanceof Error ? e.message : String(e);
                                toast({ title: "Accept failed", description: msg, variant: "destructive" });
                              } finally {
                                setSaving(false);
                              }
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={async () => {
                              setSaving(true);
                              try {
                                await patchBookingApi(t.id, { action: "staff_decline" });
                            const list = await listApiBookings({ limit: 100 });
                                setBookings(list);
                                toast({ title: "Declined", description: t.customerEmail });
                              } catch (e) {
                                const msg = e instanceof Error ? e.message : String(e);
                                toast({ title: "Decline failed", description: msg, variant: "destructive" });
                              } finally {
                                setSaving(false);
                              }
                            }}
                          >
                            Decline
                          </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOpenId(t.id)}
                      >
                        Details
                      </Button>
                        </>
                      ) : (
                        <>
                      <span className="text-xs text-muted-foreground">Update status</span>
                      <Select
                        value={String(t.status || "")}
                        onValueChange={async (v) => {
                          const ok = window.confirm(`Are you sure you want to update status to ${v}?`);
                          if (!ok) return;
                          await patchBookingApi(t.id, { action: "update_status", status: v });
                          const list = await listApiBookings({ limit: 100 });
                          setBookings(list);
                        }}
                      >
                        <SelectTrigger className="w-44"><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pickup_done">Pickup Confirmed</SelectItem>
                          <SelectItem value="in_transit">In Transit</SelectItem>
                          <SelectItem value="at_service_center">At Service Center</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="ready_for_delivery">Ready For Delivery</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge variant="outline">{t.status}</Badge>
                      {t.staffAcceptanceStatus === "accepted" && (
                        <Button variant="outline" size="sm" onClick={() => { window.open(`tel:${t.customerPhone || ""}`); void logCall(t); }}><Phone className="mr-2 h-4 w-4" /> Call</Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setOpenId(t.id)}><MapPin className="mr-2 h-4 w-4" /> Details</Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div {...fadeUp} transition={{ delay: 0.5 }} className="rounded-xl border bg-card p-6 shadow-card">
              <h2 className="font-heading text-xl font-bold">Available Tasks</h2>
              <div className="mt-4 space-y-3">
                {availableTasks.length === 0 && (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">No available tasks</div>
                )}
              {(online ? availableTasks : []).map((t) => (
                  <div key={`avail-${t.id}`} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium">{t.service}</div>
                      <div className="text-sm text-muted-foreground">{t.vehicle === "bike" ? "Bike" : "Car"} • {t.customerEmail}</div>
                      <div className="text-xs text-muted-foreground">Reg: {t.registration || "-"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!me?.id) return;
                          await patchBookingApi(t.id, { action: "assign_staff", staffId: me.id });
                          const list = await listApiBookings({ limit: 100 });
                          setBookings(list);
                          toast({ title: "Task claimed" });
                        }}
                      disabled={!online}
                      >
                        Claim task
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOpenId(t.id)}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              {!online && (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">Go online to receive tasks</div>
              )}
              </div>
            </motion.div>
            {bookings.map((t) => {
              const open = openId === t.id;
              const lat = t.location?.lat;
              const lng = t.location?.lng;
              const hasBefore = Array.isArray(t.photosBefore) && t.photosBefore.length > 0;
              return (
                <Dialog key={`dlg-${t.id}`} open={open} onOpenChange={(v) => setOpenId(v ? t.id : null)}>
                  <DialogTrigger asChild><span /></DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader><DialogTitle>Order Details</DialogTitle></DialogHeader>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <div className="text-sm">Type: {t.service}</div>
                        <div className="text-sm">Vehicle: {t.vehicle === "bike" ? "Bike" : "Car"}</div>
                        <div className="text-sm">Registration: {t.registration || "-"}</div>
                        <div className="text-sm">Customer: {t.customerEmail}</div>
                        <div className="text-sm">Status: {String(t.status).toUpperCase()}</div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Work Checklist</h4>
                          <ul className="text-sm list-disc ml-5">
                            {checklistFor(t.service).map((x) => (<li key={x}>{x}</li>))}
                          </ul>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Button variant="outline" size="sm" onClick={() => { window.open(`tel:${t.customerPhone || ""}`); void logCall(t); }}>
                            <Phone className="mr-2 h-4 w-4" /> Call Customer
                          </Button>
                        {(() => {
                          const su = String(t.status).toUpperCase();
                          if (su === "COMPLETED" || su === "DELIVERED") return null;
                          return (lat !== undefined && lng !== undefined) ? (
                            <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank")}>
                              <Navigation className="mr-2 h-4 w-4" /> Navigate
                            </Button>
                          ) : null;
                        })()}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {(() => {
                          const su = String(t.status).toUpperCase();
                          if (su === "COMPLETED" || su === "DELIVERED") {
                            return <div className="rounded-lg border p-3 text-sm text-muted-foreground">Service completed — location hidden</div>;
                          }
                          return (lat !== undefined && lng !== undefined) ? (
                          <div className="rounded-lg border p-3 text-sm">
                            Location: {lat.toFixed(6)}, {lng.toFixed(6)}
                          </div>
                          ) : (
                          <div className="rounded-lg border p-3 text-sm text-muted-foreground">No location available</div>
                          );
                        })()}
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Arrival</div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" disabled={saving || String(t.status).toUpperCase() !== "ASSIGNED"} onClick={() => confirmPickup(t)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Reached Customer
                            </Button>
                          </div>
                        </div>
                        {String(t.status).toUpperCase() === "PICKUP_CONFIRMED" && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Before Pickup Image</div>
                            <input id={`before-${t.id}`} className="hidden" type="file" accept="image/*" onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              setBeforeFile(f);
                              if (f) {
                                void uploadBefore(t, f);
                              }
                            }} />
                            <Button size="sm" disabled={saving} onClick={() => {
                              const el = document.getElementById(`before-${t.id}`) as HTMLInputElement | null;
                              el?.click();
                            }}>{saving ? "Uploading..." : "Upload Before Image"}</Button>
                            <Button size="sm" className="mt-2" disabled={!hasBefore || saving} onClick={() => markInTransit(t)}>
                              Mark In Transit
                            </Button>
                          </div>
                        )}
                        {/* Navigate to Merchant moved below after-image section */}
                        {(() => {
                          const su = String(t.status).toUpperCase();
                          const showAfter = su === "IN_TRANSIT" || su === "AT_SERVICE_CENTER" || su === "WAITING_APPROVAL" || su === "SERVICE_IN_PROGRESS" || su === "READY_FOR_DELIVERY";
                          return showAfter ? (
                            <div className="space-y-2">
                              {(String(t.status).toUpperCase() === "IN_TRANSIT" || String(t.status).toUpperCase() === "AT_SERVICE_CENTER") && (
                                <div className="space-y-2">
                                  <div className="text-sm font-medium">Navigate to Merchant</div>
                                  <div className="flex items-center gap-2">
                                    {(() => {
                                      const m = merchantFor(t);
                                      const ml = m?.location;
                                      return ml && ml.lat !== undefined && ml.lng !== undefined ? (
                                        <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${ml.lat},${ml.lng}`, "_blank")}>
                                          <Navigation className="mr-2 h-4 w-4" /> To Service Centre
                                        </Button>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">Merchant location unavailable</span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                              <div className="text-sm font-medium">After Pickup Image</div>
                              <input id={`after-${t.id}`} className="hidden" type="file" accept="image/*" onChange={(e) => {
                                const f = e.target.files?.[0] || null;
                                setAfterFile(f);
                                if (f) {
                                  void uploadAfter(t, f);
                                }
                              }} />
                              <Button size="sm" disabled={saving} onClick={() => {
                                const el = document.getElementById(`after-${t.id}`) as HTMLInputElement | null;
                                el?.click();
                              }}>{saving ? "Uploading..." : "Upload After Image"}</Button>
                              <div>
                                <Button size="sm" className="mt-2" disabled={saving || String(t.status).toUpperCase() !== "IN_TRANSIT"} onClick={() => handoverToMerchant(t)}>
                                  Reached Merchant
                                </Button>
                              </div>
                              <div>
                                {su === "AT_SERVICE_CENTER" || su === "WAITING_APPROVAL" || su === "SERVICE_IN_PROGRESS" ? (
                                  <Button size="sm" className="mt-2" variant="outline" onClick={async () => {
                                    await dropVehicle(t);
                                  }}>Dropped Vehicle</Button>
                                ) : null}
                              </div>
                            </div>
                          ) : null;
                        })()}
                        {(String(t.status).toUpperCase() === "READY_FOR_DELIVERY" || String(t.status).toUpperCase() === "DELIVERED") && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Return Media</div>
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const f = e.target.files?.[0] || null;
                                  setReturnFile(f);
                                  if (f) {
                                    void uploadReturn(t, f);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        )}
                        {/* Estimate Sheet removed as requested */}
                        {Array.isArray(t.payments) && t.payments.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-sm font-medium">Payments</div>
                            <div className="flex flex-col gap-1">
                              {t.payments.slice(-3).map((p, i) => (
                                <div key={`spay-${i}`} className="text-xs text-muted-foreground">
                                  ₹{Number(p.amount || 0)} • {p.method || "-"} {p.byRole ? `• ${p.byRole}` : ""} {p.time ? `• ${new Date(p.time).toLocaleString()}` : ""}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(() => {
                          const su = String(t.status).toUpperCase();
                          if (su === "READY_FOR_DELIVERY" || su === "DELIVERED") {
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Button size="sm" onClick={() => confirmPayment(t)}>Confirm Payment</Button>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </>
        )}
        {tab === "bookings" && (
          <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold">Bookings</h2>
            <div className="mt-4 space-y-3">
              {bookings.length === 0 && (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">No bookings yet</div>
              )}
              {bookings.map((t) => (
                <div key={`bk-${t.id}`} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{t.customerEmail}</div>
                    <div className="text-sm text-muted-foreground">{t.vehicle === "bike" ? "Bike" : "Car"} — {t.service}</div>
                    <div className="text-xs text-muted-foreground">Reg: {t.registration || "-"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t.date || "-"} {t.time && `• ${t.time}`}</span>
                    <Badge variant="outline">{t.status}</Badge>
                  </div>
                </div>
              ))}
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
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default StaffDashboard;

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  componentDidCatch(error: Error) {
    this.setState({ error });
  }
  render() {
    if (this.state.error) {
      const msg = this.state.error?.message || String(this.state.error);
      return (
        <div className="p-6">
          <div className="rounded-lg border p-4 text-sm text-destructive">{msg}</div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
