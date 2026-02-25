import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getAuth, createBookingApi } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const Checkout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const vehicle = params.get("vehicle") || "car";
  const service = params.get("service") || "Service";
  const date = params.get("date") || "";
  const time = params.get("time") || "";
  const slot = params.get("slot") || "";
  const price = params.get("price") || "";
  const reg = params.get("reg") || "";
  const lat = params.get("lat");
  const lng = params.get("lng");
  const addr = params.get("addr") || "";

  const confirm = async () => {
    const session = getAuth();
    if (!session?.email) {
      navigate("/login");
      return;
    }
    if (!reg.trim()) {
      toast({ title: "Vehicle number required", description: "Enter your registration number to proceed", variant: "destructive" });
      const back = `/book/date?vehicle=${encodeURIComponent(vehicle)}&service=${encodeURIComponent(service)}&price=${encodeURIComponent(price)}`;
      navigate(back);
      return;
    }
    try {
      const priceNum = Number(price.replace(/[^0-9]/g, "")) || 0;
      await createBookingApi({
        customerEmail: session.email,
        vehicle: vehicle === "bike" ? "bike" : "car",
        service,
        location: lat && lng ? { formatted: addr || undefined, lat: parseFloat(lat), lng: parseFloat(lng) } : undefined,
        date,
        time,
        registration: reg.trim(),
        price: priceNum,
      });
      toast({ title: "Booking created", description: "Waiting for admin approval" });
      navigate(`/dashboard/customer`);
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      toast({ title: "Failed to book", description: m, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="container py-16">
        <motion.h1 {...fadeUp} className="font-heading text-3xl font-bold">Checkout</motion.h1>
        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="mt-6 rounded-xl border bg-card p-6 shadow-card">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Vehicle</div>
              <div className="font-medium capitalize">{vehicle}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Service</div>
              <div className="font-medium">{service}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Date</div>
              <div className="font-medium">{date}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Time</div>
              <div className="font-medium">{time}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm text-muted-foreground">Pickup Location</div>
              <div className="font-medium">{lat && lng ? (addr ? `${addr} — ${lat}, ${lng}` : `${lat}, ${lng}`) : "—"}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-sm text-muted-foreground">Price</div>
              <div className="font-heading text-xl font-bold text-accent">{price || "—"}</div>
            </div>
          </div>
          <Button onClick={confirm} className="mt-6 w-full gradient-accent border-0 text-accent-foreground">Confirm Booking</Button>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Checkout;
