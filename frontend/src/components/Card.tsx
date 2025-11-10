import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  elevation?: 'none' | 'low' | 'medium';
  noBorder?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'medium',
  elevation = 'medium',
  noBorder = false,
}) => {
  // Base styles
  const baseStyles = 'bg-cloud rounded-card';

  // Padding styles
  const paddingStyles = {
    none: '',
    small: 'p-12',
    medium: 'p-16',
    large: 'p-24',
  };

  // Elevation styles
  const elevationStyles = {
    none: '',
    low: 'shadow-e01',
    medium: 'shadow-e02',
  };

  // Border styles
  const borderStyles = noBorder ? '' : 'border border-fog';

  return (
    <div
      className={`${baseStyles} ${paddingStyles[padding]} ${elevationStyles[elevation]} ${borderStyles} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
