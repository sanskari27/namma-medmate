import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({
  children,
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const variantClass = variant === 'primary' ? 'bg-cta text-cta-foreground' : 'bg-surface text-ink';
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md px-4 py-2 text-base font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus ${variantClass} ${className ?? ''}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
