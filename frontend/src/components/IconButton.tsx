import React from 'react';

export type IconButtonVariant = 'default' | 'primary' | 'success' | 'danger';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  icon: React.ReactNode;
  label: string;
}

const IconButton: React.FC<IconButtonProps> = ({
  variant = 'default',
  icon,
  label,
  className = '',
  ...props
}) => {
  // Accessibility: target >= 44x44 per CompassVisualDesignGuidelines.md
  const base =
    'inline-flex items-center justify-center rounded-default transition-standard focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px]';

  const variantStyles: Record<IconButtonVariant, string> = {
    default: 'bg-snow text-ink border border-stone hover:bg-fog hover:shadow-e01',
    primary: 'bg-action text-snow border border-action hover:bg-action-hover hover:shadow-e01',
    success: 'bg-mint text-green-700 border border-mint hover:bg-mint/80 hover:shadow-e01',
    danger: 'bg-blush text-danger border border-blush hover:bg-blush/80 hover:shadow-e01',
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`${base} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <span className="w-20 h-20 flex items-center justify-center">{icon}</span>
    </button>
  );
};

export default IconButton;


