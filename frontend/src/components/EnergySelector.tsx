import React from 'react';
import type { Energy } from '../types';
import { energyColors } from '../lib/designTokens';

export interface EnergySelectorProps {
  value: Energy;
  onChange: (value: Energy) => void;
  disabled?: boolean;
  className?: string;
}

const EnergySelector: React.FC<EnergySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
}) => {
  const options: Energy[] = ['HIGH', 'MEDIUM', 'LOW'];

  return (
    <div className={`flex flex-wrap gap-8 ${className}`} role="radiogroup" aria-label="Energy">
      {options.map((opt) => {
        const isActive = opt === value;
        const styles = energyColors[opt];
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`inline-flex items-center gap-8 px-12 py-8 rounded-pill border transition-standard ${
              isActive
                ? `${styles.bg} ${styles.border} ${styles.text} shadow-e01`
                : 'bg-snow border-stone text-slate hover:bg-cloud'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span className="text-small font-medium">{styles.icon}</span>
            <span className="text-small font-medium">{opt}</span>
          </button>
        );
      })}
    </div>
  );
};

export default EnergySelector;


