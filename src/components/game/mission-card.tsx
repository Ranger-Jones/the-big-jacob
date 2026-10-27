'use client';
import { motion, useReducedMotion } from 'motion/react';
import { Icon, MISSION_ICONS } from '@/components/ui/icons';
import { cx } from '@/lib/cx';
import { MISSION_TEXT } from '@/lib/jakob/texts';
import type { MissionId } from '@/lib/jakob/types';

/**
 * The secret mission as a sealed card. With `flip` it starts face down and turns over –
 * used for the automatic reveal at the start of the game.
 */
export function MissionCard({ mission, flip }: { mission: { id: MissionId; done: boolean }; flip: boolean }) {
  const reduce = useReducedMotion();
  const animate = flip && !reduce;
  const text = MISSION_TEXT[mission.id];
  return (
    <div className="mx-auto w-full max-w-[16rem] [perspective:900px]">
      <motion.div
        className="relative aspect-[5/7] w-full [transform-style:preserve-3d]"
        initial={animate ? { rotateY: 180, scale: 0.85 } : false}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ delay: animate ? 0.35 : 0, duration: 0.9, type: 'spring', stiffness: 90, damping: 14 }}
      >
        {/* Front: the mission */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[1.4rem] border-4 border-gold-deep bg-[radial-gradient(ellipse_at_50%_20%,#fff6dd,#efdfbb)] p-5 text-center text-[#2b1a12] shadow-[0_10px_24px_rgb(0_0_0/0.45)] [backface-visibility:hidden]"
        >
          <span className="text-xs font-bold tracking-wide text-[#6b5442]">Geheime Mission</span>
          <span className="flex size-20 items-center justify-center rounded-full bg-[#2a1745] text-[#ffd77a] ring-4 ring-[#b07a12]/60">
            <Icon name={MISSION_ICONS[mission.id] ?? 'target'} className="size-11" />
          </span>
          <span className="font-display text-3xl font-bold leading-tight text-[#2b1a12]">{text.title}</span>
          <span className="text-base leading-snug text-[#3d2a1c]">{text.text}</span>
          <span className={cx('mt-1 rounded-full px-3 py-1 text-sm font-bold', mission.done ? 'bg-[#2f9e62]/15 text-[#1f6b41]' : 'bg-[#f4b73a]/40 text-[#2b1a12]')}>
            {mission.done ? <><Icon name="check-circle" /> Erfüllt – +3 Punkte!</> : '+3 Bonuspunkte'}
          </span>
        </div>
        {/* Back: sealed letter */}
        <div className="absolute inset-0 flex items-center justify-center rounded-[1.4rem] border-4 border-gold-deep bg-[repeating-linear-gradient(45deg,#3d2361_0_10px,#2a1745_10px_20px)] shadow-[0_10px_24px_rgb(0_0_0/0.45)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="flex size-20 items-center justify-center rounded-full bg-wax text-parchment shadow-[0_4px_0_#7f1a22] ring-4 ring-wax/40">
            <Icon name="target" className="size-10" />
          </span>
        </div>
      </motion.div>
    </div>
  );
}
