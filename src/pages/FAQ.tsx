import { Layout } from "@/components/Layout";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const faqs = [
  { q: "What types of vehicles do you service?", a: "We service all types of cars and bikes — from sedans, SUVs, and hatchbacks to sport bikes, cruisers, and scooters. All major brands are covered." },
  { q: "How do I book a service?", a: "You can book online through our website, call us, or visit any of our service centers. Registered customers can also book through their dashboard." },
  { q: "Do you offer pickup and drop service?", a: "Yes! We offer free pickup and drop for all services above $99. Just mention it while booking." },
  { q: "What payment methods do you accept?", a: "We accept all major credit/debit cards, UPI, net banking, and cash payments at our service centers." },
  { q: "How long does a typical service take?", a: "A general service takes 2-4 hours. Major repairs may take 1-2 business days. We'll give you an estimated timeline when you book." },
  { q: "Do you provide warranty on repairs?", a: "Yes, all our repairs come with a minimum 6-month warranty. Some premium services include up to 1-year coverage." },
  { q: "Can I become a service partner or merchant?", a: "Absolutely! Register as a merchant on our platform. After admin approval, you can start listing your services and accepting bookings." },
  { q: "How does the staff/merchant approval process work?", a: "After registration, your application is reviewed by our admin team within 24-48 hours. You'll receive a confirmation email once approved." },
];

const FAQ = () => (
  <Layout>
    <section className="gradient-hero py-20">
      <div className="container">
        <motion.h1 {...fadeUp} className="font-heading text-5xl font-bold text-primary-foreground">FAQ</motion.h1>
        <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="mt-4 max-w-2xl text-lg text-primary-foreground/80">
          Frequently asked questions about our services.
        </motion.p>
      </div>
    </section>

    <section className="py-20">
      <div className="container max-w-3xl">
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.05 }}>
              <AccordionItem value={`q-${i}`} className="rounded-xl border bg-card px-6 shadow-card">
                <AccordionTrigger className="font-heading text-lg font-semibold hover:no-underline hover:text-accent">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  </Layout>
);

export default FAQ;
