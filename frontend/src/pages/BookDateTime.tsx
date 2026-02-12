import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAuth } from "@/lib/utils";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const BookDateTime = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const vehicle = params.get("vehicle") || "car";
  const service = params.get("service") || "Service";
  const price = params.get("price") || "";

  if (!getAuth()) {
    const next = encodeURIComponent(location.pathname + location.search);
    navigate(`/login?next=${next}`);
    return null;
  }

  const onContinue = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const date = (form.elements.namedItem("date") as HTMLInputElement).value;
    const time = (form.elements.namedItem("time") as HTMLInputElement).value;
    navigate(`/checkout?vehicle=${encodeURIComponent(vehicle)}&service=${encodeURIComponent(service)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}&price=${encodeURIComponent(price)}`);
  };

  return (
    <Layout>
      <div className="container py-16">
        <motion.h1 {...fadeUp} className="font-heading text-3xl font-bold">Pick Date & Time</motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="mt-2 text-muted-foreground">
          {vehicle === "bike" ? "Bike" : "Car"} — {service} {price && `• ${price}`}
        </motion.p>
        <motion.form {...fadeUp} transition={{ delay: 0.2 }} onSubmit={onContinue} className="mt-8 max-w-lg space-y-4 rounded-xl border bg-card p-6 shadow-card">
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
      </div>
    </Layout>
  );
};

export default BookDateTime;
