import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Info } from 'lucide-react';

export interface InfoTooltipProps {
  content: React.ReactNode;
  ariaLabel: string;
  className?: string;
  tooltipClassName?: string;
}

const TOUCH_QUERY = '(hover: none), (pointer: coarse)';

const getIsTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (!window.matchMedia) return false;
  return window.matchMedia(TOUCH_QUERY).matches;
};

const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  ariaLabel,
  className = '',
  tooltipClassName = '',
}) => {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [isTouch, setIsTouch] = useState(getIsTouchDevice);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia(TOUCH_QUERY);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsTouch(event.matches);
    };

    setIsTouch(mql.matches);

    if (mql.addEventListener) {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    }

    mql.addListener(handleChange);
    return () => mql.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isTouch) {
      setIsOpen(false);
    }
  }, [isTouch]);

  useEffect(() => {
    if (!isTouch || !isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && wrapperRef.current && !wrapperRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTouch, isOpen]);

  const isTooltipVisibleOnTouch = isTouch && isOpen;

  const tooltipClasses = useMemo(() => {
    const base =
      'absolute left-0 top-full mt-8 max-w-[320px] bg-snow text-ink border border-stone rounded-default shadow-e02 p-12 text-small leading-snug z-50 transition-standard';
    const hidden = 'opacity-0 pointer-events-none -translate-y-2';
    const visible = 'opacity-100 pointer-events-auto translate-y-0';
    const visibleOnHover = 'group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0';

    return `${base} ${hidden} ${visibleOnHover} ${isTooltipVisibleOnTouch ? visible : ''} ${tooltipClassName}`.trim();
  }, [isTooltipVisibleOnTouch, tooltipClassName]);

  return (
    <span ref={wrapperRef} className={`relative inline-flex group ${className}`.trim()}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isTouch ? isOpen : undefined}
        onClick={() => {
          if (!isTouch) return;
          setIsOpen((prev) => !prev);
        }}
        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-default text-slate hover:text-ink hover:bg-fog transition-standard focus:outline-none focus:ring-2 focus:ring-action focus:ring-offset-2"
      >
        <Info size={16} strokeWidth={2} />
      </button>

      <div role="tooltip" data-open={isOpen ? 'true' : 'false'} className={tooltipClasses}>
        {content}
      </div>
    </span>
  );
};

export default InfoTooltip;

