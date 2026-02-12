import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Car, Bike } from "lucide-react";

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const servicesList = [
  { icon: Car, title: "Car Services", desc: "Explore all car service categories", price: "View", href: "/services/car" },
  { icon: Bike, title: "Bike Services", desc: "Explore all bike service categories", price: "View", href: "/services/bike" },
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
        <div className="min-h-[40vh] grid grid-cols-1 justify-items-center gap-0 md:grid-cols-2 md:gap-0">
          {servicesList.map((s, i) => (
            <Link to={s.href} key={s.title} className="block">
              <motion.div {...fadeUp} transition={{ delay: i * 0.08 }}
                className="group rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1 md:mx-2"
              >
                <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3 transition-colors group-hover:bg-accent/20">
                  <s.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-heading text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                <p className="mt-4 font-heading text-lg font-bold text-accent">{s.price}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Services;
