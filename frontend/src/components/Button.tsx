import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  // Base styles
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-micro focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant styles
  const variantStyles = {
    primary: 'bg-action text-snow hover:bg-action-hover active:scale-[0.96] shadow-e01 hover:shadow-e02',
    secondary: 'bg-cloud text-ink border border-stone hover:bg-fog active:scale-[0.96]',
    ghost: 'text-ink hover:bg-cloud active:bg-fog',
    danger: 'bg-danger text-snow hover:bg-red-600 active:scale-[0.96] shadow-e01',
  };

  // Size styles
  const sizeStyles = {
    small: 'h-8 px-12 text-small rounded-default',
    medium: 'h-10 px-16 text-body rounded-default',
    large: 'h-12 px-24 text-body rounded-default',
  };

  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
