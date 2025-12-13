import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  options: SelectOption[];
  placeholder?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  fullWidth = false,
  className = '',
  id,
  options,
  placeholder,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  // Per CompassVisualDesignGuidelines.md:
  // - Input/Select height: 40px
  // - bg Snow, border Stone -> Action on focus
  // - radius 12px
  const baseStyles =
    'h-10 px-12 text-body bg-snow border rounded-default transition-all duration-micro';

  const borderStyles = error
    ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20'
    : 'border-stone focus:border-action focus:ring-2 focus:ring-action/20';

  const widthStyles = fullWidth ? 'w-full' : '';
  const disabledStyles = 'disabled:bg-fog disabled:text-slate disabled:cursor-not-allowed';

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label htmlFor={selectId} className="block text-small font-medium text-ink mb-4">
          {label}
        </label>
      )}

      <select
        id={selectId}
        className={`${baseStyles} ${borderStyles} ${widthStyles} ${disabledStyles} ${className}`}
        {...props}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}

        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && <p className="mt-4 text-small text-danger">{error}</p>}

      {helperText && !error && <p className="mt-4 text-small text-slate">{helperText}</p>}
    </div>
  );
};

export default Select;


