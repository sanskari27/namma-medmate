import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BadgeCheck, Building2, ChevronLeft, ChevronRight, CreditCard, ScanSearch, Shield } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const SLIDES = [
  {
    id: 'kyc',
    code: 'KYC-QUEUE',
    title: 'Tenant KYC queue',
    body: 'Approve drug licence and GST packs before a pharmacy unlocks. Work the queue, not a counter.',
    icon: BadgeCheck,
  },
  {
    id: 'plans',
    code: 'PLAN-EXPIRY',
    title: 'Plan and expiry overrides',
    body: 'See which tenants lapse this week. MASTER can extend or freeze from this console.',
    icon: CreditCard,
  },
  {
    id: 'impersonation',
    code: 'SUPPORT-SESSION',
    title: 'Impersonation for support',
    body: 'Enter a tenant as MASTER when the pharmacy is stuck. Exit restores the HQ session.',
    icon: Shield,
  },
  {
    id: 'scan',
    code: 'TENANT-SCAN',
    title: 'Scan many pharmacies',
    body: 'Hairline rows of tenants, not one shop floor. Filter by KYC, plan, and city.',
    icon: ScanSearch,
  },
  {
    id: 'agents',
    code: 'VERIFY-AGENT',
    title: 'Verification agents',
    body: 'MASTER-created agents clear licence packs. Keep the verification lane off the POS.',
    icon: Building2,
  },
] as const;

const AUTOPLAY_MS = 6000;

export function HqFeatureSlider() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = SLIDES[index];
  const Icon = slide.icon;

  useEffect(() => {
    if (reduce || paused || !isDesktop) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [reduce, paused, isDesktop]);

  const go = (next: number) => {
    setIndex((next + SLIDES.length) % SLIDES.length);
  };

  if (!isDesktop) {
    return null;
  }

  return (
    <section
      className="relative flex min-h-screen flex-1 flex-col justify-between bg-canvas px-10 py-10"
      aria-roledescription="carousel"
      aria-label="HQ operations"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className="font-mono text-xs text-brand">Master console</p>
      <div className="max-w-md border-l border-brand pl-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={reduce ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -12 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-mono text-xs text-muted">{slide.code}</p>
            <div className="mt-3 flex items-center gap-3">
              <Icon className="size-5 text-brand" aria-hidden="true" />
              <h2 className="font-serif text-3xl font-semibold">{slide.title}</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between">
        <p className="max-w-sm text-sm text-muted">Built to scan many pharmacies — not to run a single counter.</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="grid size-7 place-items-center border border-line text-ink hover:bg-elevated"
            aria-label="Previous operation"
            onClick={() => go(index - 1)}
          >
            <ChevronLeft className="size-4" />
          </button>
          <ol className="flex gap-1">
            {SLIDES.map((item, slideIndex) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-label={`Show ${item.title}`}
                  aria-current={slideIndex === index ? 'true' : undefined}
                  className={
                    slideIndex === index
                      ? 'h-6 w-6 border border-brand bg-brand-soft font-mono text-[10px] text-brand'
                      : 'h-6 w-6 border border-line font-mono text-[10px] text-muted'
                  }
                  onClick={() => setIndex(slideIndex)}
                >
                  {slideIndex + 1}
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="grid size-7 place-items-center border border-line text-ink hover:bg-elevated"
            aria-label="Next operation"
            onClick={() => go(index + 1)}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

export function HqStatusTicker() {
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
    <p className="border-b border-line bg-elevated px-8 py-2 font-mono text-[11px] text-brand">
      {slide.code} · {slide.title}
    </p>
  );
}
