import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { revealItem } from '../motion/reveal';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  phase: string;
  icon: LucideIcon;
}

/** Estado vacío para las pantallas que llegan en fases posteriores. */
export function PlaceholderScreen({
  title,
  description,
  phase,
  icon: Icon,
}: PlaceholderScreenProps) {
  return (
    <div className="flex h-full flex-col gap-5 px-8 py-[26px]">
      <motion.h1
        variants={revealItem}
        className="font-display text-4xl font-semibold tracking-tight"
      >
        {title}
      </motion.h1>
      <motion.div
        variants={revealItem}
        className="glass flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center"
      >
        <div className="grid size-16 place-items-center rounded-2xl bg-ice/[0.12]">
          <Icon className="size-8 text-ice" aria-hidden="true" strokeWidth={1.6} />
        </div>
        <p className="max-w-md text-base text-text">{description}</p>
        <p className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-muted">{phase}</p>
      </motion.div>
    </div>
  );
}
