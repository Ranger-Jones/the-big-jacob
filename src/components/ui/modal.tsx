'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '@/lib/cx';

export function Modal({
  open, onClose, title, children, wide,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={cx(
        'parchment m-auto max-h-[90dvh] rounded-[1.5rem] p-0 ring-1 ring-line shadow-[0_8px_0_rgb(0_0_0/0.4)] backdrop:bg-velvet-deep/70 backdrop:backdrop-blur-[2px]',
        wide ? 'w-[min(94vw,40rem)]' : 'w-[min(92vw,26rem)]',
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 className="text-3xl font-bold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
