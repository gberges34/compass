import React from 'react';

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative inline-flex items-center align-middle
        w-[44px] h-[24px] rounded-pill
        transition-all duration-standard
        focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${checked ? 'bg-mint' : 'bg-stone'}
      `}
      style={{
        transform: 'translateZ(0)',
      }}
    >
      {/* Knob */}
      <span
        className={`
          absolute top-[2px]
          w-[20px] h-[20px] rounded-pill
          bg-snow shadow-e01
          transition-all duration-standard
          ${checked ? 'left-[22px]' : 'left-[2px]'}
        `}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        }}
      />
    </button>
  );
};

export default ToggleSwitch;
