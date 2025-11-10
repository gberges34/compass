import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  // Base input styles
  const baseStyles = 'h-10 px-12 text-body bg-snow border rounded-default transition-all duration-micro';

  // Border styles based on state
  const borderStyles = error
    ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
    : 'border-stone focus:border-action focus:ring-2 focus:ring-action/20';

  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';

  // Disabled styles
  const disabledStyles = 'disabled:bg-fog disabled:text-slate disabled:cursor-not-allowed';

  // Placeholder styles
  const placeholderStyles = 'placeholder:text-slate/70';

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-small font-medium text-ink mb-4"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={`${baseStyles} ${borderStyles} ${widthStyles} ${disabledStyles} ${placeholderStyles} ${className}`}
        {...props}
      />

      {error && (
        <p className="mt-4 text-small text-danger">
          {error}
        </p>
      )}

      {helperText && !error && (
        <p className="mt-4 text-small text-slate">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
