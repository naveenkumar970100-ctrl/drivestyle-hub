import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Wrench, Droplets, Settings, Gauge, Paintbrush, Shield, Car, Bike } from "lucide-react";

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const servicesList = [
  { icon: Wrench, title: "General Service", desc: "Complete checkup and maintenance for cars & bikes", price: "From $49" },
  { icon: Droplets, title: "Oil Change", desc: "Premium synthetic oil change with filter replacement", price: "From $29" },
  { icon: Settings, title: "Engine Repair", desc: "Full engine diagnostics and repair services", price: "From $199" },
  { icon: Gauge, title: "Performance Tuning", desc: "Boost your vehicle's performance and efficiency", price: "From $149" },
  { icon: Paintbrush, title: "Detailing & Paint", desc: "Professional paint correction and ceramic coating", price: "From $99" },
  { icon: Shield, title: "Insurance Claims", desc: "Hassle-free insurance claim processing", price: "Free" },
  { icon: Car, title: "Car Wash", desc: "Interior and exterior deep cleaning", price: "From $19" },
  { icon: Bike, title: "Bike Service", desc: "Complete two-wheeler service and repair", price: "From $29" },
];

const Services = () => (
  <Layout>
    <section className="gradient-hero py-20">
      <div className="container">
        <motion.h1 {...fadeUp} className="font-heading text-5xl font-bold text-primary-foreground">Our Services</motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="mt-4 max-w-2xl text-lg text-primary-foreground/80">
          Comprehensive car & bike services at your convenience. Quality work, fair prices.
        </motion.p>
      </div>
    </section>

    <section className="py-20">
      <div className="container">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {servicesList.map((s, i) => (
            <motion.div key={s.title} {...fadeUp} transition={{ delay: i * 0.08 }}
              className="group rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1"
            >
              <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3 transition-colors group-hover:bg-accent/20">
                <s.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-heading text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <p className="mt-4 font-heading text-lg font-bold text-accent">{s.price}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Services;
