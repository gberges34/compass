import React, { useEffect } from 'react';

type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerVariant?: 'default' | 'sky' | 'mint' | 'sun';
  size?: ModalSize;
}

const Modal: React.FC<ModalProps> = ({
  title,
  description,
  onClose,
  children,
  footer,
  headerVariant = 'default',
  size = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const widthStyles: Record<ModalSize, string> = {
    sm: 'max-w-lg',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
  };

  const headerBg =
    headerVariant === 'sky'
      ? 'bg-sky'
      : headerVariant === 'mint'
      ? 'bg-mint'
      : headerVariant === 'sun'
      ? 'bg-sun'
      : 'bg-cloud';

  return (
    <div
      className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-24 z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${widthStyles[size]} max-h-[90vh] overflow-y-auto bg-snow rounded-modal shadow-eglass border border-fog`}
      >
        <div className={`p-24 border-b border-fog ${headerBg}`}>
          <div className="flex items-start justify-between gap-16">
            <div>
              <h2 className="text-h2 text-ink">{title}</h2>
              {description && <p className="text-slate mt-4">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-default p-8 text-slate hover:text-ink hover:bg-cloud transition-standard"
              aria-label="Close modal"
            >
              <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-24">{children}</div>

        {footer && <div className="p-24 border-t border-fog bg-cloud">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;


