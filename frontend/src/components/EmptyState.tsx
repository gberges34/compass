import React from 'react';

type EmptyStateVariant = 'neutral' | 'warning';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: EmptyStateVariant;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  variant = 'neutral',
  className = '',
}) => {
  const variantStyles =
    variant === 'warning'
      ? 'bg-sun border border-sun'
      : 'bg-cloud border border-fog';

  const titleColor = variant === 'warning' ? 'text-amber-900' : 'text-ink';
  const descriptionColor = variant === 'warning' ? 'text-amber-800' : 'text-slate';

  return (
    <div className={`rounded-card shadow-e02 ${variantStyles} ${className}`}>
      <div className="p-24 text-center">
        {icon && <div className="mx-auto mb-16 text-slate">{icon}</div>}
        <h3 className={`text-h3 ${titleColor}`}>{title}</h3>
        {description && <p className={`mt-8 ${descriptionColor}`}>{description}</p>}
        {action && <div className="mt-16 flex justify-center">{action}</div>}
      </div>
    </div>
  );
};

export default EmptyState;


