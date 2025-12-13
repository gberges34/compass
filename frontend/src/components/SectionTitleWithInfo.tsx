import React from 'react';
import InfoTooltip from './InfoTooltip';

interface SectionTitleWithInfoProps {
  title: string;
  tooltipAriaLabel: string;
  tooltipContent: React.ReactNode;
  className?: string;
}

const SectionTitleWithInfo: React.FC<SectionTitleWithInfoProps> = ({
  title,
  tooltipAriaLabel,
  tooltipContent,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-8 mb-16 ${className}`.trim()}>
      <InfoTooltip ariaLabel={tooltipAriaLabel} content={tooltipContent} />
      <h3 className="text-h3 text-ink">{title}</h3>
    </div>
  );
};

export default SectionTitleWithInfo;


