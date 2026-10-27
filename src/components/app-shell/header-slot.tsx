'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

/** How long the header stays put after it reappeared, so an icon can be tapped calmly. */
const HOLD_MS = 2500;
/** Ignore tiny scroll jitter (and iOS rubber-band bounces). */
const THRESHOLD = 8;

/**
 * Sticky site header that clears the iPhone status bar / notch (safe area) when installed as a web app.
 * Scrolling down slides it away; scrolling up brings it back and holds it for a moment. While it is
 * touched or focused it never hides. At the table on phones the screen belongs to the game, so it is hidden there.
 */
export function HeaderSlot({ children }: { children: ReactNode }) {
  const atTable = usePathname().startsWith('/spiel/');
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  const holdUntil = useRef(0);
  const engaged = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = Math.max(0, window.scrollY);
        const delta = y - lastY.current;
        setScrolled(y > 4);
        if (y < 64) {
          setHidden(false);
        } else if (delta < -THRESHOLD) {
          setHidden(false);
          holdUntil.current = Date.now() + HOLD_MS;
        } else if (delta > THRESHOLD && Date.now() > holdUntil.current && !engaged.current) {
          setHidden(true);
        }
        if (Math.abs(delta) > THRESHOLD) lastY.current = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const engage = () => {
    engaged.current = true;
    holdUntil.current = Date.now() + HOLD_MS;
    setHidden(false);
  };
  const release = () => {
    engaged.current = false;
    holdUntil.current = Date.now() + HOLD_MS;
  };

  return (
    <>
      {/* Keeps page content from showing through behind the status bar of the installed app. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-velvet-deep" />
      {/* At the table on phones the header is hidden, but the game's own toolbar must still clear the status bar. */}
      {atTable && <div aria-hidden className="h-[env(safe-area-inset-top)] sm:hidden" />}
      <div
        className={cx(
          'sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-[transform,background-color,box-shadow] duration-300 ease-out',
          scrolled ? 'bg-velvet-deep/85 shadow-[0_6px_18px_rgb(0_0_0/0.35)] backdrop-blur-md' : 'bg-transparent',
          hidden && '-translate-y-full',
          atTable && 'max-sm:hidden',
        )}
        onPointerDown={engage}
        onPointerUp={release}
        onPointerCancel={release}
        onFocusCapture={engage}
        onBlurCapture={release}
      >
        {children}
      </div>
    </>
  );
}
