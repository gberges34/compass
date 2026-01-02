import React from 'react';
import Button from './Button';
import Modal from './Modal';

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
  const confirmButtonVariant = variant === 'danger' ? 'danger' : 'primary';
  const headerVariant = variant === 'warning' ? 'sun' : variant === 'danger' ? 'default' : 'sky';

  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="sm"
      headerVariant={headerVariant}
      footer={
        <div className="flex items-center justify-end gap-12">
          <Button variant="secondary" onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button variant={confirmButtonVariant} onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-body text-ink">{message}</p>
    </Modal>
  );
};

export default ConfirmationModal;

