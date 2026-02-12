import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const Contact = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <Layout>
      <section className="gradient-hero py-20">
        <div className="container">
          <motion.h1 {...fadeUp} className="font-heading text-5xl font-bold text-primary-foreground">Contact Us</motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="mt-4 max-w-2xl text-lg text-primary-foreground/80">
            Have questions? We'd love to hear from you.
          </motion.p>
        </div>
      </section>

      <section className="py-20">
        <div className="container grid gap-12 lg:grid-cols-2">
          <motion.div {...fadeUp}>
            <h2 className="font-heading text-3xl font-bold">Get in <span className="text-gradient">Touch</span></h2>
            <div className="mt-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-accent/10 p-3"><Mail className="h-5 w-5 text-accent" /></div>
                <div><h4 className="font-semibold">Email</h4><p className="text-sm text-muted-foreground">info@autoserv.com</p></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-accent/10 p-3"><Phone className="h-5 w-5 text-accent" /></div>
                <div><h4 className="font-semibold">Phone</h4><p className="text-sm text-muted-foreground">+1 (555) 123-4567</p></div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-accent/10 p-3"><MapPin className="h-5 w-5 text-accent" /></div>
                <div><h4 className="font-semibold">Address</h4><p className="text-sm text-muted-foreground">123 Auto Lane, Los Angeles, CA 90001</p></div>
              </div>
            </div>
          </motion.div>

          <motion.form {...fadeUp} transition={{ delay: 0.2 }} onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-8 shadow-card">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="Your Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <Input type="email" placeholder="Your Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            <Textarea placeholder="Your Message" rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
            <Button type="submit" className="w-full gradient-accent border-0 text-accent-foreground">
              <Send className="mr-2 h-4 w-4" /> Send Message
            </Button>
          </motion.form>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
