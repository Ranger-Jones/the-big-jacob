import type { ButtonHTMLAttributes } from 'react';
import { cx } from '@/lib/cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'velvet';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-gold-soft to-gold text-ink shadow-[0_4px_0_var(--color-gold-deep)] active:shadow-[0_1px_0_var(--color-gold-deep)]',
  secondary: 'bg-parchment text-ink ring-2 ring-inset ring-line shadow-[0_4px_0_var(--color-line)] active:shadow-[0_1px_0_var(--color-line)]',
  ghost: 'bg-transparent text-current opacity-80 hover:opacity-100 hover:bg-white/10',
  danger: 'bg-wax text-parchment shadow-[0_4px_0_#7f1a22] active:shadow-[0_1px_0_#7f1a22]',
  velvet: 'bg-velvet-soft text-parchment ring-2 ring-inset ring-white/10 shadow-[0_4px_0_var(--color-velvet-deep)] active:shadow-[0_1px_0_var(--color-velvet-deep)]',
};
const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm rounded-xl',
  md: 'min-h-11 px-5 text-base rounded-2xl',
  lg: 'min-h-14 px-7 text-lg rounded-[1.25rem]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cx(
    'inline-flex select-none items-center justify-center gap-2 font-bold transition-[transform,box-shadow,opacity] duration-100',
    'active:translate-y-[3px] disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant], SIZES[size], extra,
  );
}

export function Button({
  variant = 'primary', size = 'md', className, type = 'button', ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
