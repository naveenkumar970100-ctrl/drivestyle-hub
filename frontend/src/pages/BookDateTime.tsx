import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAuth, listCustomerVehiclesFromApi, type CustomerVehicle } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, type MapContainerProps } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useToast } from "@/hooks/use-toast";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const BookDateTime = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const vehicle = params.get("vehicle") || "car";
  const service = params.get("service") || "Service";
  const price = params.get("price") || "";
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [reg, setReg] = useState<string>("");
  const [addr, setAddr] = useState<string>("");
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

  const session = getAuth();
  useEffect(() => {
    if (!session) {
      const next = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?next=${next}`);
    }
  }, [session, location.pathname, location.search, navigate]);

  useEffect(() => {
    const session = getAuth();
    if (!session?.email) return;
    (async () => {
      try {
        const v = await listCustomerVehiclesFromApi(session.email);
        setVehicles(v);
        if (v.length > 0) setReg(v[0].plate || v[0].vin || "");
      } catch {
        setVehicles([]);
      }
    })();
  }, []);

  const onContinue = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const date = (form.elements.namedItem("date") as HTMLInputElement).value;
    const time = (form.elements.namedItem("time") as HTMLInputElement).value;
    const query = new URLSearchParams();
    query.set("vehicle", vehicle);
    query.set("service", service);
    query.set("date", date);
    query.set("time", time);
    query.set("price", price);
    if (reg) query.set("reg", reg);
    if (custPos) {
      query.set("lat", String(custPos[0]));
      query.set("lng", String(custPos[1]));
    }
    if (addr) query.set("addr", addr);
    navigate(`/checkout?${query.toString()}`);
  };

  if (!session) return null;
  return (
    <Layout>
      <div className="container py-16">
        <motion.h1 {...fadeUp} className="font-heading text-3xl font-bold">Pick Date & Time</motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="mt-2 text-muted-foreground">
          {vehicle === "bike" ? "Bike" : "Car"} — {service} {price && `• ${price}`}
        </motion.p>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <motion.form {...fadeUp} transition={{ delay: 0.2 }} onSubmit={onContinue} className="space-y-4 rounded-xl border bg-card p-6 shadow-card">
          <div>
            <label className="mb-1 block text-sm font-medium">Select Vehicle</label>
            {vehicles.length === 0 ? (
              <Input placeholder="Enter vehicle registration" value={reg} onChange={(e) => setReg(e.target.value)} />
            ) : (
              <Select value={reg} onValueChange={setReg}>
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
              <Input placeholder="Address (optional)" value={addr} onChange={(e) => setAddr(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Preferred Date</label>
            <Input type="date" name="date" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Preferred Time</label>
            <Input type="time" name="time" required />
          </div>
          <Button type="submit" className="w-full gradient-accent border-0 text-accent-foreground">Book Now</Button>
        </motion.form>
        <motion.div {...fadeUp} transition={{ delay: 0.25 }} className="rounded-xl border bg-card p-6 shadow-card">
          <h2 className="font-heading text-lg font-bold mb-3">Pickup Location Map</h2>
          <div className="rounded-lg border overflow-hidden">
            <MapContainer {...mapProps}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClickPicker onPick={(latlng) => setCustPos([latlng.lat, latlng.lng])} />
              <CenterOnPos pos={custPos} />
              {custPos && <Marker position={custPos} />}
            </MapContainer>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
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
                    setAddr((prev) => (prev && prev.trim().length > 0 ? prev : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`));
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
        </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default BookDateTime;

function ClickPicker({ onPick }: { onPick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

function CenterOnPos({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) {
      map.setView(pos, 13);
    }
  }, [pos, map]);
  return null;
}
