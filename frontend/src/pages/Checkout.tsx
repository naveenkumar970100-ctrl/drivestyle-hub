import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { addBooking, getAuth } from "@/lib/utils";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const Checkout = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const vehicle = params.get("vehicle") || "car";
  const service = params.get("service") || "Service";
  const date = params.get("date") || "";
  const time = params.get("time") || "";
  const slot = params.get("slot") || "";
  const price = params.get("price") || "";

  const confirm = () => {
    const session = getAuth();
    const customerEmail = session?.email || "guest";
    addBooking({
      customerEmail,
      vehicle: vehicle === "bike" ? "bike" : "car",
      service,
      date,
      time,
      slot: slot || undefined,
      price: price || undefined,
    });
    navigate(`/dashboard/customer`);
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
