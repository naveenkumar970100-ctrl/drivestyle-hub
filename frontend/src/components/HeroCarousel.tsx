import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
const carImage1 = new URL("../assets/carousel-car-1.jpg", import.meta.url).href;
const bikeImage1 = new URL("../assets/carousel-bike-1.jpg", import.meta.url).href;
const carImage2 = new URL("../assets/carousel-car-2.jpg", import.meta.url).href;

const slides = [
  {
    image: carImage1,
    title: "Premium Car Services",
    subtitle: "Expert maintenance & repair for your vehicle",
  },
  {
    image: bikeImage1,
    title: "Bike Performance Tuning",
    subtitle: "Unleash the full potential of your motorcycle",
  },
  {
    image: carImage2,
    title: "Professional Detailing",
    subtitle: "Showroom quality finish for every vehicle",
  },
];

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), []);
  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);

  useEffect(() => {
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next]);

  return (
    <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <img
            src={slides[current].image}
            alt={slides[current].title}
            className="h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-end">
        <div className="container pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h1 className="font-heading text-5xl font-bold text-primary-foreground md:text-7xl">
                {slides[current].title}
              </h1>
              <p className="mt-3 text-lg text-primary-foreground/80 md:text-xl">
                {slides[current].subtitle}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-card/20 p-2 backdrop-blur-sm transition hover:bg-card/40"
      >
        <ChevronLeft className="h-6 w-6 text-primary-foreground" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-card/20 p-2 backdrop-blur-sm transition hover:bg-card/40"
      >
        <ChevronRight className="h-6 w-6 text-primary-foreground" />
      </button>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-8 bg-accent" : "w-2 bg-primary-foreground/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
