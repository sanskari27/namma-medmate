import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Package,
  Receipt,
  ScrollText,
  Users,
} from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const SLIDES = [
  {
    id: 'billing',
    title: 'Bill at the counter',
    body: 'Ring a sale without hunting chrome. GST, batch, and khata stay on this screen.',
    icon: Receipt,
  },
  {
    id: 'stock',
    title: 'Stock before it expires',
    body: 'FEFO on the floor. See batches that will age out this week, not a dashboard tile.',
    icon: Package,
  },
  {
    id: 'khata',
    title: 'Patient khata in reach',
    body: 'Name, phone, running credit — pick up the last bill without leaving the counter.',
    icon: Users,
  },
  {
    id: 'gst',
    title: 'GST invoices as you go',
    body: 'Paise-accurate totals. Print or file the invoice while the customer is still here.',
    icon: FileSpreadsheet,
  },
  {
    id: 'rx',
    title: 'Prescriptions waiting',
    body: 'Held scripts stay in the rail. Dispense when the patient is at the window.',
    icon: ScrollText,
  },
] as const;

const AUTOPLAY_MS = 6000;

export function CounterFeatureSlider() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = SLIDES[index];
  const Icon = slide.icon;

  useEffect(() => {
    if (reduce || paused) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [reduce, paused]);

  const go = (next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length);
  };

  if (!isDesktop) {
    return null;
  }

  return (
    <section
      className="relative flex min-h-screen flex-col justify-between bg-ink px-10 py-10 text-canvas"
      aria-roledescription="carousel"
      aria-label="Counter features"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className="font-serif text-3xl font-semibold text-brand-soft">MedMate</p>
      <div className="max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
          >
            <Icon className="size-8 text-brand-soft" aria-hidden="true" />
            <h2 className="mt-5 font-serif text-4xl leading-tight font-semibold">{slide.title}</h2>
            <p className="mt-4 text-sm leading-relaxed text-brand-soft">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-xs text-brand-soft">IST — shop floor</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid size-8 place-items-center border border-line/40 text-canvas hover:bg-brand-soft/10"
            aria-label="Previous feature"
            onClick={() => go(index - 1)}
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex gap-1.5">
            {SLIDES.map((item, slideIndex) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show ${item.title}`}
                aria-current={slideIndex === index ? 'true' : undefined}
                className={
                  slideIndex === index ? 'h-1.5 w-6 bg-brand-soft' : 'h-1.5 w-2 bg-line/50'
                }
                onClick={() => setIndex(slideIndex)}
              />
            ))}
          </div>
          <button
            type="button"
            className="grid size-8 place-items-center border border-line/40 text-canvas hover:bg-brand-soft/10"
            aria-label="Next feature"
            onClick={() => go(index + 1)}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

export function CounterFeatureStrip() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  useEffect(() => {
    if (reduce || isDesktop) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [reduce, isDesktop]);

  if (isDesktop) {
    return null;
  }

  return (
    <p className="border-b border-line bg-brand-soft px-6 py-2 text-xs text-ink">
      {slide.title} — {slide.body}
    </p>
  );
}
