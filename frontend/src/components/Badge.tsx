import React from 'react';

export type BadgeVariant =
  | 'mint'
  | 'sky'
  | 'lavender'
  | 'blush'
  | 'sun'
  | 'neutral'
  | 'success'
  | 'warn'
  | 'danger';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'small' | 'medium';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'medium',
  className = '',
}) => {
  // Base styles
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-pill transition-colors duration-micro';

  // Variant styles (using pastel backgrounds with appropriate text colors)
  const variantStyles = {
    mint: 'bg-mint text-green-700 border border-mint',
    sky: 'bg-sky text-blue-700 border border-sky',
    lavender: 'bg-lavender text-purple-700 border border-lavender',
    blush: 'bg-blush text-pink-700 border border-blush',
    sun: 'bg-sun text-amber-700 border border-sun',
    neutral: 'bg-cloud text-slate border border-stone',
    success: 'bg-success/10 text-success border border-success/30',
    warn: 'bg-warn/10 text-warn border border-warn/30',
    danger: 'bg-danger/10 text-danger border border-danger/30',
  };

  // Size styles
  const sizeStyles = {
    small: 'px-8 py-1 text-micro',
    medium: 'px-12 py-1 text-small',
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
