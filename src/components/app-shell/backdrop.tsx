import { seasonFor } from '@/lib/season';
import { SeasonalDecor } from './seasonal';

/** Throne-room atmosphere behind every page: torch light from above and a vignette. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Soft torch light from the upper corners */}
      <div className="absolute -left-48 -top-48 size-[34rem] rounded-full bg-[radial-gradient(circle,rgb(255_170_80/0.14),transparent_65%)]" />
      <div className="absolute -right-48 -top-48 size-[34rem] rounded-full bg-[radial-gradient(circle,rgb(255_170_80/0.14),transparent_65%)]" />
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgb(255_200_120/0.08),transparent)]" />
      {/* Stone floor fading into darkness */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,rgb(10_4_20/0.75),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_55%,rgb(8_2_16/0.65)_100%)]" />
      <SeasonalDecor season={seasonFor(new Date())} />
    </div>
  );
}
