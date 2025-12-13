import React from 'react';

export type TabsVariant = 'underline' | 'pills';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  items: Array<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  variant?: TabsVariant;
  className?: string;
  buttonClassName?: string;
  ariaLabel?: string;
}

const Tabs = <T extends string>({
  items,
  value,
  onChange,
  variant = 'underline',
  className = '',
  buttonClassName = '',
  ariaLabel = 'Tabs',
}: TabsProps<T>) => {
  if (variant === 'pills') {
    return (
      <div className={`flex items-center gap-8 flex-wrap ${className}`} role="tablist" aria-label={ariaLabel}>
        {items.map((item) => {
          const isActive = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={item.disabled}
              onClick={() => onChange(item.id)}
              className={`px-16 py-8 rounded-default font-medium transition-standard ${
                isActive
                  ? 'bg-action text-snow shadow-e02'
                  : 'bg-snow text-ink border border-stone hover:bg-fog hover:shadow-e01'
              } disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    );
  }

  // underline
  return (
    <div className={`flex gap-4 border-b border-fog ${className}`} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={`px-16 py-8 font-medium text-body transition-standard border-b-2 ${
              isActive ? 'border-action text-action' : 'border-transparent text-slate hover:text-ink'
            } disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;


