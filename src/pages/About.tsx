import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Users, Award, Target, TrendingUp } from "lucide-react";

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const stats = [
  { icon: Users, value: "50K+", label: "Happy Customers" },
  { icon: Award, value: "15+", label: "Years Experience" },
  { icon: Target, value: "200+", label: "Service Centers" },
  { icon: TrendingUp, value: "98%", label: "Satisfaction Rate" },
];

const About = () => (
  <Layout>
    <section className="gradient-hero py-20">
      <div className="container">
        <motion.h1 {...fadeUp} className="font-heading text-5xl font-bold text-primary-foreground">About Us</motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="mt-4 max-w-2xl text-lg text-primary-foreground/80">
          AutoServ is a trusted name in car and bike services. We are passionate about keeping your vehicles running at peak performance.
        </motion.p>
      </div>
    </section>

    <section className="py-20">
      <div className="container grid gap-12 lg:grid-cols-2">
        <motion.div {...fadeUp}>
          <h2 className="font-heading text-3xl font-bold">Our <span className="text-gradient">Mission</span></h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            To provide world-class automotive services with transparency, reliability, and customer-first approach. We believe every vehicle deserves expert care, and every customer deserves peace of mind.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Founded with a vision to transform the automotive service industry, AutoServ combines cutting-edge technology with skilled craftsmanship to deliver exceptional results every time.
          </p>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <h2 className="font-heading text-3xl font-bold">Our <span className="text-gradient">Vision</span></h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            To become the most trusted and accessible automotive service network, empowering vehicle owners with convenient, high-quality maintenance solutions across the nation.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We envision a future where getting your car or bike serviced is as easy as ordering online — transparent pricing, doorstep pickup, and guaranteed quality.
          </p>
        </motion.div>
      </div>
    </section>

    <section className="bg-muted py-20">
      <div className="container">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.1 }} className="rounded-xl bg-card p-6 text-center shadow-card">
              <s.icon className="mx-auto h-8 w-8 text-accent" />
              <div className="mt-3 font-heading text-3xl font-bold">{s.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default About;
