import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Wrench, Droplets, Gauge, Settings, Paintbrush, Shield, Bike, type LucideIcon } from "lucide-react";
import { listServices, getAuth } from "@/lib/utils";

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const iconMap: Record<string, LucideIcon> = { Periodic: Wrench, Oil: Droplets, Brake: Gauge, Chain: Settings, Detailing: Paintbrush, Insurance: Shield };

const BikeServices = () => {
  const navigate = useNavigate();
  const bikeServices = listServices("bike").map((s) => ({
    icon: iconMap[s.title.split(" ")[0]] || Wrench,
    title: s.title,
    desc: s.desc,
    price: s.price === 0 ? "Free" : `From ₹${Number(s.price).toLocaleString("en-IN")}`,
  }));

  return (
    <Layout>
      <section className="gradient-hero py-20">
        <div className="container">
          <motion.h1 {...fadeUp} className="flex items-center gap-3 font-heading text-5xl font-bold text-primary-foreground">
            <Bike className="h-10 w-10 text-accent" /> Bike Services
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="mt-4 max-w-2xl text-lg text-primary-foreground/80">
            Specialized services for two-wheelers. Reliable, quick, and affordable.
          </motion.p>
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bikeServices.map((s, i) => (
              <motion.div key={s.title} {...fadeUp} transition={{ delay: i * 0.08 }}
                className="group rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3 transition-colors group-hover:bg-accent/20">
                  <s.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-heading text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                <p className="mt-4 font-heading text-lg font-bold text-accent">{s.price}</p>
                <button
                  className="mt-4 w-full rounded-md border bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
                  onClick={() => {
                    const target = `/book/date?vehicle=bike&service=${encodeURIComponent(s.title)}&price=${encodeURIComponent(s.price)}`;
                    const authed = getAuth();
                    navigate(authed ? target : `/login?next=${encodeURIComponent(target)}`);
                  }}
                >
                  Book Now
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default BikeServices;
