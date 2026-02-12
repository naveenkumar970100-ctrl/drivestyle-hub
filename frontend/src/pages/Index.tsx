import { Layout } from "@/components/Layout";
import { HeroCarousel } from "@/components/HeroCarousel";
import { motion } from "framer-motion";
import { Wrench, Shield, Clock, Star, Car, Bike } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Wrench, title: "Expert Repairs", desc: "Certified mechanics with years of experience" },
  { icon: Shield, title: "Quality Parts", desc: "Only genuine OEM parts used" },
  { icon: Clock, title: "Quick Turnaround", desc: "Same-day service for most repairs" },
  { icon: Star, title: "Satisfaction Guaranteed", desc: "100% customer satisfaction promise" },
];

const services = [
  { icon: Car, title: "Car Service", desc: "Full-service maintenance for all car brands", color: "bg-primary" },
  { icon: Bike, title: "Bike Service", desc: "Complete two-wheeler care & tuning", color: "gradient-accent" },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const Index = () => {
  return (
    <Layout>
      <HeroCarousel />

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <motion.h2 {...fadeUp} className="text-center font-heading text-4xl font-bold">
            Why Choose <span className="text-gradient">MotoHub</span>?
          </motion.h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-elevated hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex rounded-lg bg-accent/10 p-3">
                  <f.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-heading text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="gradient-hero py-20">
        <div className="container">
          <motion.h2 {...fadeUp} className="text-center font-heading text-4xl font-bold text-primary-foreground">
            Our Services
          </motion.h2>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-8 backdrop-blur-sm"
              >
                <s.icon className="h-12 w-12 text-accent" />
                <h3 className="mt-4 font-heading text-2xl font-bold text-primary-foreground">{s.title}</h3>
                <p className="mt-2 text-primary-foreground/70">{s.desc}</p>
                <Link to="/services">
                  <Button className="mt-6 gradient-accent border-0 text-accent-foreground">Learn More</Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-heading text-4xl font-bold">Ready to Get Started?</h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              Book your service today and experience the best car & bike care in town.
            </p>
            <Link to="/contact">
              <Button size="lg" className="mt-8 gradient-accent border-0 text-accent-foreground text-lg px-8">
                Book Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
