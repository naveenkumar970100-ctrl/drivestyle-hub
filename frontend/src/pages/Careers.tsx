import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { MapPin, Clock, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const jobs = [
  { title: "Senior Mechanic", location: "Los Angeles, CA", type: "Full-time", dept: "Service" },
  { title: "Bike Technician", location: "San Francisco, CA", type: "Full-time", dept: "Service" },
  { title: "Service Advisor", location: "New York, NY", type: "Full-time", dept: "Customer Relations" },
  { title: "Marketing Manager", location: "Remote", type: "Full-time", dept: "Marketing" },
  { title: "Parts Specialist", location: "Chicago, IL", type: "Part-time", dept: "Inventory" },
];

const Careers = () => (
  <Layout>
    <section className="gradient-hero py-20">
      <div className="container">
        <motion.h1 {...fadeUp} className="font-heading text-5xl font-bold text-primary-foreground">Careers</motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="mt-4 max-w-2xl text-lg text-primary-foreground/80">
          Join our team and build a rewarding career in the automotive industry.
        </motion.p>
      </div>
    </section>

    <section className="py-20">
      <div className="container max-w-3xl">
        <motion.h2 {...fadeUp} className="font-heading text-3xl font-bold">Open Positions</motion.h2>
        <div className="mt-8 space-y-4">
          {jobs.map((j, i) => (
            <motion.div key={j.title} {...fadeUp} transition={{ delay: i * 0.1 }}
              className="flex flex-col gap-3 rounded-xl border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 className="font-heading text-xl font-semibold">{j.title}</h3>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{j.type}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{j.dept}</span>
                </div>
              </div>
              <Link to="/contact">
                <Button size="sm" className="gradient-accent border-0 text-accent-foreground">Apply</Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Careers;
