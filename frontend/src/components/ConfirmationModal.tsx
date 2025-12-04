import React from 'react';
import Button from './Button';

export type ConfirmationVariant = 'danger' | 'warning' | 'default';

export interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  isConfirming = false,
}) => {
  const variantStyles = {
    danger: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    default: 'bg-blue-50 border-blue-200',
  };

  const confirmButtonVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-lg max-w-md w-full shadow-lg">
        <div className={`p-6 border-b ${variantStyles[variant]}`}>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>

        <div className="p-6">
          <p className="text-gray-700">{message}</p>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <Button
            variant="ghost"
            size="medium"
            onClick={onCancel}
            disabled={isConfirming}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmButtonVariant}
            size="medium"
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

