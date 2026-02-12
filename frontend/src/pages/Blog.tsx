import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const posts = [
  { id: 1, title: "Top 10 Car Maintenance Tips for 2026", excerpt: "Keep your car running smoothly with these essential maintenance tips every owner should know.", date: "Feb 5, 2026", author: "John Doe", category: "Tips" },
  { id: 2, title: "Why Regular Bike Servicing Saves You Money", excerpt: "Regular servicing can prevent costly repairs. Learn how scheduled maintenance keeps your bike in top shape.", date: "Jan 28, 2026", author: "Jane Smith", category: "Maintenance" },
  { id: 3, title: "Electric Vehicles: Service Guide 2026", excerpt: "Everything you need to know about maintaining your EV. From battery health to tire rotation.", date: "Jan 20, 2026", author: "Mike Johnson", category: "EV" },
  { id: 4, title: "Choosing the Right Engine Oil", excerpt: "Synthetic vs conventional — which oil is best for your vehicle? Our experts weigh in.", date: "Jan 15, 2026", author: "Sarah Lee", category: "Guide" },
];

const Blog = () => (
  <Layout>
    <section className="gradient-hero py-20">
      <div className="container">
        <motion.h1 {...fadeUp} className="font-heading text-5xl font-bold text-primary-foreground">Blog</motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="mt-4 max-w-2xl text-lg text-primary-foreground/80">
          Tips, guides, and news from the automotive world.
        </motion.p>
      </div>
    </section>

    <section className="py-20">
      <div className="container">
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((p, i) => (
            <motion.article key={p.id} {...fadeUp} transition={{ delay: i * 0.1 }}
              className="group rounded-xl border bg-card p-6 shadow-card transition-all hover:shadow-elevated"
            >
              <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{p.category}</span>
              <h3 className="mt-3 font-heading text-2xl font-bold group-hover:text-accent transition-colors">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{p.author}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{p.date}</span>
                </div>
                <Link to="#" className="flex items-center gap-1 text-accent font-medium hover:underline">
                  Read <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  </Layout>
);

export default Blog;
