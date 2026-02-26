import { DashboardLayout } from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { Store, ShoppingBag, IndianRupee, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { getAuth, setAuth, listApiBookings, listUsersFromApi, getCurrentUserFromApi, patchBookingApi, addNotificationForUser, getMerchantDashboardStats, type ApiBooking, type ApiUser } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocation } from "react-router-dom";

const stats = [
  { label: "Active Services", value: "8", icon: Store },
  { label: "Total Bookings", value: "156", icon: ShoppingBag },
  { label: "Earnings", value: "₹12,340", icon: IndianRupee },
  { label: "Rating", value: "4.8", icon: Star },
];

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const MerchantDashboard = () => {
  const { toast } = useToast();
  const { search } = useLocation();
  const [me, setMe] = useState<ApiUser | null>(null);
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [mstats, setMstats] = useState<{ activeServices: number; totalBookings: number; earnings: number; ratingAvg: number | null } | null>(null);
  const tab = (() => {
    const p = new URLSearchParams(search);
    const t = p.get("tab");
    const allowed = new Set(["my-profile", "dashboard", "bookings", "earnings", "settings"]);
    return allowed.has(String(t)) ? String(t) : "dashboard";
  })();
  const { thisMonthPaid, totalPaid, totalPending } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let paid = 0;
    let pending = 0;
    let monthPaid = 0;
    for (const b of bookings) {
      const bill = typeof b.billTotal === "number" ? b.billTotal : 0;
      const p = Array.isArray(b.payments) ? b.payments : [];
      const pSum = p.reduce((s, x) => s + (Number(x.amount || 0) || 0), 0);
      paid += pSum;
      const due = Math.max(bill - pSum, 0);
      pending += due;
      for (const x of p) {
        if (!x.time) continue;
        const dt = new Date(x.time);
        if (dt.getFullYear() === y && dt.getMonth() === m) {
          monthPaid += Number(x.amount || 0) || 0;
        }
      }
    }
    return { totalPaid: paid, totalPending: pending, thisMonthPaid: monthPaid };
  }, [bookings]);
  async function toDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Read failed"));
      r.readAsDataURL(file);
    });
  }
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
      const statsTask = (async () => {
        try {
          const s = await getMerchantDashboardStats();
          setMstats({ activeServices: s.activeServices, totalBookings: s.totalBookings, earnings: s.earnings, ratingAvg: s.ratingAvg });
        } catch {
          void 0;
        }
      })();
      let current: ApiUser | null = null;
      try {
        current = await getCurrentUserFromApi();
        try {
          const u = await listUsersFromApi();
          setUsers(u);
          if (!current && session?.email) current = u.find((x) => x.email === session.email) || null;
          if (!current) current = u.find((x) => x.role === "merchant") || null;
        } catch {
          /* ignore user fetch error */
        }
      } catch {
        current = null;
      }
      setMe(current);
      try {
        if (current?.email) {
          const s = getAuth();
          if (s) {
            const sameRole = s.role;
            setAuth({ ...s, email: current.email, role: sameRole, token: s.token });
          }
        }
      } catch {
        /* ignore auth sync error */
      }
      await Promise.all([bookingsTask, statsTask]);
    })();
    const id = setInterval(async () => {
      try {
        const tasks: Promise<void>[] = [];
        tasks.push(
          (async () => {
            try {
              const list = await listApiBookings({ limit: 100 });
              setBookings(list);
            } catch {
              /* ignore bookings fetch error */
            }
          })(),
        );
        tasks.push(
          (async () => {
            try {
              const s = await getMerchantDashboardStats();
              setMstats({ activeServices: s.activeServices, totalBookings: s.totalBookings, earnings: s.earnings, ratingAvg: s.ratingAvg });
            } catch {
              /* ignore stats fetch error */
            }
          })(),
        );
        await Promise.all(tasks);
      } catch (_e) {
        void 0;
      }
    }, 10000);
    return () => clearInterval(id);
  }, []);
  const myBookings = useMemo(() => {
    const session = getAuth();
    if (session?.role === "Admin") {
      return bookings;
    }
    if (me?.id) return bookings.filter((b) => String(b.merchantId || "") === me.id);
    return bookings.filter((b) => !!b.merchantId);
  }, [bookings, me]);
  const availableBookings = useMemo(() => bookings.filter((b) => !b.merchantId), [bookings]);
  const statsCards = useMemo(() => {
    const upper = (s: unknown) => String(s || "").toUpperCase();
    const active = mstats ? mstats.activeServices : myBookings.filter((b) => !["DELIVERED", "COMPLETED"].includes(upper(b.status))).length;
    const total = mstats ? mstats.totalBookings : myBookings.length;
    const earnings = mstats ? mstats.earnings : myBookings
      .filter((b) => {
        const completed = ["DELIVERED", "COMPLETED"].includes(upper(b.status));
        const hasPayments = Array.isArray(b.payments) && b.payments.length > 0;
        return completed || hasPayments;
      })
      .reduce((sum, b) => {
        const bill = typeof b.billTotal === "number" ? b.billTotal : 0;
        if (bill && bill > 0) return sum + bill;
        const p = Array.isArray(b.payments) ? b.payments.reduce((s, x) => s + (Number(x.amount || 0) || 0), 0) : 0;
        return sum + p;
      }, 0);
    const ratings = myBookings.map((b) => (typeof b.ratingValue === "number" ? b.ratingValue : null)).filter((n): n is number => n !== null);
    const avg = mstats ? mstats.ratingAvg : (ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : null);
    return [
      { label: "Active Services", value: String(active), icon: Store },
      { label: "Total Bookings", value: String(total), icon: ShoppingBag },
      { label: "Earnings", value: `₹${earnings.toLocaleString("en-IN")}`, icon: IndianRupee },
      { label: "Rating", value: avg !== null ? avg.toFixed(1) : "-", icon: Star },
    ];
  }, [myBookings, mstats]);
  const recentReviews = useMemo(() => {
    const reviewed = myBookings.filter((b) => typeof b.ratingValue === "number");
    reviewed.sort((a, b) => {
      const ta = b.dropAt ? new Date(b.dropAt).getTime() : 0;
      const tb = a.dropAt ? new Date(a.dropAt).getTime() : 0;
      return ta - tb;
    });
    return reviewed.slice(0, 5);
  }, [myBookings]);
  return (
    <DashboardLayout role="merchant">
      <div className="space-y-6">
        <motion.h1 {...fadeUp} className="font-heading text-3xl font-bold">{tab === "my-profile" ? "My Profile" : "Merchant Dashboard"}</motion.h1>

        {tab === "dashboard" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statsCards.map((s, i) => (
                <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.1 }} className="rounded-xl border bg-card p-5 shadow-card">
                  <s.icon className="h-8 w-8 text-accent" />
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
                      <div className="font-medium">{b.customerEmail}</div>
                      <div className="text-xs text-muted-foreground">{(b.vehicle === "bike" ? "Bike" : "Car")} — {b.service}</div>
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

        {tab === "my-profile" && (
          <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold mb-4">Merchant Details</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="text-xs text-muted-foreground">Role</div>
                <div className="text-lg font-semibold">Merchant</div>
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

        {tab === "bookings" && (
          <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold">Bookings</h2>
            <div className="mt-4 space-y-3">
              {myBookings.length === 0 && (
                <div className="rounded-lg border p-4 text-sm text-muted-foreground">No bookings yet</div>
              )}
              {myBookings.map((b) => (
                <div key={b.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">{b.customerEmail}</div>
                    <div className="text-sm text-muted-foreground">{(b.vehicle === "bike" ? "Bike" : "Car")} — {b.service}</div>
                    <div className="text-xs text-muted-foreground">Reg: {b.registration || "-"}</div>
                    {(() => {
                      const paid = Array.isArray(b.payments) ? b.payments.reduce((s, x) => s + (Number(x.amount || 0) || 0), 0) : 0;
                      const bill = typeof b.billTotal === "number" ? b.billTotal : 0;
                      if (!paid && !bill) return null;
                      const due = Math.max(bill - paid, 0);
                      return <div className="text-xs text-muted-foreground">Paid: ₹{paid.toLocaleString("en-IN")} {bill ? `• Due: ₹${due.toLocaleString("en-IN")}` : ""}</div>;
                    })()}
                    {Array.isArray(b.photosBefore) && b.photosBefore.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">Before Pickup</div>
                        <div className="flex flex-wrap gap-2">
                          {b.photosBefore.slice(0, 4).map((src, i) => (
                            <Dialog key={`bp-${i}`}>
                              <DialogTrigger asChild>
                                <img src={src} alt="Before pickup" className="h-12 w-12 rounded object-cover border cursor-zoom-in" />
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl p-0">
                                <img src={src} alt="Before pickup full" className="w-full h-auto rounded" />
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
                            <Dialog key={`bs-${i}`}>
                              <DialogTrigger asChild>
                                <img src={src} alt="Before service" className="h-12 w-12 rounded object-cover border cursor-zoom-in" />
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl p-0">
                                <img src={src} alt="Before service full" className="w-full h-auto rounded" />
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
                            <Dialog key={`as-${i}`}>
                              <DialogTrigger asChild>
                                <img src={src} alt="After service" className="h-12 w-12 rounded object-cover border cursor-zoom-in" />
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl p-0">
                                <img src={src} alt="After service full" className="w-full h-auto rounded" />
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
                    {Array.isArray(b.payments) && b.payments.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">Payments</div>
                        <div className="flex flex-col gap-1">
                          {b.payments.slice(-3).map((p, i) => (
                            <div key={`mpay-${i}`} className="text-xs">
                              ₹{Number(p.amount || 0)} • {p.method || "-"} {p.byRole ? `• ${p.byRole}` : ""} {p.time ? `• ${new Date(p.time).toLocaleString()}` : ""}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">{b.date || "-"} {b.time && `• ${b.time}`}</span>
                    {b.location && (
                      <span className="text-xs text-muted-foreground">
                        {b.location.formatted ? b.location.formatted : (b.location.lat !== undefined && b.location.lng !== undefined ? `${b.location.lat}, ${b.location.lng}` : "")}
                      </span>
                    )}
                    {b.dropAt && (
                      <span className="text-xs text-muted-foreground">Dropped: {new Date(b.dropAt).toLocaleString()}</span>
                    )}
                    <Badge variant={String(b.status).toLowerCase() === "approved" ? "secondary" : String(b.status).toLowerCase() === "pending" ? "default" : String(b.status).toLowerCase() === "rejected" ? "destructive" : "outline"}>{b.status}</Badge>
                    <input
                      id={`before-service-files-${b.id}`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        if (!files.length) return;
                        try {
                          const media: string[] = [];
                          for (const f of files) {
                            media.push(await toDataUrl(f));
                          }
                          await patchBookingApi(b.id, { action: "merchant_upload_before_service_media", beforeServicePhotos: media });
                          const next = await listApiBookings({ limit: 100 });
                          setBookings(next);
                          toast({ title: "Before service images uploaded", description: b.customerEmail });
                        } catch (err) {
                          const message = err instanceof Error ? err.message : String(err);
                          toast({ title: "Upload failed", description: message, variant: "destructive" });
                        } finally {
                          e.target.value = "";
                        }
                      }}
                    />
                    <input
                      id={`after-service-files-${b.id}`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = e.target.files ? Array.from(e.target.files) : [];
                        if (!files.length) return;
                        try {
                          const media: string[] = [];
                          for (const f of files) {
                            media.push(await toDataUrl(f));
                          }
                          await patchBookingApi(b.id, { action: "merchant_upload_after_service_media", afterServicePhotos: media });
                          const next = await listApiBookings({ limit: 100 });
                          setBookings(next);
                          toast({ title: "After service images uploaded", description: b.customerEmail });
                        } catch (err) {
                          const message = err instanceof Error ? err.message : String(err);
                          toast({ title: "Upload failed", description: message, variant: "destructive" });
                        } finally {
                          e.target.value = "";
                        }
                      }}
                    />
                    {(() => {
                      const statusUpper = String(b.status || "").toUpperCase();
                      const canUploadBefore =
                        statusUpper === "AT_SERVICE_CENTER" ||
                        statusUpper === "WAITING_APPROVAL" ||
                        statusUpper === "SERVICE_IN_PROGRESS";
                      const canUploadAfter =
                        statusUpper === "SERVICE_IN_PROGRESS" ||
                        statusUpper === "READY_FOR_DELIVERY";
                      return (
                        <>
                          {canUploadBefore && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const el = document.getElementById(`before-service-files-${b.id}`) as HTMLInputElement | null;
                                el?.click();
                              }}
                            >
                              Upload Before Service
                            </Button>
                          )}
                          {canUploadAfter && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const el = document.getElementById(`after-service-files-${b.id}`) as HTMLInputElement | null;
                                el?.click();
                              }}
                            >
                              Upload After Service
                            </Button>
                          )}
                        </>
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
                                      <img key={`mg-bp-${i}`} src={src} alt="Before pickup" className="w-full h-28 object-cover rounded border" />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {Array.isArray(b.beforeServicePhotos) && b.beforeServicePhotos.length > 0 && (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-2">Before Service</div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {b.beforeServicePhotos.map((src, i) => (
                                      <img key={`mg-bs-${i}`} src={src} alt="Before service" className="w-full h-28 object-cover rounded border" />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {Array.isArray(b.afterServicePhotos) && b.afterServicePhotos.length > 0 && (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-2">After Service</div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {b.afterServicePhotos.map((src, i) => (
                                      <img key={`mg-as-${i}`} src={src} alt="After service" className="w-full h-28 object-cover rounded border" />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {Array.isArray(b.photosReturn) && b.photosReturn.length > 0 && (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-2">Return</div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {b.photosReturn.map((src, i) => (
                                      <img key={`mg-r-${i}`} src={src} alt="Return" className="w-full h-28 object-cover rounded border" />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      );
                    })()}
                    {/* Assign staff - only for pickups */}
                    {(() => {
                      const loc = b.location || {};
                      const hasLat = typeof loc.lat === "number" && !isNaN(loc.lat);
                      const hasLng = typeof loc.lng === "number" && !isNaN(loc.lng);
                      const hasAddr = typeof loc.formatted === "string" && loc.formatted.trim().length > 0 && loc.formatted.trim() !== "-";
                      if (!(hasLat || hasLng || hasAddr)) return null;
                      return (
                        <>
                          <span className="text-xs text-muted-foreground">Assign staff</span>
                          <Select
                            value={String(b.staffId || "")}
                            onValueChange={async (v) => {
                              await patchBookingApi(b.id, { action: "assign_staff", staffId: v });
                              const list = await listApiBookings({ limit: 100 });
                              setBookings(list);
                              addNotificationForUser(v, "New Task", `Booking assigned: ${b.service}`);
                              toast({ title: "Staff assigned", description: v });
                            }}
                          >
                            <SelectTrigger className="w-44"><SelectValue placeholder="Select staff" /></SelectTrigger>
                            <SelectContent>
                              {users.filter((u) => u.role === "staff").map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      );
                    })()}
                    <button
                      className="rounded-md border px-3 py-1 text-sm"
                      onClick={async () => {
                        const labour = Number(window.prompt("Labour cost", "0") || "0");
                        const parts = Number(window.prompt("Parts cost", "0") || "0");
                        const additional = Number(window.prompt("Additional work", "0") || "0");
                        await patchBookingApi(b.id, { action: "merchant_update_estimate", labour_cost: labour, parts_cost: parts, additional_work: additional });
                        const list = await listApiBookings({ limit: 100 });
                        setBookings(list);
                        toast({ title: "Estimate updated" });
                      }}
                    >
                      Update Estimate
                    </button>
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
                            <Input id={`m-pay-amt-${b.id}`} type="number" placeholder="0" />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium">Method</label>
                            <Input id={`m-pay-met-${b.id}`} placeholder="UPI / Cash / Card" />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium">Reference</label>
                            <Input id={`m-pay-ref-${b.id}`} placeholder="Txn / UTR / last 4" />
                          </div>
                          <Button
                            onClick={async () => {
                              const amtEl = document.getElementById(`m-pay-amt-${b.id}`) as HTMLInputElement | null;
                              const metEl = document.getElementById(`m-pay-met-${b.id}`) as HTMLInputElement | null;
                              const refEl = document.getElementById(`m-pay-ref-${b.id}`) as HTMLInputElement | null;
                              const amount = Number(amtEl?.value || 0);
                              const method = metEl?.value || "";
                              const reference = refEl?.value || "";
                              if (!amount || amount <= 0) { toast({ title: "Amount required", variant: "destructive" }); return; }
                              try {
                                await patchBookingApi(b.id, { action: "add_payment", amount, method, reference });
                                const next = await listApiBookings({ limit: 100 });
                                setBookings(next);
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
                                    <div key={`mh-${i}`} className="grid grid-cols-5 gap-2 p-2 text-xs">
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
                                    const rows = [["amount", "method", "reference", "byRole", "time"], ...(b.payments || []).map(p => [
                                      String(p.amount ?? ""),
                                      String(p.method ?? ""),
                                      String(p.reference ?? ""),
                                      String(p.byRole ?? ""),
                                      p.time ? new Date(p.time).toISOString() : ""
                                    ])];
                                    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
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
                    {["COMPLETED", "DELIVERED"].includes(String(b.status).toUpperCase()) ? (
                      <Badge variant="secondary">Completed Service</Badge>
                    ) : (
                      <button
                        className="rounded-md border px-3 py-1 text-sm"
                        onClick={async () => {
                          await patchBookingApi(b.id, { action: "merchant_complete_service" });
                          const list = await listApiBookings({ limit: 100 });
                          setBookings(list);
                          toast({ title: "Service completed" });
                        }}
                      >
                        Complete Service
                      </button>
                    )}
                    <button
                      className="rounded-md border px-3 py-1 text-sm"
                      onClick={async () => {
                        const invoice_number = String(window.prompt("Invoice number", "") || "");
                        const gst = Number(window.prompt("GST", "0") || "0");
                        const total = Number(window.prompt("Total", "0") || "0");
                        const file_url = String(window.prompt("Bill file URL", "") || "");
                        const breakdown = String(window.prompt("Breakdown", "") || "");
                        await patchBookingApi(b.id, { action: "merchant_upload_bill", invoice_number, gst, total, file_url, breakdown });
                        const list = await listApiBookings({ limit: 100 });
                        setBookings(list);
                        toast({ title: "Bill uploaded" });
                      }}
                    >
                      Upload Bill
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-4">
                <h3 className="font-heading text-lg font-bold">Available Bookings</h3>
                <div className="mt-3 space-y-3">
                  {availableBookings.length === 0 && (
                    <div className="rounded-lg border p-4 text-sm text-muted-foreground">No available bookings</div>
                  )}
                  {availableBookings.map((b) => (
                    <div key={`avail-${b.id}`} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium">{b.customerEmail}</div>
                        <div className="text-sm text-muted-foreground">{(b.vehicle === "bike" ? "Bike" : "Car")} — {b.service}</div>
                        <div className="text-xs text-muted-foreground">Reg: {b.registration || "-"}</div>
                        {b.location && (
                          <div className="text-xs text-muted-foreground">
                            Location: {b.location.formatted ? b.location.formatted : (b.location.lat !== undefined && b.location.lng !== undefined ? `${b.location.lat}, ${b.location.lng}` : "-")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-md border px-3 py-1 text-sm"
                          onClick={async () => {
                            if (!me?.id) {
                              toast({ title: "Cannot claim", description: "Current merchant not found", variant: "destructive" });
                              return;
                            }
                            await patchBookingApi(b.id, { action: "assign_merchant", merchantId: me.id });
                            const list = await listApiBookings({ limit: 100 });
                            setBookings(list);
                            toast({ title: "Booking claimed" });
                          }}
                        >
                          Claim booking
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}


        {tab === "earnings" && (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="rounded-xl border bg-card p-6 shadow-card">
            <h2 className="font-heading text-xl font-bold">Earnings</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4"><div className="text-sm">This Month</div><div className="font-heading text-2xl font-bold">₹{thisMonthPaid.toLocaleString("en-IN")}</div></div>
              <div className="rounded-lg border p-4"><div className="text-sm">Pending</div><div className="font-heading text-2xl font-bold">₹{totalPending.toLocaleString("en-IN")}</div></div>
              <div className="rounded-lg border p-4"><div className="text-sm">Paid</div><div className="font-heading text-2xl font-bold">₹{totalPaid.toLocaleString("en-IN")}</div></div>
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

export default MerchantDashboard;
